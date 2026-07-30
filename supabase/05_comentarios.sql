-- ============================================================
-- StudyRats — Migração 05: comentários nos check-ins
-- Rode no SQL Editor do Supabase, depois das migrações 02, 03 e 04.
--
-- Regra: você só comenta (e só lê comentários) em check-ins de gente
-- com quem você divide pelo menos um desafio. Fora do grupo, ninguém vê.
-- ============================================================

drop function if exists public.get_feed(uuid, int);

-- ---------- helper: as duas pessoas dividem algum desafio? ----------
create or replace function public.shares_group(p_a uuid, p_b uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select
    p_a is not null and p_b is not null and (
      p_a = p_b
      or exists (
        select 1
        from public.group_members a
        join public.group_members b on b.group_id = a.group_id
        where a.user_id = p_a and b.user_id = p_b
      )
    );
$$;

-- ---------- tabela ----------
create table if not exists public.checkin_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.study_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 800),
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_session
  on public.checkin_comments (session_id, created_at);

alter table public.checkin_comments enable row level security;

drop policy if exists "Lê comentários de quem divide desafio" on public.checkin_comments;
drop policy if exists "Comenta em check-in de quem divide desafio" on public.checkin_comments;
drop policy if exists "Apaga o próprio comentário" on public.checkin_comments;

create policy "Lê comentários de quem divide desafio"
  on public.checkin_comments for select to authenticated
  using (
    public.shares_group(
      auth.uid(),
      (select s.user_id from public.study_sessions s where s.id = session_id)
    )
  );

create policy "Comenta em check-in de quem divide desafio"
  on public.checkin_comments for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.shares_group(
      auth.uid(),
      (select s.user_id from public.study_sessions s where s.id = session_id)
    )
  );

-- o autor do comentário ou o dono do check-in podem apagar
create policy "Apaga o próprio comentário"
  on public.checkin_comments for delete to authenticated
  using (
    auth.uid() = user_id
    or auth.uid() = (select s.user_id from public.study_sessions s where s.id = session_id)
  );

-- tempo real
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'checkin_comments'
  ) then
    alter publication supabase_realtime add table public.checkin_comments;
  end if;
end
$$;

-- ---------- listar comentários com autor ----------
create or replace function public.get_comments(p_session_id uuid)
returns table (
  id uuid,
  user_id uuid,
  name text,
  avatar_url text,
  body text,
  created_at timestamptz,
  can_delete boolean
) language sql security definer set search_path = public as $$
  select
    c.id, c.user_id, p.name, p.avatar_url, c.body, c.created_at,
    (c.user_id = auth.uid()
     or auth.uid() = (select s.user_id from public.study_sessions s where s.id = c.session_id))
  from public.checkin_comments c
  join public.profiles p on p.id = c.user_id
  where c.session_id = p_session_id
    and public.shares_group(
      auth.uid(),
      (select s.user_id from public.study_sessions s where s.id = p_session_id)
    )
  order by c.created_at asc;
$$;

-- ---------- feed com contagem de comentários ----------
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
  group_name text,
  comment_count bigint
) language sql security definer set search_path = public as $$
  select
    s.id, s.user_id, p.name, p.avatar_url,
    coalesce(s.title, s.subject), s.subject, s.notes, s.minutes,
    s.photo_url, s.studied_at, s.created_at,
    s.group_id,
    case when s.group_id is not null and public.is_member(s.group_id, auth.uid())
         then (select g.name from public.groups g where g.id = s.group_id)
    end,
    (select count(*) from public.checkin_comments c where c.session_id = s.id)::bigint
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

-- ---------- posso comentar neste check-in? ----------
create or replace function public.can_comment(p_session_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select public.shares_group(
    auth.uid(),
    (select s.user_id from public.study_sessions s where s.id = p_session_id)
  );
$$;
