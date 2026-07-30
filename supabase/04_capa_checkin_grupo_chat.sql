-- ============================================================
-- StudyRats — Migração 04
-- Rode no SQL Editor do Supabase, depois das migrações 02 e 03.
--
-- O que entra:
--  * foto de capa nos desafios
--  * check-in vinculado a um desafio (conta pro grupo e aparece no feed geral)
--  * bate-papo privado por desafio, em tempo real
-- ============================================================

-- ---------- 0. remove funções que mudam de assinatura ----------
drop function if exists public.get_feed(uuid, int);
drop function if exists public.get_group_preview(uuid);

-- ---------- 1. capa do desafio ----------
alter table public.groups
  add column if not exists photo_url text;

-- o dono precisa poder atualizar o grupo (capa, nome, datas)
drop policy if exists "Dono edita o grupo" on public.groups;
create policy "Dono edita o grupo"
  on public.groups for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- bucket das capas
insert into storage.buckets (id, name, public)
values ('groups', 'groups', true)
on conflict (id) do nothing;

drop policy if exists "Capas de desafio são públicas" on storage.objects;
drop policy if exists "Usuário envia capa de desafio" on storage.objects;
drop policy if exists "Usuário atualiza capa de desafio" on storage.objects;

create policy "Capas de desafio são públicas"
  on storage.objects for select using (bucket_id = 'groups');

create policy "Usuário envia capa de desafio"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'groups' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário atualiza capa de desafio"
  on storage.objects for update to authenticated
  using (bucket_id = 'groups' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 2. check-in vinculado a um desafio ----------
alter table public.study_sessions
  add column if not exists group_id uuid references public.groups (id) on delete set null;

create index if not exists idx_sessions_group on public.study_sessions (group_id);

-- ---------- 3. bate-papo do desafio ----------
create table if not exists public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists idx_msgs_group on public.group_messages (group_id, created_at desc);

alter table public.group_messages enable row level security;

drop policy if exists "Só membros leem o bate-papo" on public.group_messages;
drop policy if exists "Só membros escrevem no bate-papo" on public.group_messages;
drop policy if exists "Autor apaga a própria mensagem" on public.group_messages;

create policy "Só membros leem o bate-papo"
  on public.group_messages for select to authenticated
  using (public.is_member(group_id, auth.uid()));

create policy "Só membros escrevem no bate-papo"
  on public.group_messages for insert to authenticated
  with check (auth.uid() = user_id and public.is_member(group_id, auth.uid()));

create policy "Autor apaga a própria mensagem"
  on public.group_messages for delete to authenticated
  using (auth.uid() = user_id);

-- tempo real (idempotente: não quebra se rodar de novo)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end
$$;

-- ---------- 4. prévia do convite com capa ----------
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

-- ---------- 5. feed com o desafio de origem ----------
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
    -- só revela o nome do desafio para quem é membro dele
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

-- ---------- 6. contagem de mensagens não lidas (opcional, para badge) ----------
create or replace function public.get_message_count(p_group_id uuid)
returns bigint
language sql security definer stable set search_path = public as $$
  select case
    when public.is_member(p_group_id, auth.uid())
    then (select count(*) from public.group_messages where group_id = p_group_id)
    else 0
  end::bigint;
$$;
