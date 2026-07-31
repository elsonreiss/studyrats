-- ============================================================
-- StudyRats — Migração 10: integridade do check-in
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 09.
--
-- Dois furos que só existiam porque a regra vivia no front-end:
--
--  1. A data do check-in vinha do cliente. Qualquer pessoa com o
--     console aberto podia inserir 100 check-ins com datas passadas
--     e terminar a corrida dos 100 dias em um minuto.
--
--  2. A foto era "obrigatória" apenas no formulário. Pela API dava
--     para registrar check-in sem foto nenhuma.
-- ============================================================

-- ---------- 1. a data é sempre hoje, em Brasília ----------
create or replace function public.force_checkin_today()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- ignora o que o cliente mandar
  new.studied_at := public.br_today();
  return new;
end;
$$;

drop trigger if exists trg_checkin_today on public.study_sessions;
create trigger trg_checkin_today
  before insert on public.study_sessions
  for each row execute function public.force_checkin_today();

-- a data também não pode ser alterada depois
create or replace function public.keep_checkin_date()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.studied_at := old.studied_at;
  new.user_id := old.user_id;
  return new;
end;
$$;

drop trigger if exists trg_keep_checkin_date on public.study_sessions;
create trigger trg_keep_checkin_date
  before update on public.study_sessions
  for each row execute function public.keep_checkin_date();

-- ---------- 2. foto obrigatória, valendo no banco ----------
-- registros antigos ficam de fora da regra (NOT VALID),
-- mas todo check-in novo precisa de imagem.
alter table public.study_sessions
  drop constraint if exists study_sessions_foto_obrigatoria;

alter table public.study_sessions
  add constraint study_sessions_foto_obrigatoria
  check (photo_path is not null or photo_url is not null)
  not valid;

-- ---------- 3. teto de check-ins por dia ----------
-- Evita alguém entupir o feed (e o storage) com centenas de fotos.
create or replace function public.limit_checkins_per_day()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    select count(*) from public.study_sessions
    where user_id = new.user_id and studied_at = public.br_today()
  ) >= 20 then
    raise exception 'Limite de 20 check-ins por dia atingido.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limit_checkins on public.study_sessions;
create trigger trg_limit_checkins
  before insert on public.study_sessions
  for each row execute function public.limit_checkins_per_day();

-- ---------- 4. teto de comentários, mesmo motivo ----------
create or replace function public.limit_comments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (
    select count(*) from public.checkin_comments
    where user_id = new.user_id and created_at > now() - interval '60 seconds'
  ) >= 15 then
    raise exception 'Muitos comentários em pouco tempo. Espere um instante.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_limit_comments on public.checkin_comments;
create trigger trg_limit_comments
  before insert on public.checkin_comments
  for each row execute function public.limit_comments();

-- ---------- 5. índices que faltavam ----------
-- get_streaks() varre a tabela inteira; este índice deixa o
-- agrupamento por (usuário, dia) muito mais barato.
create index if not exists idx_sessions_streak
  on public.study_sessions (user_id, studied_at);

create index if not exists idx_comments_user_time
  on public.checkin_comments (user_id, created_at desc);

create index if not exists idx_msgs_user_time
  on public.group_messages (user_id, created_at desc);
