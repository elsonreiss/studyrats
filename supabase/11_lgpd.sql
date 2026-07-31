-- ============================================================
-- StudyRats — Migração 11: direitos do titular (LGPD)
-- Rode no SQL Editor do Supabase, depois das migrações 02 a 10.
--
-- A LGPD garante à pessoa apagar e exportar os próprios dados
-- (art. 18). Sem isso, não havia nem como atender um pedido.
-- ============================================================

-- ---------- 1. registro do aceite ----------
alter table public.profiles
  add column if not exists accepted_terms_at timestamptz,
  add column if not exists terms_version text;

-- ---------- 2. exportar meus dados ----------
create or replace function public.export_my_data()
returns json
language sql security definer stable set search_path = public as $$
  select json_build_object(
    'exportado_em', now(),
    'perfil', (
      select to_json(p) from (
        select id, name, bio, avatar_url, created_at, accepted_terms_at
        from public.profiles where id = auth.uid()
      ) p
    ),
    'check_ins', (
      select coalesce(json_agg(to_json(s)), '[]'::json) from (
        select id, title, subject, notes, minutes, studied_at, created_at,
               photo_path, thumb_path
        from public.study_sessions
        where user_id = auth.uid()
        order by studied_at desc
      ) s
    ),
    'desafios', (
      select coalesce(json_agg(to_json(g)), '[]'::json) from (
        select gr.id, gr.name, gr.description, gr.starts_on, gr.ends_on,
               (gr.owner_id = auth.uid()) as sou_dono, gm.joined_at
        from public.group_members gm
        join public.groups gr on gr.id = gm.group_id
        where gm.user_id = auth.uid()
      ) g
    ),
    'comentarios', (
      select coalesce(json_agg(to_json(c)), '[]'::json) from (
        select id, session_id, body, created_at
        from public.checkin_comments where user_id = auth.uid()
        order by created_at desc
      ) c
    ),
    'mensagens', (
      select coalesce(json_agg(to_json(m)), '[]'::json) from (
        select id, group_id, body, created_at
        from public.group_messages where user_id = auth.uid()
        order by created_at desc
      ) m
    ),
    'curtidas', (
      select coalesce(json_agg(to_json(r)), '[]'::json) from (
        select session_id, created_at
        from public.checkin_reactions where user_id = auth.uid()
      ) r
    )
  );
$$;

-- ---------- 3. apagar minha conta ----------
-- Apagar de auth.users derruba tudo em cascata: perfil, check-ins,
-- comentários, mensagens, curtidas, participações e desafios criados.
-- As fotos no storage são removidas pelo app antes de chamar esta função.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Não autenticado';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

revoke all on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------- 4. o que acontece com os desafios que a pessoa criou ----------
-- Hoje o desafio é apagado junto com o dono, porque groups.owner_id
-- referencia profiles com ON DELETE CASCADE. O app avisa isso na
-- confirmação, para ninguém apagar um grupo cheio de gente sem saber.
