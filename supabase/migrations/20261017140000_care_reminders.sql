-- X2 — Lembretes de consulta e de exames, e confirmação de presença.
-- Consultas: aviso ao paciente 24 h antes (com "confirmar presença") e a paciente e profissional
-- 1 h antes. Exames: o paciente (ou o profissional do acompanhamento, como pedido) anota o exame
-- com data; o paciente é avisado 24 h antes. Os avisos são notificações (aparecem no site e viram
-- push pelo fluxo de push_queue). E-mail fica para quando houver um provedor de e-mail configurado.

-- ---------------------------------------------------------------------------
-- Consultas
-- ---------------------------------------------------------------------------
alter table public.appointments
  add column if not exists reminder_24h_at timestamptz,
  add column if not exists reminder_1h_at timestamptz,
  add column if not exists patient_confirmed_at timestamptz;

-- Remarcou: os lembretes e a confirmação valem para o novo horário.
create or replace function public.trg_appointment_reset_reminders()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.starts_at is distinct from old.starts_at then
    new.reminder_24h_at := null;
    new.reminder_1h_at := null;
    new.patient_confirmed_at := null;
  end if;
  return new;
end;
$$;
create trigger appointments_reset_reminders before update on public.appointments
  for each row execute function public.trg_appointment_reset_reminders();

/** O paciente confirma que vai à consulta (avisa o profissional). */
create or replace function public.confirm_attendance(p_appointment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  a public.appointments;
begin
  select * into a from public.appointments where id = p_appointment;
  if a.id is null or a.patient_id <> auth.uid() then
    raise exception 'Consulta não encontrada.' using errcode = '42501';
  end if;
  if a.status not in ('agendada', 'confirmada') or a.starts_at <= now() then
    raise exception 'Esta consulta não pode mais ser confirmada.' using errcode = '22023';
  end if;
  if a.patient_confirmed_at is not null then return; end if;
  update public.appointments set patient_confirmed_at = now() where id = a.id;
  perform public.notify(a.professional_id, 'consulta_presenca', a.patient_id, 'appointment', a.id::text,
    jsonb_build_object('starts_at', a.starts_at, 'modality', a.modality));
end;
$$;
revoke execute on function public.confirm_attendance(uuid) from public, anon;
grant execute on function public.confirm_attendance(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Exames
-- ---------------------------------------------------------------------------
create table public.exam_reminders (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete cascade,
  -- Profissional que pediu (nulo = o próprio paciente anotou).
  requested_by uuid references public.profiles (id) on delete set null,
  title text not null check (length(btrim(title)) between 2 and 120),
  due_at timestamptz not null,
  location text check (location is null or length(location) <= 160),
  notes text check (notes is null or length(notes) <= 400),
  done_at timestamptz,
  reminded_at timestamptz,
  created_at timestamptz not null default now()
);
create index exam_reminders_patient_idx on public.exam_reminders (patient_id, due_at);
create index exam_reminders_due_idx on public.exam_reminders (due_at) where done_at is null and reminded_at is null;

-- Mudou a data: avisa de novo.
create or replace function public.trg_exam_reset_reminder()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.due_at is distinct from old.due_at then new.reminded_at := null; end if;
  return new;
end;
$$;
create trigger exam_reminders_reset before update on public.exam_reminders
  for each row execute function public.trg_exam_reset_reminder();

alter table public.exam_reminders enable row level security;
create policy "exam_reminders: paciente e profissional do acompanhamento leem" on public.exam_reminders
  for select to authenticated using (patient_id = auth.uid() or public.has_active_link(patient_id));
create policy "exam_reminders: paciente ou profissional cria" on public.exam_reminders
  for insert to authenticated with check (
    (patient_id = auth.uid() and requested_by is null)
    or (requested_by = auth.uid() and public.has_active_link(patient_id))
  );
create policy "exam_reminders: paciente ou quem pediu altera" on public.exam_reminders
  for update to authenticated
  using (patient_id = auth.uid() or (requested_by = auth.uid() and public.has_active_link(patient_id)))
  with check (patient_id = auth.uid() or (requested_by = auth.uid() and public.has_active_link(patient_id)));
create policy "exam_reminders: paciente ou quem pediu apaga" on public.exam_reminders
  for delete to authenticated
  using (patient_id = auth.uid() or (requested_by = auth.uid() and public.has_active_link(patient_id)));
grant select, insert, update, delete on public.exam_reminders to authenticated;

-- Profissional pediu um exame: avisa o paciente.
create or replace function public.trg_notify_exam_request()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.requested_by is not null then
    perform public.notify(new.patient_id, 'exame_pedido', new.requested_by, 'exam', new.id::text,
      jsonb_build_object('title', new.title, 'due_at', new.due_at));
  end if;
  return new;
end;
$$;
create trigger exam_reminders_notify after insert on public.exam_reminders
  for each row execute function public.trg_notify_exam_request();

-- ---------------------------------------------------------------------------
-- Envio (cron a cada 10 min)
-- ---------------------------------------------------------------------------
create or replace function public.send_care_reminders()
returns integer language plpgsql security definer set search_path = public as $$
declare
  a record;
  e record;
  sent integer := 0;
begin
  -- 1 h antes: paciente e profissional.
  for a in
    select * from public.appointments
     where status in ('agendada', 'confirmada') and reminder_1h_at is null
       and starts_at > now() and starts_at <= now() + interval '1 hour'
     for update skip locked
  loop
    perform public.notify(a.patient_id, 'consulta_lembrete', a.professional_id, 'appointment', a.id::text,
      jsonb_build_object('starts_at', a.starts_at, 'modality', a.modality, 'when', '1h'));
    perform public.notify(a.professional_id, 'consulta_lembrete', a.patient_id, 'appointment', a.id::text,
      jsonb_build_object('starts_at', a.starts_at, 'modality', a.modality, 'when', '1h'));
    update public.appointments
       set reminder_1h_at = now(), reminder_24h_at = coalesce(reminder_24h_at, now())
     where id = a.id;
    sent := sent + 1;
  end loop;

  -- 24 h antes (se a consulta foi marcada com menos de 2 h, só vale o de 1 h): só o paciente.
  for a in
    select * from public.appointments
     where status in ('agendada', 'confirmada') and reminder_24h_at is null
       and starts_at > now() + interval '2 hours' and starts_at <= now() + interval '24 hours'
     for update skip locked
  loop
    perform public.notify(a.patient_id, 'consulta_lembrete', a.professional_id, 'appointment', a.id::text,
      jsonb_build_object('starts_at', a.starts_at, 'modality', a.modality, 'when', '24h',
                         'confirmed', a.patient_confirmed_at is not null));
    update public.appointments set reminder_24h_at = now() where id = a.id;
    sent := sent + 1;
  end loop;

  -- Exames nas próximas 24 h.
  for e in
    select * from public.exam_reminders
     where done_at is null and reminded_at is null
       and due_at > now() and due_at <= now() + interval '24 hours'
     for update skip locked
  loop
    perform public.notify(e.patient_id, 'exame_lembrete', null, 'exam', e.id::text,
      jsonb_build_object('title', e.title, 'due_at', e.due_at, 'location', e.location));
    update public.exam_reminders set reminded_at = now() where id = e.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;
revoke execute on function public.send_care_reminders() from public, anon, authenticated;

do $$
begin
  create extension if not exists pg_cron;
  perform cron.unschedule(jobid) from cron.job where jobname = 'nutriconnect-care-reminders';
  perform cron.schedule('nutriconnect-care-reminders', '*/10 * * * *', 'select public.send_care_reminders()');
exception when others then
  raise notice 'pg_cron indisponível: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- LGPD: a cópia dos dados inclui as tabelas novas (avaliações, sintomas e exames).
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
      ('exames_agendados', 'exam_reminders', array['patient_id'])
    ) as v(label, tbl, cols)
  loop
    result := result || jsonb_build_object(spec.label, public._export_rows(spec.tbl, spec.cols, me));
  end loop;

  return result;
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;

-- ---------------------------------------------------------------------------
-- Push: o aviso de exame abre Exames; o de avaliação recebida abre Avaliações do painel; os de
-- desafio entre amigos (X3) abrem Desafios.
-- (cópia de push_claim de 20261011100000_water.sql com as linhas novas)
-- ---------------------------------------------------------------------------
create or replace function public.push_claim()
returns table (user_id uuid, kind text, payload jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  r record;
  local_ts timestamp;
  minutes integer;
begin
  -- 1) Lembretes na hora (janela de 20 min para não perder nenhum se uma rodada atrasar).
  for r in
    select rm.id, rm.user_id as uid, rm.kind as rkind, rm.title, rm.body, rm.url, rm.days,
           rm.time_of_day, rm.last_sent_on,
           coalesce(ps.timezone, 'America/Sao_Paulo') as tz, ps.quiet_from, ps.quiet_to,
           coalesce(ps.show_preview, true) as preview,
           coalesce(us.locale, 'pt-BR') as locale
      from public.reminders rm
      left join public.push_settings ps on ps.user_id = rm.user_id
      left join public.user_settings us on us.id = rm.user_id
     where rm.active
       and exists (select 1 from public.push_subscriptions s where s.user_id = rm.user_id)
     for update of rm skip locked
  loop
    local_ts := now() at time zone r.tz;
    if extract(dow from local_ts)::smallint = any (r.days)
       and r.time_of_day <= local_ts::time
       and r.time_of_day > (local_ts - interval '20 minutes')::time
       and r.last_sent_on is distinct from local_ts::date then
      update public.reminders set last_sent_on = local_ts::date where id = r.id;
      continue when public.push_in_quiet(r.quiet_from, r.quiet_to, extract(hour from local_ts)::integer);
      -- Água: meta do dia batida, sem lembrete.
      continue when r.rkind = 'agua' and exists (
        select 1 from public.water_days w
         where w.user_id = r.uid and w.day = local_ts::date and w.glasses >= w.goal);
      user_id := r.uid;
      kind := 'lembrete';
      payload := jsonb_build_object(
        'kind', r.rkind, 'title', r.title, 'body', r.body,
        'url', coalesce(r.url, case r.rkind
                                 when 'refeicao' then '/acompanhamento/plano'
                                 when 'desafio' then '/desafios?aba=amigos'
                                 when 'agua' then '/acompanhamento'
                                 else '/espaco' end),
        'tag', 'lembrete-' || r.id, 'preview', r.preview, 'locale', r.locale);
      return next;
    end if;
  end loop;

  -- 2) Consultas que começam dentro da antecedência escolhida (paciente e profissional).
  --    O aviso de consulta ignora o horário de silêncio: é um compromisso marcado.
  for r in
    select a.id as appt, a.starts_at, u.uid, other.name as other_name,
           coalesce(ps.show_preview, true) as preview, coalesce(us.locale, 'pt-BR') as locale
      from public.appointments a
      cross join lateral (values (a.patient_id, a.professional_id), (a.professional_id, a.patient_id))
        as u (uid, other_id)
      left join public.push_settings ps on ps.user_id = u.uid
      left join public.user_settings us on us.id = u.uid
      left join public.profiles other on other.id = u.other_id
     where a.status in ('agendada', 'confirmada')
       and a.starts_at > now()
       and a.starts_at <= now() + interval '1441 minutes'
       and coalesce(ps.appointment_lead_min, 60) > 0
       and a.starts_at <= now() + make_interval(mins => coalesce(ps.appointment_lead_min, 60))
       and not exists (
         select 1 from public.push_appointment_log l where l.appointment_id = a.id and l.user_id = u.uid)
       and exists (select 1 from public.push_subscriptions s where s.user_id = u.uid)
  loop
    insert into public.push_appointment_log (appointment_id, user_id) values (r.appt, r.uid)
    on conflict do nothing;
    minutes := greatest(1, ceil(extract(epoch from (r.starts_at - now())) / 60)::integer);
    user_id := r.uid;
    kind := 'consulta';
    payload := jsonb_build_object(
      'minutes', minutes, 'starts_at', r.starts_at, 'other', r.other_name,
      'url', '/consulta/' || r.appt, 'tag', 'consulta-' || r.appt,
      'preview', r.preview, 'locale', r.locale);
    return next;
  end loop;

  -- 3) Avisos do site na fila.
  delete from public.push_queue where created_at < now() - interval '1 day';
  for r in
    select q.id as qid, n.id as nid, n.user_id as uid, n.type, n.entity_id, n.actor_id, n.data,
           p.name as actor_name,
           coalesce(ps.timezone, 'America/Sao_Paulo') as tz, ps.quiet_from, ps.quiet_to,
           coalesce(ps.show_preview, true) as preview, coalesce(us.locale, 'pt-BR') as locale,
           exists (select 1 from public.professionals pr where pr.user_id = n.user_id) as is_pro
      from public.push_queue q
      join public.notifications n on n.id = q.notification_id
      left join public.profiles p on p.id = n.actor_id
      left join public.push_settings ps on ps.user_id = q.user_id
      left join public.user_settings us on us.id = q.user_id
     order by q.id
     limit 500
     for update of q skip locked
  loop
    delete from public.push_queue where id = r.qid;
    local_ts := now() at time zone r.tz;
    continue when public.push_in_quiet(r.quiet_from, r.quiet_to, extract(hour from local_ts)::integer);
    user_id := r.uid;
    kind := 'aviso';
    payload := jsonb_build_object(
      'type', r.type, 'actor', r.actor_name, 'data', r.data,
      'url', case
        when r.type in ('reacao', 'comentario', 'conteudo_liberado') and r.entity_id is not null
          then '/explorar?post=' || r.entity_id
        when r.type in ('seguidor', 'amizade_pedido') and r.actor_id is not null
          then '/perfil/' || r.actor_id
        when r.type = 'amizade_aceita' then '/perfil/' || coalesce(r.entity_id, r.actor_id::text)
        when r.type = 'consulta_sala' and r.entity_id is not null then '/consulta/' || r.entity_id
        when r.type = 'consulta_avaliada' then '/painel/avaliacoes'
        when r.type like 'consulta_%' then
          case when r.is_pro then '/painel/agenda' else '/acompanhamento/consultas' end
        when r.type = 'mensagem' then
          case when r.is_pro then '/painel/mensagens' else '/acompanhamento/mensagens' end
        when r.type in ('plano_publicado', 'plano_cuidado') then '/acompanhamento/plano'
        when r.type = 'avaliacao_registrada' then '/acompanhamento/evolucao'
        when r.type like 'exame_%' then '/acompanhamento/exames'
        when r.type like 'desafio\_%' then '/desafios?aba=amigos'
        when r.type = 'pontos_semana' then '/recompensas'
        when r.type = 'diario_comentario' then '/acompanhamento/diario'
        when r.type = 'acompanhamento_pedido' then '/convites'
        when r.type = 'convite_aceito' then '/painel/pacientes'
        when r.type = 'acompanhamento_aceito' then '/acompanhamento'
        when r.type = 'meta_agua' then '/acompanhamento/metas'
        when r.type in ('tema_previa', 'tema_ativo') then '/tema-da-semana'
        else '/notificacoes'
      end,
      'tag', 'aviso-' || r.nid, 'preview', r.preview, 'locale', r.locale);
    return next;
  end loop;
end;
$$;
revoke execute on function public.push_claim() from public, anon, authenticated;
