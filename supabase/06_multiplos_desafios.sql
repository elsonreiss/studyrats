-- ============================================================
-- StudyRats — Migração 06: um check-in em vários desafios
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 05.
-- ============================================================

drop function if exists public.get_feed(uuid, int);

-- ---------- helper: dono do check-in ----------
create or replace function public.session_owner(p_session_id uuid)
returns uuid
language sql security definer stable set search_path = public as $$
  select user_id from public.study_sessions where id = p_session_id;
$$;

-- ---------- vínculo check-in <-> desafios ----------
create table if not exists public.checkin_groups (
  session_id uuid not null references public.study_sessions (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  primary key (session_id, group_id)
);

create index if not exists idx_checkin_groups_group
  on public.checkin_groups (group_id);

-- traz os vínculos que já existiam na coluna antiga
insert into public.checkin_groups (session_id, group_id)
select id, group_id from public.study_sessions where group_id is not null
on conflict do nothing;

alter table public.checkin_groups enable row level security;

drop policy if exists "Vê vínculo de desafio que participa" on public.checkin_groups;
drop policy if exists "Marca o próprio check-in em desafios" on public.checkin_groups;
drop policy if exists "Desmarca o próprio check-in" on public.checkin_groups;

create policy "Vê vínculo de desafio que participa"
  on public.checkin_groups for select to authenticated
  using (
    public.is_member(group_id, auth.uid())
    or public.session_owner(session_id) = auth.uid()
  );

create policy "Marca o próprio check-in em desafios"
  on public.checkin_groups for insert to authenticated
  with check (
    public.session_owner(session_id) = auth.uid()
    and public.is_member(group_id, auth.uid())
  );

create policy "Desmarca o próprio check-in"
  on public.checkin_groups for delete to authenticated
  using (public.session_owner(session_id) = auth.uid());

-- ---------- feed com a lista de desafios ----------
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
  group_ids uuid[],
  group_names text[],
  comment_count bigint
) language sql security definer set search_path = public as $$
  select
    s.id, s.user_id, p.name, p.avatar_url,
    coalesce(s.title, s.subject), s.subject, s.notes, s.minutes,
    s.photo_url, s.studied_at, s.created_at,
    -- só mostra os desafios que quem está olhando também participa
    coalesce((
      select array_agg(cg.group_id order by g.name)
      from public.checkin_groups cg
      join public.groups g on g.id = cg.group_id
      where cg.session_id = s.id and public.is_member(cg.group_id, auth.uid())
    ), '{}'::uuid[]),
    coalesce((
      select array_agg(g.name order by g.name)
      from public.checkin_groups cg
      join public.groups g on g.id = cg.group_id
      where cg.session_id = s.id and public.is_member(cg.group_id, auth.uid())
    ), '{}'::text[]),
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

-- ---------- desafios de um check-in específico ----------
create or replace function public.get_checkin_groups(p_session_id uuid)
returns table (id uuid, name text)
language sql security definer stable set search_path = public as $$
  select g.id, g.name
  from public.checkin_groups cg
  join public.groups g on g.id = cg.group_id
  where cg.session_id = p_session_id
    and (public.is_member(cg.group_id, auth.uid())
         or public.session_owner(p_session_id) = auth.uid())
  order by g.name;
$$;
