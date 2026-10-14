-- Pedido da administração (13/10/2026): a conta cainalopes1805@gmail.com fica com a pontuação
-- máxima de profissional (nível 5, "excelência", a partir de 1.500 pontos). Entra como um ajuste
-- da administração (ajuste_admin), registrado no histórico de pontos, até somar 2.000 pontos.
-- Só vale para profissional verificado; se a conta não existir ou não for verificada, nada muda.
do $$
declare
  uid uuid;
  current_score integer;
begin
  select id into uid from auth.users where lower(email) = 'cainalopes1805@gmail.com';
  if uid is null or not public.is_verified_professional(uid) then
    raise notice 'Conta não encontrada ou sem verificação profissional: pontuação não alterada.';
    return;
  end if;
  select coalesce((select score from public.pro_scores where professional_id = uid), 0)
    into current_score;
  if current_score < 2000 then
    perform public._pro_award(uid, 'ajuste_admin', 'admin', gen_random_uuid(),
      'Pontuação máxima liberada pela administração', 2000 - current_score);
  end if;
end;
$$;
