-- ============================================================
-- StudyRats — Migração 03: check-ins com foto + desafios com prazo
-- Rode no SQL Editor do Supabase, depois de schema.sql e 02_grupos_privados.sql
--
-- O que muda:
--  * cada sessão de estudo vira um CHECK-IN com foto obrigatória
--  * grupos ganham data de início/fim (viram desafios)
--  * ranking passa a ser por DIAS ATIVOS (empate: minutos)
--  * novas funções de estatísticas de grupo e feed
-- ============================================================

-- ---------- 0. remove versões antigas das funções ----------
-- (o Postgres não deixa trocar as colunas de retorno com CREATE OR REPLACE)
drop function if exists public.get_leaderboard(date, uuid);
drop function if exists public.get_group_preview(uuid);
drop function if exists public.get_group_stats(uuid);
drop function if exists public.get_feed(uuid, int);

-- ---------- 1. check-ins com foto ----------
alter table public.study_sessions
  add column if not exists photo_url text,
  add column if not exists title text;

-- backfill para registros antigos (sem foto) e obrigatoriedade dali em diante
update public.study_sessions set title = coalesce(title, subject) where title is null;

alter table public.study_sessions
  alter column minutes drop not null;

-- bucket público das fotos de check-in
insert into storage.buckets (id, name, public)
values ('checkins', 'checkins', true)
on conflict (id) do nothing;

drop policy if exists "Fotos de check-in são públicas" on storage.objects;
drop policy if exists "Usuário envia a própria foto de check-in" on storage.objects;
drop policy if exists "Usuário apaga a própria foto de check-in" on storage.objects;

create policy "Fotos de check-in são públicas"
  on storage.objects for select using (bucket_id = 'checkins');

create policy "Usuário envia a própria foto de check-in"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Usuário apaga a própria foto de check-in"
  on storage.objects for delete to authenticated
  using (bucket_id = 'checkins' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 2. grupos viram desafios ----------
alter table public.groups
  add column if not exists starts_on date not null default current_date,
  add column if not exists ends_on date;

-- ---------- 3. ranking por dias ativos ----------
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

-- ---------- 4. estatísticas do grupo ----------
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
    round(
      (select count(*) from s)::numeric
      / greatest((select count(distinct studied_at) from s), 1),
      2
    ),
    (select coalesce(sum(minutes), 0) from s)::bigint,
    (select count(*) from public.group_members where group_id = p_group_id)::bigint;
$$;

-- ---------- 5. feed de check-ins ----------
-- p_group_id nulo = feed da comunidade inteira
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
  created_at timestamptz
) language sql security definer set search_path = public as $$
  select
    s.id, s.user_id, p.name, p.avatar_url,
    coalesce(s.title, s.subject), s.subject, s.notes, s.minutes,
    s.photo_url, s.studied_at, s.created_at
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

-- ---------- 6. prévia do grupo com prazo ----------
create or replace function public.get_group_preview(p_group_id uuid)
returns table (
  id uuid, name text, description text,
  member_count bigint, is_member boolean,
  starts_on date, ends_on date
) language sql security definer stable set search_path = public as $$
  select
    g.id, g.name, g.description,
    (select count(*) from public.group_members m where m.group_id = g.id)::bigint,
    public.is_member(g.id, auth.uid()),
    g.starts_on, g.ends_on
  from public.groups g
  where g.id = p_group_id;
$$;
