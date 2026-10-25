-- Excluir a conta pelo banco direto não pode deixar assinatura paga cobrando no Stripe:
-- com assinatura de membros ainda ativa (como membro ou profissional), a exclusão precisa passar
-- pela função account-delete, que cancela no Stripe, apaga os arquivos e depois a conta.
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'É preciso estar logado' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.member_subscriptions
     where (member_id = auth.uid() or professional_id = auth.uid())
       and status in ('ativa', 'cancelando', 'inadimplente')
  ) then
    raise exception 'Há assinaturas pagas ativas: cancele-as antes de excluir a conta.'
      using errcode = '55000';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
