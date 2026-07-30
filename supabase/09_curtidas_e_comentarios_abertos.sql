-- ============================================================
-- StudyRats — Migração 09
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 08.
--
-- Correção: curtidas e comentários estavam limitados a quem dividia um
-- desafio com o autor. Como o feed é da comunidade inteira, dava para VER
-- o check-in mas não para curtir — o botão simplesmente não respondia.
--
-- Regra nova: se você enxerga o check-in, pode curtir e comentar.
-- Os desafios continuam privados; isso não muda em nada.
-- ============================================================

-- ---------- curtidas ----------
drop policy if exists "Vê reações de quem divide desafio" on public.checkin_reactions;
drop policy if exists "Reage em check-in de quem divide desafio" on public.checkin_reactions;
drop policy if exists "Logado vê as reações" on public.checkin_reactions;
drop policy if exists "Logado reage" on public.checkin_reactions;

create policy "Logado vê as reações"
  on public.checkin_reactions for select to authenticated
  using (true);

create policy "Logado reage"
  on public.checkin_reactions for insert to authenticated
  with check (auth.uid() = user_id);

-- ---------- comentários ----------
drop policy if exists "Lê comentários de quem divide desafio" on public.checkin_comments;
drop policy if exists "Comenta em check-in de quem divide desafio" on public.checkin_comments;
drop policy if exists "Logado lê os comentários" on public.checkin_comments;
drop policy if exists "Logado comenta" on public.checkin_comments;

create policy "Logado lê os comentários"
  on public.checkin_comments for select to authenticated
  using (true);

create policy "Logado comenta"
  on public.checkin_comments for insert to authenticated
  with check (auth.uid() = user_id);

-- ---------- funções de leitura acompanham a regra nova ----------
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
  order by c.created_at asc;
$$;

create or replace function public.can_comment(p_session_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select auth.uid() is not null
     and exists (select 1 from public.study_sessions where id = p_session_id);
$$;
