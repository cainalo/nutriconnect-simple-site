-- Higiene apontada pelo relatório de segurança do Supabase depois das migrations de 14–15/10:
-- funções de gatilho não precisam ser executáveis por ninguém (só rodam como gatilho) e a função
-- interna do código de convite da casa ganha search_path fixo.
create or replace function public._household_code()
returns text language sql volatile set search_path = public as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
    from generate_series(1, 6);
$$;
revoke execute on function public._household_code() from public, anon, authenticated;

revoke execute on function public.trg_appointment_teleconsult() from public, anon, authenticated;
revoke execute on function public.trg_household_member_left() from public, anon, authenticated;
revoke execute on function public.trg_household_notes_trim() from public, anon, authenticated;
revoke execute on function public.trg_journey_end_on_block() from public, anon, authenticated;
revoke execute on function public.trg_journey_end_on_friendship() from public, anon, authenticated;
revoke execute on function public.trg_shopping_item_update() from public, anon, authenticated;
revoke execute on function public.trg_lunch_owner() from public, anon, authenticated;
