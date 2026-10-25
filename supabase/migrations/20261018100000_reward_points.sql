-- X4 — Pontos e recompensas.
-- Ganho: toda segunda-feira (cron), cada pessoa recebe 10 pontos por ponto da liga da semana que
-- passou (dias de água na meta, verduras, comida de casa, movimento, refeição com calma e trilha:
-- até 42 → 420 pontos) e 50 por desafio com amigos em que chegou à meta. Sem pontos por compra.
-- Troca: a administração cadastra as recompensas (desconto num programa da Loja ou brinde de
-- parceiro). O resgate gera um código. O desconto de programa sai da TAXA DA PLATAFORMA, nunca da
-- parte do profissional (e no máximo a taxa inteira): a checagem fica na Edge Function
-- program-checkout, e o uso do código é gravado pelo stripe-webhook.

create table public.reward_points (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('semana', 'desafio', 'resgate', 'estorno', 'ajuste')),
  -- Referência que impede contar duas vezes (ex.: a semana, o desafio, o resgate).
  ref text not null,
  note text check (note is null or length(note) <= 200),
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index reward_points_user_idx on public.reward_points (user_id, created_at desc);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('desconto_programa', 'brinde_parceiro')),
  title text not null check (length(btrim(title)) between 3 and 80),
  description text not null default '' check (length(description) <= 400),
  cost integer not null check (cost between 50 and 100000),
  -- Desconto (só para desconto_programa): % do preço do programa, limitado à taxa da plataforma.
  discount_percent smallint check (discount_percent between 1 and 50),
  partner_id uuid references public.market_partners (id) on delete set null,
  -- Quantos ainda podem ser resgatados (nulo = sem limite).
  stock integer check (stock is null or stock >= 0),
  -- Validade do código depois do resgate.
  valid_days smallint not null default 60 check (valid_days between 1 and 365),
  active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  check ((kind = 'desconto_programa') = (discount_percent is not null))
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id uuid not null references public.rewards (id) on delete restrict,
  cost integer not null,
  code text not null unique,
  status text not null default 'ativo' check (status in ('ativo', 'usado', 'expirado')),
  used_at timestamptz,
  -- O que usou o código (ex.: a compra do programa).
  used_ref text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index reward_redemptions_user_idx on public.reward_redemptions (user_id, created_at desc);

alter table public.reward_points enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;

create policy "reward_points: dono e admin leem" on public.reward_points
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
create policy "rewards: todos leem as ativas, admin lê tudo" on public.rewards
  for select to authenticated using (active or public.is_platform_admin());
create policy "rewards: admin gerencia" on public.rewards
  for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "reward_redemptions: dono e admin leem" on public.reward_redemptions
  for select to authenticated using (user_id = auth.uid() or public.is_platform_admin());
-- Pontos e resgates só mudam pelas funções abaixo.

create or replace function public.reward_balance(p_user uuid default auth.uid())
returns integer language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::integer from public.reward_points where user_id = p_user;
$$;
revoke execute on function public.reward_balance(uuid) from public, anon;
grant execute on function public.reward_balance(uuid) to authenticated;

/** Pontos da semana de uma pessoa (uso interno e prévia na tela). */
create or replace function public._week_reward_points(p_user uuid, p_week date)
returns integer language sql stable security definer set search_path = public as $$
  select (
    10 * (public._activity_days(p_user, 'agua', p_week) + public._activity_days(p_user, 'verduras', p_week)
        + public._activity_days(p_user, 'caseira', p_week) + public._activity_days(p_user, 'mover', p_week)
        + public._activity_days(p_user, 'calma', p_week) + public._activity_days(p_user, 'trilha', p_week))
  )::integer;
$$;
revoke execute on function public._week_reward_points(uuid, date) from public, anon, authenticated;

/** Prévia do que a pessoa já juntou nesta semana (entra no saldo na segunda-feira). */
create or replace function public.reward_week_preview()
returns integer language sql stable security definer set search_path = public as $$
  select public._week_reward_points(auth.uid(), public.current_week_start())
       + 50 * (select count(*) from public.friend_challenges c
                 join public.friend_challenge_members m on m.challenge_id = c.id
                where m.user_id = auth.uid() and m.status = 'aceito'
                  and c.week_start = public.current_week_start()
                  and public._activity_days(auth.uid(), c.metric, c.week_start) >= c.target)::integer;
$$;
revoke execute on function public.reward_week_preview() from public, anon;
grant execute on function public.reward_week_preview() to authenticated;

/** Credita a semana p_week (cron de segunda; pode rodar de novo sem duplicar). */
create or replace function public.award_weekly_points(p_week date default null)
returns integer language plpgsql security definer set search_path = public as $$
declare
  ws date := coalesce(p_week, public.current_week_start() - 7);
  u record;
  pts integer;
  ch record;
  n integer := 0;
begin
  -- Só quem registrou alguma coisa na semana.
  for u in
    select distinct uid from (
      select user_id as uid from public.water_days where day between ws and ws + 6
      union select user_id from public.daily_checkins where day between ws and ws + 6
      union select t.owner_id from public.trail_xp_daily x join public.trail_profiles t on t.id = x.profile_id
             where t.kind = 'adult' and x.day between ws and ws + 6 and x.xp > 0
    ) s
  loop
    pts := public._week_reward_points(u.uid, ws);
    if pts > 0 then
      insert into public.reward_points (user_id, delta, reason, ref)
      values (u.uid, pts, 'semana', ws::text)
      on conflict do nothing;
      if found then
        n := n + 1;
        perform public.notify(u.uid, 'pontos_semana', null, 'reward', ws::text,
          jsonb_build_object('points', pts));
      end if;
    end if;
  end loop;

  for ch in
    select c.id, c.metric, c.target, m.user_id
      from public.friend_challenges c
      join public.friend_challenge_members m on m.challenge_id = c.id and m.status = 'aceito'
     where c.week_start = ws
  loop
    if public._activity_days(ch.user_id, ch.metric, ws) >= ch.target then
      insert into public.reward_points (user_id, delta, reason, ref)
      values (ch.user_id, 50, 'desafio', ch.id::text)
      on conflict do nothing;
    end if;
  end loop;

  -- Códigos vencidos.
  update public.reward_redemptions set status = 'expirado'
   where status = 'ativo' and expires_at < now();
  return n;
end;
$$;
revoke execute on function public.award_weekly_points(date) from public, anon, authenticated;

/** Troca pontos por uma recompensa; devolve o código. */
create or replace function public.redeem_reward(p_reward uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  rw public.rewards;
  v_code text;
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  -- Trava a pessoa para dois resgates ao mesmo tempo não gastarem o mesmo saldo.
  perform pg_advisory_xact_lock(hashtext('reward:' || auth.uid()::text));
  select * into rw from public.rewards where id = p_reward and active for update;
  if rw.id is null then raise exception 'Recompensa indisponível.' using errcode = '22023'; end if;
  if rw.stock is not null and rw.stock <= 0 then
    raise exception 'Esta recompensa acabou.' using errcode = '22023';
  end if;
  if public.reward_balance(auth.uid()) < rw.cost then
    raise exception 'Pontos insuficientes.' using errcode = '22023';
  end if;

  v_code := 'NC-' || upper(substr(md5(gen_random_uuid()::text), 1, 8));
  insert into public.reward_redemptions (user_id, reward_id, cost, code, expires_at)
  values (auth.uid(), rw.id, rw.cost, v_code, now() + make_interval(days => rw.valid_days))
  returning id into v_id;
  insert into public.reward_points (user_id, delta, reason, ref)
  values (auth.uid(), -rw.cost, 'resgate', v_id::text);
  if rw.stock is not null then
    update public.rewards set stock = stock - 1 where id = rw.id;
  end if;
  return v_code;
end;
$$;
revoke execute on function public.redeem_reward(uuid) from public, anon;
grant execute on function public.redeem_reward(uuid) to authenticated;

/** Marca o código como usado (stripe-webhook, com service_role). */
create or replace function public.use_reward_redemption(p_redemption uuid, p_ref text)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.reward_redemptions set status = 'usado', used_at = now(), used_ref = p_ref
   where id = p_redemption and status = 'ativo';
  return found;
end;
$$;
revoke execute on function public.use_reward_redemption(uuid, text) from public, anon, authenticated;

/** Administração: marca um brinde de parceiro como entregue, ou devolve os pontos de um código. */
create or replace function public.admin_set_redemption(p_redemption uuid, p_action text)
returns void language plpgsql security definer set search_path = public as $$
declare
  rd public.reward_redemptions;
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas administradores.' using errcode = '42501';
  end if;
  select * into rd from public.reward_redemptions where id = p_redemption for update;
  if rd.id is null or rd.status <> 'ativo' then
    raise exception 'Código já usado ou vencido.' using errcode = '22023';
  end if;
  if p_action = 'entregue' then
    update public.reward_redemptions set status = 'usado', used_at = now(), used_ref = 'admin'
     where id = rd.id;
  elsif p_action = 'devolver' then
    update public.reward_redemptions set status = 'expirado' where id = rd.id;
    insert into public.reward_points (user_id, delta, reason, ref, note)
    values (rd.user_id, rd.cost, 'estorno', rd.id::text, 'Pontos devolvidos pela equipe');
  else
    raise exception 'Ação inválida.' using errcode = '22023';
  end if;
end;
$$;
revoke execute on function public.admin_set_redemption(uuid, text) from public, anon;
grant execute on function public.admin_set_redemption(uuid, text) to authenticated;

-- Recompensa inicial (a administração muda ou desliga no painel).
insert into public.rewards (kind, title, description, cost, discount_percent, valid_days, position)
values ('desconto_programa', '10% de desconto num programa da Loja',
        'Vale para um programa de qualquer profissional. O desconto sai da taxa do NutriConnect: o profissional recebe o mesmo valor.',
        600, 10, 60, 0);

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'nutriconnect-weekly-points';
  -- Segunda-feira, 6h UTC (3h em Brasília): credita a semana que terminou no sábado.
  perform cron.schedule('nutriconnect-weekly-points', '0 6 * * 1', 'select public.award_weekly_points()');
exception when others then
  raise notice 'pg_cron indisponível: %', sqlerrm;
end;
$$;

-- O aviso semanal de pontos é da categoria "conquistas".
create or replace function public.notification_category(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('reacao', 'comentario', 'amizade_pedido', 'amizade_aceita', 'seguidor') then 'social'
    when p_type like 'dupla\_%' or p_type like 'casa\_%' or p_type like 'evento\_%' then 'social'
    when p_type like 'desafio\_amigo\_%' or p_type = 'desafio_forca' then 'social'
    when p_type in ('tema_previa', 'tema_ativo') then 'theme'
    when p_type in ('conquista', 'pontos_semana') then 'achievements'
    when p_type in ('conteudo_oculto', 'conteudo_liberado', 'conta_suspensa', 'conta_reativada') then 'system'
    else 'clinical'
  end;
$$;

-- LGPD: a cópia dos dados inclui desafios com amigos, pontos e recompensas.
create or replace function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  result jsonb;
  spec record;
begin
  if me is null then
    raise exception 'É preciso estar logado.' using errcode = '42501';
  end if;

  result := jsonb_build_object(
    'gerado_em', now(),
    'conta', (select jsonb_build_object('email', u.email, 'criada_em', u.created_at)
                from auth.users u where u.id = me),
    'perfil', (select to_jsonb(p) from public.profiles p where p.id = me),
    'pagina_do_perfil', (select to_jsonb(g) from public.profile_pages g where g.user_id = me),
    'dados_pessoais', (select to_jsonb(p) from public.profile_private p where p.id = me),
    'configuracoes', (select to_jsonb(s) from public.user_settings s where s.id = me),
    'casa', (select jsonb_build_object('nome', h.name, 'emoji', h.emoji, 'papel', m.role,
                                       'entrou_em', m.joined_at)
               from public.household_members m join public.households h on h.id = m.household_id
              where m.user_id = me)
  );

  for spec in
    select * from (values
      ('publicacoes', 'posts', array['author_id']),
      ('comentarios', 'comments', array['author_id']),
      ('reacoes', 'post_reactions', array['user_id']),
      ('posts_salvos', 'saved_posts', array['user_id']),
      ('seguindo', 'follows', array['follower_id']),
      ('amizades', 'friendships', array['requester_id', 'addressee_id']),
      ('bloqueios', 'blocks', array['blocker_id']),
      ('comunidades', 'community_members', array['user_id']),
      ('eventos_conduzidos', 'community_events', array['host_id']),
      ('eventos_perguntas', 'event_questions', array['author_id']),
      ('eventos_votos', 'event_question_votes', array['user_id']),
      ('desafios_participacao', 'challenge_participants', array['user_id']),
      ('desafios_dicas', 'challenge_tips', array['author_id']),
      ('votos_enquete', 'theme_poll_votes', array['user_id']),
      ('conversas_nina', 'nina_messages', array['user_id']),
      ('notificacoes', 'notifications', array['user_id']),
      ('mensagens_fale_conosco', 'contact_messages', array['user_id']),
      ('denuncias_feitas', 'reports', array['reporter_id']),
      ('diario_alimentar', 'diary_entries', array['patient_id']),
      ('diario_comentarios', 'diary_comments', array['author_id']),
      ('metas', 'goals', array['patient_id']),
      ('metas_checkins', 'goal_checkins', array['patient_id']),
      ('anamneses', 'anamneses', array['patient_id']),
      ('antropometria', 'anthropometrics', array['patient_id']),
      ('avaliacoes_clinicas', 'clinical_assessments', array['patient_id']),
      ('planos_de_cuidado', 'care_plans', array['patient_id']),
      ('planos_de_cuidado_checkins', 'care_plan_checkins', array['patient_id']),
      ('planos_alimentares', 'meal_plans', array['patient_id']),
      ('consultas', 'appointments', array['patient_id']),
      ('pagamentos', 'payments', array['patient_id']),
      ('mensagens_acompanhamento', 'messages', array['patient_id', 'sender_id']),
      ('vinculos_profissionais', 'care_links', array['patient_id']),
      ('documentos_enviados', 'patient_documents', array['patient_id']),
      ('perfis_da_trilha', 'trail_profiles', array['owner_id']),
      ('verificacoes_profissionais', 'verification_requests', array['user_id']),
      ('cadastro_profissional', 'professionals', array['user_id']),
      ('teleconsulta_habilitacao', 'teleconsult_checks', array['professional_id']),
      ('fotos_do_perfil', 'profile_media', array['user_id']),
      ('consentimentos', 'consents', array['user_id']),
      ('lembretes', 'reminders', array['user_id']),
      ('preferencias_push', 'push_settings', array['user_id']),
      ('aparelhos_push', 'push_subscriptions', array['user_id']),
      ('agua_meta', 'water_settings', array['user_id']),
      ('agua_dias', 'water_days', array['user_id']),
      ('rotulos_lidos', 'label_scans', array['user_id']),
      ('receitas_guardadas', 'saved_recipes', array['user_id']),
      ('lista_de_compras', 'shopping_items', array['user_id']),
      ('geladeira', 'fridge_items', array['user_id']),
      ('cardapios_da_semana', 'weekly_menus', array['user_id']),
      ('lancheira_sobre_criancas', 'lunchbox_profiles', array['owner_id']),
      ('lancheiras', 'lunchboxes', array['owner_id']),
      ('mural_da_casa', 'household_notes', array['author_id']),
      ('modelos_de_plano', 'meal_plan_templates', array['professional_id']),
      ('programas_criados', 'pro_programs', array['professional_id']),
      ('programas_comprados', 'program_purchases', array['buyer_id']),
      ('programas_progresso', 'program_progress', array['user_id']),
      ('compras_em_parceiros', 'market_clicks', array['user_id']),
      ('registros_do_dia', 'daily_checkins', array['user_id']),
      ('parceiro_de_jornada', 'journey_pairs', array['user_a', 'user_b']),
      ('jornada_checkins', 'journey_checkins', array['user_id']),
      ('jornada_forcas_enviadas', 'journey_cheers', array['from_id']),
      ('avaliacoes_de_profissionais', 'professional_reviews', array['patient_id']),
      ('diario_de_sintomas', 'symptom_logs', array['patient_id']),
      ('exames_agendados', 'exam_reminders', array['patient_id']),
      ('desafios_com_amigos', 'friend_challenge_members', array['user_id']),
      ('pontos', 'reward_points', array['user_id']),
      ('recompensas_resgatadas', 'reward_redemptions', array['user_id'])
    ) as v(label, tbl, cols)
  loop
    result := result || jsonb_build_object(spec.label, public._export_rows(spec.tbl, spec.cols, me));
  end loop;

  return result;
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
