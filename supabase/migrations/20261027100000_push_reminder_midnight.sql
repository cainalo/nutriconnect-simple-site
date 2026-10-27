-- NCV7-021: não perder lembretes quando a janela de 20 minutos cruza a meia-noite.
-- Compara timestamps locais (e o dia em que o lembrete foi agendado), não só valores TIME.
-- Preserva o corpo atual de push_claim, incluindo a filtragem de água e os destinos das notificações.
create or replace function public.push_claim()
returns table (user_id uuid, kind text, payload jsonb)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  r record;
  local_ts timestamp;
  schedule_ts timestamp;
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
    -- Converte o horário previsto na ocorrência mais recente (hoje ou ontem). Comparar só TIME
    -- perde lembretes agendados antes da meia-noite quando a janela de 20 minutos cruza o dia.
    schedule_ts := local_ts::date + r.time_of_day;
    if schedule_ts > local_ts then
      schedule_ts := schedule_ts - interval '1 day';
    end if;
    if extract(dow from schedule_ts)::smallint = any (r.days)
       and schedule_ts <= local_ts
       and schedule_ts > local_ts - interval '20 minutes'
       and r.last_sent_on is distinct from schedule_ts::date then
      update public.reminders set last_sent_on = schedule_ts::date where id = r.id;
      continue when public.push_in_quiet(r.quiet_from, r.quiet_to, extract(hour from local_ts)::integer);
      -- Água: meta do dia batida, sem lembrete.
      continue when r.rkind = 'agua' and exists (
        select 1 from public.water_days w
         where w.user_id = r.uid and w.day = schedule_ts::date and w.glasses >= w.goal);
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
