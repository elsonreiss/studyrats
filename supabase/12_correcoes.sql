-- ============================================================
-- StudyRats — Migração 12: correções
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 11.
-- ============================================================

-- ---------- 1. a foto obrigatória estava travando a limpeza ----------
-- A restrição valia também no UPDATE. Quando a limpeza automática
-- zerava a foto de um check-in com mais de 60 dias, o banco recusava
-- a alteração — e o storage nunca era liberado, em silêncio.
-- A regra passa a valer só na criação, que é onde ela faz sentido.

alter table public.study_sessions
  drop constraint if exists study_sessions_foto_obrigatoria;

create or replace function public.require_photo_on_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.photo_path is null and new.photo_url is null then
    raise exception 'O check-in precisa de uma foto.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_require_photo on public.study_sessions;
create trigger trg_require_photo
  before insert on public.study_sessions
  for each row execute function public.require_photo_on_insert();

-- ---------- 2. diagnóstico dos meus dias ----------
-- Mostra exatamente o que o banco enxerga: quais dias você tem
-- check-in, quantos são, e o que a sequência está calculando.
create or replace function public.debug_my_days()
returns table (
  hoje_brasilia date,
  dias_distintos bigint,
  primeiro_dia date,
  ultimo_dia date,
  sequencia_atual int,
  sequencia_recorde int,
  fez_checkin_hoje boolean,
  todos_os_dias date[]
) language sql security definer stable set search_path = public as $$
  select
    public.br_today(),
    (select count(distinct studied_at) from public.study_sessions where user_id = auth.uid()),
    (select min(studied_at) from public.study_sessions where user_id = auth.uid()),
    (select max(studied_at) from public.study_sessions where user_id = auth.uid()),
    coalesce((select s.current_streak from public.get_streaks() s where s.user_id = auth.uid()), 0),
    coalesce((select s.longest_streak from public.get_streaks() s where s.user_id = auth.uid()), 0),
    exists (select 1 from public.study_sessions where user_id = auth.uid() and studied_at = public.br_today()),
    (select array_agg(d order by d)
       from (select distinct studied_at as d
               from public.study_sessions where user_id = auth.uid()) x);
$$;
