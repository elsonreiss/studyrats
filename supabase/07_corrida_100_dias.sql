-- ============================================================
-- StudyRats — Migração 07: corrida dos 100 dias + fuso de Brasília
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 06.
--
-- Regras da corrida:
--  * meta de 100 dias
--  * só o DIA conta; a duração do check-in é ignorada
--  * vários check-ins no mesmo dia contam como 1
--  * o dia é fechado pelo horário de Brasília (America/Sao_Paulo)
-- ============================================================

-- ---------- 1. hoje no fuso de Brasília ----------
create or replace function public.br_today()
returns date
language sql stable as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

-- o padrão da coluna passa a usar o fuso de Brasília, não o UTC do servidor
alter table public.study_sessions
  alter column studied_at set default (now() at time zone 'America/Sao_Paulo')::date;

-- ---------- 2. corrida ----------
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
  finished boolean
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
  )
  select
    b.id,
    b.name,
    b.avatar_url,
    least(b.raw_days, p_goal)::bigint,
    p_goal,
    round(least(b.raw_days::numeric / greatest(p_goal, 1), 1) * 100, 1),
    coalesce(b.today, false),
    b.last_day,
    b.raw_days >= p_goal
  from base b
  where b.raw_days > 0
  order by 4 desc, b.last_day desc, b.name asc;
$$;

-- ---------- 3. resumo da comunidade ----------
create or replace function public.get_race_summary(p_goal int default 100)
returns table (
  participants bigint,
  total_days bigint,
  avg_pct numeric,
  finished bigint,
  active_today bigint
) language sql security definer set search_path = public as $$
  with r as (select * from public.get_race(p_goal))
  select
    count(*)::bigint,
    coalesce(sum(days), 0)::bigint,
    coalesce(round(avg(pct), 1), 0),
    count(*) filter (where finished)::bigint,
    count(*) filter (where checked_today)::bigint
  from r;
$$;
