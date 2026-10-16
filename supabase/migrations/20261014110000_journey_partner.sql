-- Parceiro de jornada (N6): dupla de apoio entre dois amigos, com check-in diário de um toque
-- ("como foi meu dia" + recado curto opcional), "mandar força" (1 por dia) e a sequência gentil da
-- dupla (dias em que os dois fizeram check-in). Uma dupla ativa por pessoa; qualquer um sai quando
-- quiser, sem aviso. O parceiro só vê o check-in do dia (e em quais dias os dois registraram, para a
-- sequência); nada de peso, calorias, diário ou metas.

-- ---------------------------------------------------------------------------
-- Duplas (convite pendente ou ativa). Sair da dupla apaga a linha.
-- ---------------------------------------------------------------------------
create table public.journey_pairs (
  id uuid primary key default gen_random_uuid(),
  -- Quem convidou.
  user_a uuid not null references public.profiles (id) on delete cascade,
  -- Quem foi convidado.
  user_b uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pendente' check (status in ('pendente', 'ativa')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  check (user_a <> user_b)
);
create unique index journey_pairs_pair_key on public.journey_pairs
  (least(user_a, user_b), greatest(user_a, user_b));
create index journey_pairs_b_idx on public.journey_pairs (user_b);

alter table public.journey_pairs enable row level security;
create policy "journey_pairs: participantes leem" on public.journey_pairs
  for select to authenticated using (user_a = auth.uid() or user_b = auth.uid());
-- Escrita só pelas funções abaixo.

/** O parceiro da dupla ativa (null = sem dupla). */
create or replace function public.journey_partner_id(p_user uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public as $$
  select case when user_a = p_user then user_b else user_a end
    from public.journey_pairs
   where status = 'ativa' and (user_a = p_user or user_b = p_user)
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Check-ins da jornada (um por pessoa e dia). Ficam com a pessoa mesmo sem dupla.
-- ---------------------------------------------------------------------------
create table public.journey_checkins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Data local da pessoa (vem do aparelho).
  day date not null,
  mood text not null check (mood in ('cuidei', 'mais_ou_menos', 'dificil')),
  note text check (length(note) between 1 and 140),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create trigger journey_checkins_updated_at before update on public.journey_checkins
  for each row execute function public.set_updated_at();

alter table public.journey_checkins enable row level security;
create policy "journey_checkins: dono lê" on public.journey_checkins
  for select to authenticated using (user_id = auth.uid());
create policy "journey_checkins: dono apaga" on public.journey_checkins
  for delete to authenticated using (user_id = auth.uid());
-- Escrita pela journey_checkin(); o parceiro lê pela journey_partner_status().

-- ---------------------------------------------------------------------------
-- "Mandar força": no máximo um por pessoa e dia.
-- ---------------------------------------------------------------------------
create table public.journey_cheers (
  from_id uuid not null references public.profiles (id) on delete cascade,
  to_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (from_id, day)
);
create index journey_cheers_to_idx on public.journey_cheers (to_id, day);

alter table public.journey_cheers enable row level security;
create policy "journey_cheers: envolvidos leem" on public.journey_cheers
  for select to authenticated using (from_id = auth.uid() or to_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Avisos: os tipos da dupla entram na categoria "social".
-- ---------------------------------------------------------------------------
create or replace function public.notification_category(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('reacao', 'comentario', 'amizade_pedido', 'amizade_aceita', 'seguidor') then 'social'
    when p_type like 'dupla\_%' then 'social'
    when p_type in ('tema_previa', 'tema_ativo') then 'theme'
    when p_type = 'conquista' then 'achievements'
    when p_type in ('conteudo_oculto', 'conteudo_liberado', 'conta_suspensa', 'conta_reativada') then 'system'
    else 'clinical'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

/** Convida um amigo para a dupla. Se ele já tinha me convidado, aceita. */
create or replace function public.journey_invite(p_user uuid)
returns public.journey_pairs
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pr public.journey_pairs;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  if p_user is null or p_user = me then raise exception 'Escolha um amigo para a dupla.'; end if;
  if not public.are_friends(me, p_user) or public.is_blocked_between(me, p_user) then
    raise exception 'A dupla é feita entre amigos.';
  end if;
  if public.journey_partner_id(me) is not null then
    raise exception 'Você já tem um parceiro de jornada. Saia da dupla atual para convidar outra pessoa.';
  end if;
  if public.journey_partner_id(p_user) is not null then
    raise exception 'Essa pessoa já está em uma dupla.';
  end if;

  select * into pr from public.journey_pairs
   where least(user_a, user_b) = least(me, p_user)
     and greatest(user_a, user_b) = greatest(me, p_user)
   for update;

  if pr.id is not null and pr.user_b = me then
    return public.journey_respond(pr.id, true);
  end if;
  if pr.id is not null then
    return pr; -- convite meu já enviado
  end if;

  -- Um convite enviado por vez: o anterior é cancelado.
  delete from public.journey_pairs where user_a = me and status = 'pendente';
  insert into public.journey_pairs (user_a, user_b) values (me, p_user) returning * into pr;
  perform public.notify(p_user, 'dupla_convite', me, 'journey_pair', pr.id::text);
  return pr;
end;
$$;

/** Aceita ou recusa (em silêncio) um convite recebido. */
create or replace function public.journey_respond(p_pair uuid, p_accept boolean)
returns public.journey_pairs
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pr public.journey_pairs;
begin
  select * into pr from public.journey_pairs
   where id = p_pair and user_b = me and status = 'pendente'
   for update;
  if pr.id is null then raise exception 'Convite não encontrado.'; end if;

  if not p_accept then
    delete from public.journey_pairs where id = pr.id;
    return pr;
  end if;

  if not public.are_friends(pr.user_a, pr.user_b) or public.is_blocked_between(pr.user_a, pr.user_b) then
    delete from public.journey_pairs where id = pr.id;
    raise exception 'A dupla é feita entre amigos.';
  end if;
  if public.journey_partner_id(me) is not null then
    raise exception 'Você já tem um parceiro de jornada.';
  end if;
  if public.journey_partner_id(pr.user_a) is not null then
    delete from public.journey_pairs where id = pr.id;
    raise exception 'Essa pessoa já formou outra dupla.';
  end if;

  update public.journey_pairs set status = 'ativa', accepted_at = now()
   where id = pr.id returning * into pr;
  -- Os outros convites pendentes dos dois deixam de valer.
  delete from public.journey_pairs
   where status = 'pendente'
     and (user_a in (pr.user_a, pr.user_b) or user_b in (pr.user_a, pr.user_b));
  perform public.notify(pr.user_a, 'dupla_aceita', me, 'journey_pair', pr.id::text);
  return pr;
end;
$$;

/** Sai da dupla (ou cancela o convite enviado). Sem aviso para a outra pessoa. */
create or replace function public.journey_leave(p_pair uuid default null)
returns void language sql security definer set search_path = public as $$
  delete from public.journey_pairs
   where (user_a = auth.uid() or user_b = auth.uid())
     and (p_pair is null or id = p_pair)
     and (p_pair is not null or status = 'ativa' or user_a = auth.uid());
$$;

/** Registra (ou corrige) o check-in do dia. O parceiro é avisado no primeiro registro do dia. */
create or replace function public.journey_checkin(p_day date, p_mood text, p_note text default null)
returns public.journey_checkins
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c public.journey_checkins;
  inserted boolean;
  partner uuid;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  if p_day not between current_date - 1 and current_date + 1 then
    raise exception 'O check-in vale só para hoje.';
  end if;

  inserted := not exists (select 1 from public.journey_checkins where user_id = me and day = p_day);
  insert into public.journey_checkins (user_id, day, mood, note)
  values (me, p_day, p_mood, nullif(btrim(p_note), ''))
  on conflict (user_id, day) do update
    set mood = excluded.mood, note = excluded.note
  returning * into c;

  partner := public.journey_partner_id(me);
  if inserted and partner is not null then
    perform public.notify(partner, 'dupla_checkin', me, 'journey_pair', null);
  end if;
  return c;
end;
$$;

/** Manda força ao parceiro (uma vez por dia). */
create or replace function public.journey_cheer(p_day date)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  partner uuid := public.journey_partner_id(me);
begin
  if partner is null then raise exception 'Você ainda não tem um parceiro de jornada.'; end if;
  if p_day not between current_date - 1 and current_date + 1 then
    raise exception 'Data inválida.';
  end if;
  insert into public.journey_cheers (from_id, to_id, day) values (me, partner, p_day)
  on conflict do nothing;
  if found then
    perform public.notify(partner, 'dupla_forca', me, 'journey_pair', null);
  end if;
end;
$$;

/**
 * O que o app mostra sobre o parceiro: o check-in de hoje (humor e recado), os dias desde o início
 * da dupla em que os DOIS registraram (para a sequência gentil, só as datas) e a força do dia.
 */
create or replace function public.journey_partner_status(p_day date)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pr public.journey_pairs;
  partner uuid;
begin
  select * into pr from public.journey_pairs
   where status = 'ativa' and (user_a = me or user_b = me) limit 1;
  if pr.id is null then return null; end if;
  partner := case when pr.user_a = me then pr.user_b else pr.user_a end;

  return jsonb_build_object(
    'pair_id', pr.id,
    'partner_id', partner,
    'since', pr.accepted_at,
    'partner_today', (
      select jsonb_build_object('mood', c.mood, 'note', c.note, 'at', c.updated_at)
        from public.journey_checkins c where c.user_id = partner and c.day = p_day
    ),
    'together_days', coalesce((
      select jsonb_agg(m.day order by m.day)
        from public.journey_checkins m
        join public.journey_checkins o on o.user_id = partner and o.day = m.day
       where m.user_id = me
         and m.day >= greatest(pr.accepted_at::date - 1, p_day - 60)
    ), '[]'::jsonb),
    'cheer_sent', exists (select 1 from public.journey_cheers where from_id = me and day = p_day),
    'cheer_received', exists (
      select 1 from public.journey_cheers where from_id = partner and to_id = me and day = p_day
    )
  );
end;
$$;

-- Só usada dentro das funções acima (não revela a dupla de terceiros).
revoke execute on function public.journey_partner_id(uuid) from public, anon, authenticated;
revoke execute on function public.journey_invite(uuid) from public, anon;
revoke execute on function public.journey_respond(uuid, boolean) from public, anon;
revoke execute on function public.journey_leave(uuid) from public, anon;
revoke execute on function public.journey_checkin(date, text, text) from public, anon;
revoke execute on function public.journey_cheer(date) from public, anon;
revoke execute on function public.journey_partner_status(date) from public, anon;
grant execute on function public.journey_invite(uuid) to authenticated;
grant execute on function public.journey_respond(uuid, boolean) to authenticated;
grant execute on function public.journey_leave(uuid) to authenticated;
grant execute on function public.journey_checkin(date, text, text) to authenticated;
grant execute on function public.journey_cheer(date) to authenticated;
grant execute on function public.journey_partner_status(date) to authenticated;

-- ---------------------------------------------------------------------------
-- Desfazer a amizade ou bloquear encerra a dupla (e o convite).
-- ---------------------------------------------------------------------------
create or replace function public.trg_journey_end_on_friendship()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' or new.status <> 'aceita' then
    delete from public.journey_pairs
     where least(user_a, user_b) = least(old.requester_id, old.addressee_id)
       and greatest(user_a, user_b) = greatest(old.requester_id, old.addressee_id);
  end if;
  return null;
end;
$$;
create trigger friendships_end_journey after update or delete on public.friendships
  for each row execute function public.trg_journey_end_on_friendship();

create or replace function public.trg_journey_end_on_block()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.journey_pairs
   where least(user_a, user_b) = least(new.blocker_id, new.blocked_id)
     and greatest(user_a, user_b) = greatest(new.blocker_id, new.blocked_id);
  return null;
end;
$$;
create trigger blocks_end_journey after insert on public.blocks
  for each row execute function public.trg_journey_end_on_block();

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui a dupla, os check-ins e as forças enviadas.
-- ---------------------------------------------------------------------------
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
    'configuracoes', (select to_jsonb(s) from public.user_settings s where s.id = me)
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
      ('cardapios_da_semana', 'weekly_menus', array['user_id']),
      ('lancheira_sobre_criancas', 'lunchbox_profiles', array['owner_id']),
      ('lancheiras', 'lunchboxes', array['owner_id']),
      ('modelos_de_plano', 'meal_plan_templates', array['professional_id']),
      ('registros_do_dia', 'daily_checkins', array['user_id']),
      ('parceiro_de_jornada', 'journey_pairs', array['user_a', 'user_b']),
      ('jornada_checkins', 'journey_checkins', array['user_id']),
      ('jornada_forcas_enviadas', 'journey_cheers', array['from_id'])
    ) as v(label, tbl, cols)
  loop
    result := result || jsonb_build_object(spec.label, public._export_rows(spec.tbl, spec.cols, me));
  end loop;

  return result;
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
