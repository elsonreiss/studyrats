-- ============================================================
-- StudyRats — Migração 08: pacote de melhorias
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 07.
--
-- Entra aqui:
--  * sequência de dias seguidos (streak)
--  * reações (curtir) nos check-ins
--  * edição de check-in
--  * miniaturas e fotos privadas com URL assinada
--  * listagem de membros do desafio
--  * limite de mensagens no bate-papo
--  * paginação no feed
-- ============================================================

drop function if exists public.get_feed(uuid, int);
drop function if exists public.get_race(int);
drop function if exists public.get_race_summary(int);

-- ============================================================
-- 1. FOTOS: caminho separado da URL + miniatura
-- ============================================================
alter table public.study_sessions
  add column if not exists photo_path text,
  add column if not exists thumb_path text;

-- extrai o caminho das URLs públicas que já existem
update public.study_sessions
set photo_path = regexp_replace(split_part(photo_url, '/checkins/', 2), '\?.*$', '')
where photo_path is null
  and photo_url is not null
  and photo_url like '%/checkins/%';

-- o bucket dos check-ins passa a ser privado: só quem está logado consegue
-- gerar uma URL assinada, e ela expira.
update storage.buckets set public = false where id = 'checkins';

drop policy if exists "Fotos de check-in são públicas" on storage.objects;
drop policy if exists "Logado lê fotos de check-in" on storage.objects;

create policy "Logado lê fotos de check-in"
  on storage.objects for select to authenticated
  using (bucket_id = 'checkins');

-- ============================================================
-- 2. EDIÇÃO DE CHECK-IN
-- ============================================================
drop policy if exists "Usuário edita os próprios check-ins" on public.study_sessions;

create policy "Usuário edita os próprios check-ins"
  on public.study_sessions for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. REAÇÕES
-- ============================================================
create table if not exists public.checkin_reactions (
  session_id uuid not null references public.study_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, user_id)
);

create index if not exists idx_reactions_session on public.checkin_reactions (session_id);

alter table public.checkin_reactions enable row level security;

drop policy if exists "Vê reações de quem divide desafio" on public.checkin_reactions;
drop policy if exists "Reage em check-in de quem divide desafio" on public.checkin_reactions;
drop policy if exists "Remove a própria reação" on public.checkin_reactions;

create policy "Vê reações de quem divide desafio"
  on public.checkin_reactions for select to authenticated
  using (public.shares_group(auth.uid(), public.session_owner(session_id)));

create policy "Reage em check-in de quem divide desafio"
  on public.checkin_reactions for insert to authenticated
  with check (
    auth.uid() = user_id
    and public.shares_group(auth.uid(), public.session_owner(session_id))
  );

create policy "Remove a própria reação"
  on public.checkin_reactions for delete to authenticated
  using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'checkin_reactions'
  ) then
    alter publication supabase_realtime add table public.checkin_reactions;
  end if;
end
$$;

-- ============================================================
-- 4. SEQUÊNCIA DE DIAS SEGUIDOS
-- ============================================================
-- Uma sequência continua viva se o último dia foi hoje ou ontem (Brasília).
create or replace function public.get_streaks()
returns table (user_id uuid, current_streak int, longest_streak int)
language sql security definer stable set search_path = public as $$
  with dias as (
    select distinct s.user_id, s.studied_at
    from public.study_sessions s
  ),
  ilhas as (
    select
      user_id,
      studied_at,
      studied_at - (row_number() over (partition by user_id order by studied_at))::int as ilha
    from dias
  ),
  blocos as (
    select user_id, ilha, count(*)::int as tamanho, max(studied_at) as fim
    from ilhas
    group by user_id, ilha
  )
  select
    user_id,
    coalesce(max(tamanho) filter (where fim >= public.br_today() - 1), 0),
    max(tamanho)
  from blocos
  group by user_id;
$$;

create or replace function public.get_my_streak()
returns table (current_streak int, longest_streak int, checked_today boolean)
language sql security definer stable set search_path = public as $$
  select
    coalesce((select s.current_streak from public.get_streaks() s where s.user_id = auth.uid()), 0),
    coalesce((select s.longest_streak from public.get_streaks() s where s.user_id = auth.uid()), 0),
    exists (
      select 1 from public.study_sessions
      where user_id = auth.uid() and studied_at = public.br_today()
    );
$$;

create or replace function public.get_user_streak(p_user_id uuid)
returns table (current_streak int, longest_streak int, checked_today boolean)
language sql security definer stable set search_path = public as $$
  select
    coalesce((select s.current_streak from public.get_streaks() s where s.user_id = p_user_id), 0),
    coalesce((select s.longest_streak from public.get_streaks() s where s.user_id = p_user_id), 0),
    exists (
      select 1 from public.study_sessions
      where user_id = p_user_id and studied_at = public.br_today()
    );
$$;

-- ============================================================
-- 5. CORRIDA COM SEQUÊNCIA
-- ============================================================
create or replace function public.get_race(p_goal int default 100)
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  days bigint,
  goal int,
  pct numeric,
  checked_today boolean,
  last_day date,
  finished boolean,
  current_streak int,
  longest_streak int
) language sql security definer set search_path = public as $$
  with base as (
    select
      p.id,
      p.name,
      p.avatar_url,
      count(distinct s.studied_at) as raw_days,
      max(s.studied_at) as last_day,
      bool_or(s.studied_at = public.br_today()) as today
    from public.profiles p
    join public.study_sessions s on s.user_id = p.id
    group by p.id
  ),
  st as (select * from public.get_streaks())
  select
    b.id, b.name, b.avatar_url,
    least(b.raw_days, p_goal)::bigint,
    p_goal,
    round(least(b.raw_days::numeric / greatest(p_goal, 1), 1) * 100, 1),
    coalesce(b.today, false),
    b.last_day,
    b.raw_days >= p_goal,
    coalesce(st.current_streak, 0),
    coalesce(st.longest_streak, 0)
  from base b
  left join st on st.user_id = b.id
  where b.raw_days > 0
  order by 4 desc, b.last_day desc, b.name asc;
$$;

create or replace function public.get_race_summary(p_goal int default 100)
returns table (
  participants bigint,
  total_days bigint,
  avg_pct numeric,
  finished bigint,
  active_today bigint,
  best_streak int
) language sql security definer set search_path = public as $$
  with r as (select * from public.get_race(p_goal))
  select
    count(*)::bigint,
    coalesce(sum(days), 0)::bigint,
    coalesce(round(avg(pct), 1), 0),
    count(*) filter (where finished)::bigint,
    count(*) filter (where checked_today)::bigint,
    coalesce(max(current_streak), 0)
  from r;
$$;

-- ============================================================
-- 6. FEED: miniatura, reações e paginação
-- ============================================================
create or replace function public.get_feed(
  p_group_id uuid default null,
  p_limit int default 24,
  p_offset int default 0
)
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
  photo_path text,
  thumb_path text,
  studied_at date,
  created_at timestamptz,
  group_ids uuid[],
  group_names text[],
  comment_count bigint,
  reaction_count bigint,
  reacted boolean
) language sql security definer set search_path = public as $$
  select
    s.id, s.user_id, p.name, p.avatar_url,
    coalesce(s.title, s.subject), s.subject, s.notes, s.minutes,
    s.photo_url, s.photo_path, s.thumb_path,
    s.studied_at, s.created_at,
    coalesce((
      select array_agg(cg.group_id order by g.name)
      from public.checkin_groups cg join public.groups g on g.id = cg.group_id
      where cg.session_id = s.id and public.is_member(cg.group_id, auth.uid())
    ), '{}'::uuid[]),
    coalesce((
      select array_agg(g.name order by g.name)
      from public.checkin_groups cg join public.groups g on g.id = cg.group_id
      where cg.session_id = s.id and public.is_member(cg.group_id, auth.uid())
    ), '{}'::text[]),
    (select count(*) from public.checkin_comments c where c.session_id = s.id)::bigint,
    (select count(*) from public.checkin_reactions r where r.session_id = s.id)::bigint,
    exists (select 1 from public.checkin_reactions r where r.session_id = s.id and r.user_id = auth.uid())
  from public.study_sessions s
  join public.profiles p on p.id = s.user_id
  where
    case
      when p_group_id is null then true
      else public.is_member(p_group_id, auth.uid())
           and s.user_id in (select gm.user_id from public.group_members gm where gm.group_id = p_group_id)
    end
  order by s.studied_at desc, s.created_at desc
  limit least(p_limit, 60)
  offset greatest(p_offset, 0);
$$;

-- check-ins de um perfil, já com reações e contagens
create or replace function public.get_user_checkins(
  p_user_id uuid,
  p_limit int default 60,
  p_offset int default 0
)
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
  photo_path text,
  thumb_path text,
  studied_at date,
  created_at timestamptz,
  group_ids uuid[],
  group_names text[],
  comment_count bigint,
  reaction_count bigint,
  reacted boolean
) language sql security definer set search_path = public as $$
  select
    s.id, s.user_id, p.name, p.avatar_url,
    coalesce(s.title, s.subject), s.subject, s.notes, s.minutes,
    s.photo_url, s.photo_path, s.thumb_path,
    s.studied_at, s.created_at,
    coalesce((
      select array_agg(cg.group_id order by g.name)
      from public.checkin_groups cg join public.groups g on g.id = cg.group_id
      where cg.session_id = s.id and public.is_member(cg.group_id, auth.uid())
    ), '{}'::uuid[]),
    coalesce((
      select array_agg(g.name order by g.name)
      from public.checkin_groups cg join public.groups g on g.id = cg.group_id
      where cg.session_id = s.id and public.is_member(cg.group_id, auth.uid())
    ), '{}'::text[]),
    (select count(*) from public.checkin_comments c where c.session_id = s.id)::bigint,
    (select count(*) from public.checkin_reactions r where r.session_id = s.id)::bigint,
    exists (select 1 from public.checkin_reactions r where r.session_id = s.id and r.user_id = auth.uid())
  from public.study_sessions s
  join public.profiles p on p.id = s.user_id
  where s.user_id = p_user_id
  order by s.studied_at desc, s.created_at desc
  limit least(p_limit, 200)
  offset greatest(p_offset, 0);
$$;

-- ============================================================
-- 7. MEMBROS DO DESAFIO
-- ============================================================
create or replace function public.get_group_members(p_group_id uuid)
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  bio text,
  joined_at timestamptz,
  is_owner boolean,
  active_days bigint,
  current_streak int
) language sql security definer set search_path = public as $$
  select
    gm.user_id, p.name, p.avatar_url, p.bio, gm.joined_at,
    (g.owner_id = gm.user_id),
    (select count(distinct s.studied_at)
       from public.study_sessions s
      where s.user_id = gm.user_id
        and s.studied_at >= g.starts_on
        and (g.ends_on is null or s.studied_at <= g.ends_on))::bigint,
    coalesce((select st.current_streak from public.get_streaks() st where st.user_id = gm.user_id), 0)
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  join public.groups g on g.id = gm.group_id
  where gm.group_id = p_group_id
    and public.is_member(p_group_id, auth.uid())
  order by 7 desc, p.name asc;
$$;

-- ============================================================
-- 8. LIMITE DE MENSAGENS NO BATE-PAPO
-- ============================================================
create or replace function public.chat_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    select count(*) from public.group_messages
    where user_id = new.user_id and created_at > now() - interval '20 seconds'
  ) >= 8 then
    raise exception 'Muitas mensagens em pouco tempo. Espere alguns segundos.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_chat_rate_limit on public.group_messages;
create trigger trg_chat_rate_limit
  before insert on public.group_messages
  for each row execute function public.chat_rate_limit();

-- ============================================================
-- 9. ÍNDICES DE APOIO
-- ============================================================
create index if not exists idx_sessions_user_day
  on public.study_sessions (user_id, studied_at desc);
