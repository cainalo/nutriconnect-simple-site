-- Higiene apontada pelo painel de segurança do Supabase (23/10/2026).
-- 1) Funções de gatilho com SECURITY DEFINER não precisam ser chamáveis pela API: o gatilho roda
--    do mesmo jeito sem EXECUTE para anon/authenticated.
-- 2) setting_int lia qualquer configuração numérica da plataforma sem login; passa a exigir login
--    (o site só usa por dentro de outras funções do banco).
-- 3) Funções sem search_path fixo ganham um (evita trocar o significado de nomes não qualificados).
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.prosecdef and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', f.sig);
  end loop;

  for f in
    select p.oid::regprocedure as sig
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('storage_owner', 'search_norm', 'mark_theme_edit', 'set_updated_at',
                         'force_online_payments', 'push_in_quiet', '_water_check_day',
                         'notification_category')
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
  loop
    execute format('alter function %s set search_path = public, extensions', f.sig);
  end loop;
end
$$;

revoke execute on function public.setting_int(text, integer) from public, anon;
grant execute on function public.setting_int(text, integer) to authenticated;
