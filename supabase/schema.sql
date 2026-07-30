-- ============================================================
-- StudyRats — Schema completo do Supabase
-- Projeto NOVO: cole este arquivo inteiro no SQL Editor e execute.
-- Projeto que já rodou uma versão anterior: rode as migrações
-- 02_grupos_privados.sql e 03_checkins_e_desafios.sql.
-- ============================================================

-- ---------- PERFIS ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Estudante',
  bio text default '',
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Perfis visíveis para todos os logados"
  on public.profiles for select to authenticated using (true);

create policy "Usuário edita o próprio perfil"
  on public.profiles for update to authenticated using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- CHECK-INS DE ESTUDO ----------
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text,
  subject text not null,
  minutes int check (minutes > 0 and minutes <= 1440),
  notes text default '',
  photo_url text,
  studied_at date not null default current_date,
  group_id uuid,
  created_at timestamptz not null default now()
);

create index idx_sessions_user on public.study_sessions (user_id);
create index idx_sessions_date on public.study_sessions (studied_at);
create index idx_sessions_group on public.study_sessions (group_id);

alter table public.study_sessions enable row level security;

create policy "Check-ins visíveis para todos os logados"
  on public.study_sessions for select to authenticated using (true);

create policy "Usuário registra os próprios check-ins"
  on public.study_sessions for insert to authenticated with check (auth.uid() = user_id);

create policy "Usuário apaga os próprios check-ins"
  on public.study_sessions for delete to authenticated using (auth.uid() = user_id);

-- ---------- DESAFIOS (GRUPOS PRIVADOS COM PRAZO) ----------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  photo_url text,
  invite_code text not null unique default upper(substr(md5(random()::text), 1, 6)),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null default current_date,
  ends_on date,
  created_at timestamptz not null default now()
);

alter table public.study_sessions
  add constraint study_sessions_group_fk
  foreign key (group_id) references public.groups (id) on delete set null;

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

-- helper com security definer: bypassa RLS e evita recursão nas policies
create or replace function public.is_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

create policy "Só membros veem o grupo"
  on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_member(id, auth.uid()));

create policy "Qualquer logado cria grupo"
  on public.groups for insert to authenticated with check (auth.uid() = owner_id);

create policy "Dono edita o grupo"
  on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Dono apaga o grupo"
  on public.groups for delete to authenticated using (auth.uid() = owner_id);

create policy "Só membros veem a lista"
  on public.group_members for select to authenticated
  using (public.is_member(group_id, auth.uid()));

create policy "Dono entra no próprio grupo"
  on public.group_members for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

create policy "Usuário sai do grupo"
  on public.group_members for delete to authenticated using (auth.uid() = user_id);

-- ---------- BATE-PAPO DO DESAFIO ----------
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index idx_msgs_group on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

create policy "Só membros leem o bate-papo"
  on public.group_messages for select to authenticated
  using (public.is_member(group_id, auth.uid()));

create policy "Só membros escrevem no bate-papo"
  on public.group_messages for insert to authenticated
  with check (auth.uid() = user_id and public.is_member(group_id, auth.uid()));

create policy "Autor apaga a própria mensagem"
  on public.group_messages for delete to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end
$$;

-- prévia para quem chegou pelo link de convite
create or replace function public.get_group_preview(p_group_id uuid)
returns table (
  id uuid, name text, description text, photo_url text,
  member_count bigint, is_member boolean,
  starts_on date, ends_on date
) language sql security definer stable set search_path = public as $$
  select
    g.id, g.name, g.description, g.photo_url,
    (select count(*) from public.group_members m where m.group_id = g.id)::bigint,
    public.is_member(g.id, auth.uid()),
    g.starts_on, g.ends_on
  from public.groups g
  where g.id = p_group_id;
$$;

-- entrar por link (id) ou por código de convite
create or replace function public.join_group(p_group_id uuid default null, p_code text default null)
returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare
  g public.groups%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;

  if p_group_id is not null then
    select * into g from public.groups where public.groups.id = p_group_id;
  elsif p_code is not null then
    select * into g from public.groups where invite_code = upper(trim(p_code));
  end if;

  if g.id is null then
    raise exception 'Grupo não encontrado';
  end if;

  insert into public.group_members (group_id, user_id)
  values (g.id, auth.uid())
  on conflict do nothing;

  return query select g.id, g.name;
end;
$$;

-- ---------- RANKING (por dias ativos, desempate por minutos) ----------
create or replace function public.get_leaderboard(p_since date default null, p_group_id uuid default null)
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  active_days bigint,
  checkin_count bigint,
  total_minutes bigint
) language sql security definer set search_path = public as $$
  with b as (
    select
      greatest(p_since, (select starts_on from public.groups where id = p_group_id)) as ini,
      (select ends_on from public.groups where id = p_group_id) as fim
  )
  select
    p.id,
    p.name,
    p.avatar_url,
    count(distinct s.studied_at)::bigint as active_days,
    count(s.id)::bigint as checkin_count,
    coalesce(sum(s.minutes), 0)::bigint as total_minutes
  from public.profiles p
  left join public.study_sessions s
    on s.user_id = p.id
    and ((select ini from b) is null or s.studied_at >= (select ini from b))
    and ((select fim from b) is null or s.studied_at <= (select fim from b))
  where
    case
      when p_group_id is null then true
      else public.is_member(p_group_id, auth.uid())
           and p.id in (select gm.user_id from public.group_members gm where gm.group_id = p_group_id)
    end
  group by p.id
  having count(s.id) > 0 or p_group_id is not null
  order by active_days desc, total_minutes desc, checkin_count desc;
$$;

-- ---------- ESTATÍSTICAS DO GRUPO ----------
create or replace function public.get_group_stats(p_group_id uuid)
returns table (
  total_checkins bigint,
  active_days bigint,
  avg_per_day numeric,
  total_minutes bigint,
  member_count bigint
) language sql security definer set search_path = public as $$
  with g as (select * from public.groups where id = p_group_id),
  s as (
    select ss.*
    from public.study_sessions ss
    join public.group_members gm on gm.user_id = ss.user_id and gm.group_id = p_group_id
    where ss.studied_at >= (select starts_on from g)
      and ((select ends_on from g) is null or ss.studied_at <= (select ends_on from g))
      and public.is_member(p_group_id, auth.uid())
  )
  select
    (select count(*) from s)::bigint,
    (select count(distinct studied_at) from s)::bigint,
    round((select count(*) from s)::numeric / greatest((select count(distinct studied_at) from s), 1), 2),
    (select coalesce(sum(minutes), 0) from s)::bigint,
    (select count(*) from public.group_members where group_id = p_group_id)::bigint;
$$;

-- ---------- FEED DE CHECK-INS ----------
create or replace function public.get_feed(p_group_id uuid default null, p_limit int default 30)
returns table (
  id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  title text,
  subject text,
  notes text,
  minutes int,
  photo_url text,
  studied_at date,
  created_at timestamptz,
  group_id uuid,
  group_name text
) language sql security definer set search_path = public as $$
  select
    s.id, s.user_id, p.name, p.avatar_url,
    coalesce(s.title, s.subject), s.subject, s.notes, s.minutes,
    s.photo_url, s.studied_at, s.created_at,
    s.group_id,
    case when s.group_id is not null and public.is_member(s.group_id, auth.uid())
         then (select g.name from public.groups g where g.id = s.group_id)
    end
  from public.study_sessions s
  join public.profiles p on p.id = s.user_id
  where
    case
      when p_group_id is null then true
      else public.is_member(p_group_id, auth.uid())
           and s.user_id in (select gm.user_id from public.group_members gm where gm.group_id = p_group_id)
    end
  order by s.studied_at desc, s.created_at desc
  limit least(p_limit, 100);
$$;

-- ---------- STORAGE ----------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('checkins', 'checkins', true),
  ('groups', 'groups', true)
on conflict (id) do nothing;

create policy "Avatares são públicos"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "Usuário envia o próprio avatar"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário atualiza o próprio avatar"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Fotos de check-in são públicas"
  on storage.objects for select using (bucket_id = 'checkins');

create policy "Usuário envia a própria foto de check-in"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário apaga a própria foto de check-in"
  on storage.objects for delete to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Capas de desafio são públicas"
  on storage.objects for select using (bucket_id = 'groups');

create policy "Usuário envia capa de desafio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'groups' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário atualiza capa de desafio"
  on storage.objects for update to authenticated
  using (bucket_id = 'groups' and (storage.foldername(name))[1] = auth.uid()::text);
