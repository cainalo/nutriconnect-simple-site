-- Verificação para teleconsulta (M4, Resolução CFN 760/2023): o profissional informa o cadastro
-- exigido pelo conselho para atender a distância (e-Nutricionista do CFN; e-Psi do CFP para
-- psicólogos; outro) e envia o comprovante; a administração confere e aprova. Quem foi aprovado ganha
-- o selo "Teleconsulta verificada". Quando a administração liga a exigência
-- (platform_settings "site_teleconsult_required" = true), só profissionais aprovados recebem
-- consultas online (o banco recusa as outras). Não há API pública do CFN: a conferência é manual.

alter table public.professionals add column teleconsult_approved_at timestamptz;
-- (Não entra nos grants de update do dono: só a administração aprova.)

create table public.teleconsult_checks (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (user_id) on delete cascade,
  registry text not null check (registry in ('e-nutricionista', 'e-psi', 'outro')),
  registry_number text not null check (length(btrim(registry_number)) between 2 and 60),
  -- Caminho no bucket privado verification-docs ({user_id}/...).
  document_path text not null check (length(document_path) between 5 and 300),
  status text not null default 'em_analise' check (status in ('em_analise', 'aprovado', 'recusado')),
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null,
  rejection_reason text check (length(rejection_reason) <= 500)
);
create unique index teleconsult_checks_one_open on public.teleconsult_checks (professional_id)
  where status = 'em_analise';
create index teleconsult_checks_pro_idx on public.teleconsult_checks (professional_id, submitted_at desc);

alter table public.teleconsult_checks enable row level security;
create policy "teleconsult_checks: dono e admin leem" on public.teleconsult_checks
  for select to authenticated using (professional_id = auth.uid() or public.is_platform_admin());
-- Escrita pelas funções abaixo.

/** A administração exige a habilitação para atender online? */
create or replace function public.teleconsult_required()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select value = 'true'::jsonb from public.platform_settings
                    where key = 'site_teleconsult_required'), false);
$$;

/** O profissional pode receber consulta online agora. */
create or replace function public.pro_online_allowed(p_pro uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select not public.teleconsult_required()
      or exists (select 1 from public.professionals
                  where user_id = p_pro and teleconsult_approved_at is not null);
$$;
revoke execute on function public.teleconsult_required() from public;
revoke execute on function public.pro_online_allowed(uuid) from public;
grant execute on function public.teleconsult_required() to anon, authenticated;
grant execute on function public.pro_online_allowed(uuid) to anon, authenticated;

create or replace function public.teleconsult_submit(p_registry text, p_number text, p_document_path text)
returns public.teleconsult_checks
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  c public.teleconsult_checks;
begin
  if not public.is_verified_professional(me) then
    raise exception 'Primeiro conclua a verificação profissional.';
  end if;
  if p_document_path is null or split_part(p_document_path, '/', 1) <> me::text then
    raise exception 'Envie o comprovante pela página.';
  end if;
  if exists (select 1 from public.teleconsult_checks where professional_id = me and status = 'em_analise') then
    raise exception 'Você já tem um pedido em análise.';
  end if;
  insert into public.teleconsult_checks (professional_id, registry, registry_number, document_path)
  values (me, p_registry, btrim(p_number), p_document_path)
  returning * into c;
  return c;
end;
$$;

create or replace function public.admin_review_teleconsult(p_check uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  c public.teleconsult_checks;
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas a administração.' using errcode = '42501';
  end if;
  update public.teleconsult_checks
     set status = case when p_approve then 'aprovado' else 'recusado' end,
         reviewed_at = now(), reviewed_by = auth.uid(),
         rejection_reason = case when p_approve then null else nullif(btrim(p_reason), '') end
   where id = p_check and status = 'em_analise'
  returning * into c;
  if c.id is null then raise exception 'Pedido não encontrado ou já analisado.'; end if;
  if p_approve then
    update public.professionals set teleconsult_approved_at = now() where user_id = c.professional_id;
  end if;
  perform public.notify(c.professional_id,
    case when p_approve then 'teleconsulta_aprovada' else 'teleconsulta_recusada' end,
    null, 'profile', c.professional_id::text,
    jsonb_build_object('reason', c.rejection_reason));
end;
$$;

/** Retira a habilitação (ex.: cadastro vencido). */
create or replace function public.admin_revoke_teleconsult(p_pro uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas a administração.' using errcode = '42501';
  end if;
  update public.professionals set teleconsult_approved_at = null where user_id = p_pro;
end;
$$;

revoke execute on function public.teleconsult_submit(text, text, text) from public, anon;
revoke execute on function public.admin_review_teleconsult(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_revoke_teleconsult(uuid) from public, anon;
grant execute on function public.teleconsult_submit(text, text, text) to authenticated;
grant execute on function public.admin_review_teleconsult(uuid, boolean, text) to authenticated;
grant execute on function public.admin_revoke_teleconsult(uuid) to authenticated;

-- Consulta online só com profissional habilitado (quando a exigência estiver ligada).
create or replace function public.trg_appointment_teleconsult()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.modality = 'online' and not public.pro_online_allowed(new.professional_id) then
    raise exception 'Este profissional ainda não está habilitado para teleconsulta. Escolha o atendimento presencial.';
  end if;
  return new;
end;
$$;
create trigger appointments_teleconsult before insert or update of modality on public.appointments
  for each row execute function public.trg_appointment_teleconsult();

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui os pedidos de habilitação para teleconsulta.
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
