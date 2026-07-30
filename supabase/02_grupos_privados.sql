-- ============================================================
-- StudyRats — Migração 02: grupos privados
-- Rode este arquivo no SQL Editor do Supabase (depois do schema.sql).
--
-- Regra: um grupo só é visível para quem já é membro. Quem tiver o
-- LINK ou o CÓDIGO consegue ver uma prévia (nome, descrição, nº de
-- membros) e entrar. Ninguém mais enxerga o grupo nem seus membros.
-- ============================================================

-- ---------- helper (bypassa RLS, evita recursão nas policies) ----------
create or replace function public.is_member(p_group_id uuid, p_user_id uuid)
returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = p_user_id
  );
$$;

-- ---------- políticas de leitura restritas ----------
drop policy if exists "Grupos visíveis para todos os logados" on public.groups;
drop policy if exists "Membros visíveis para todos os logados" on public.group_members;
drop policy if exists "Usuário entra em grupo" on public.group_members;
drop policy if exists "Só membros veem o grupo" on public.groups;
drop policy if exists "Só membros veem a lista" on public.group_members;

create policy "Só membros veem o grupo"
  on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_member(id, auth.uid()));

create policy "Só membros veem a lista"
  on public.group_members for select to authenticated
  using (public.is_member(group_id, auth.uid()));

-- Entrar em grupo agora acontece só pela função join_group (abaixo),
-- que valida o link/código. Não existe mais INSERT direto pelo cliente,
-- exceto o do próprio dono ao criar o grupo.
create policy "Dono entra no próprio grupo"
  on public.group_members for insert to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );

-- ---------- prévia pública para quem tem o link ----------
create or replace function public.get_group_preview(p_group_id uuid)
returns table (id uuid, name text, description text, member_count bigint, is_member boolean)
language sql security definer stable set search_path = public as $$
  select
    g.id,
    g.name,
    g.description,
    (select count(*) from public.group_members m where m.group_id = g.id)::bigint,
    public.is_member(g.id, auth.uid())
  from public.groups g
  where g.id = p_group_id;
$$;

-- ---------- entrar por link (id) ou por código ----------
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

-- ---------- ranking: só membros veem o ranking do grupo ----------
create or replace function public.get_leaderboard(p_since date default null, p_group_id uuid default null)
returns table (
  user_id uuid,
  name text,
  avatar_url text,
  total_minutes bigint,
  session_count bigint,
  streak_days bigint
) language sql security definer set search_path = public as $$
  select
    p.id,
    p.name,
    p.avatar_url,
    coalesce(sum(s.minutes), 0)::bigint,
    count(s.id)::bigint,
    (select count(distinct s2.studied_at) from public.study_sessions s2
       where s2.user_id = p.id
         and s2.studied_at > current_date - 30)::bigint
  from public.profiles p
  left join public.study_sessions s
    on s.user_id = p.id
    and (p_since is null or s.studied_at >= p_since)
  where
    case
      when p_group_id is null then true
      else public.is_member(p_group_id, auth.uid())
           and p.id in (select gm.user_id from public.group_members gm where gm.group_id = p_group_id)
    end
  group by p.id
  having count(s.id) > 0 or p_group_id is not null
  order by 4 desc;
$$;
