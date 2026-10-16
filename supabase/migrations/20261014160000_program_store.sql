-- Loja de programas dos profissionais (N10): o profissional (a partir do nível 3, como o perfil de
-- membros) monta um programa em módulos (ex.: "4 semanas de lanches sem ultraprocessados") e vende
-- com pagamento único no Stripe Connect. A taxa da plataforma é a mesma das assinaturas de membros
-- (pro_membership_fee_percent: de 20% a 10% pelo nível). Quem compra acessa os módulos e marca o
-- que já fez. A compra é gravada pelo webhook do Stripe (service_role).

insert into public.pro_features (feature, min_level, description) values
  ('loja_programas', 3, 'Vender programas na loja (pagamento único)')
on conflict (feature) do nothing;

create table public.pro_programs (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid not null references public.professionals (user_id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 100),
  summary text not null default '' check (length(summary) <= 300),
  description text not null default '' check (length(description) <= 4000),
  -- Entre R$ 10 e R$ 1.000.
  price_cents integer not null check (price_cents between 1000 and 100000),
  duration_weeks smallint not null default 4 check (duration_weeks between 1 and 52),
  emoji text not null default '🥗' check (length(emoji) between 1 and 8),
  active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pro_programs_pro_idx on public.pro_programs (professional_id);
create trigger pro_programs_updated_at before update on public.pro_programs
  for each row execute function public.set_updated_at();

create table public.program_modules (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pro_programs (id) on delete cascade,
  position smallint not null default 0,
  title text not null check (length(btrim(title)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 8000),
  created_at timestamptz not null default now()
);
create index program_modules_program_idx on public.program_modules (program_id, position);

create table public.program_purchases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.pro_programs (id) on delete cascade,
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  professional_id uuid not null references public.professionals (user_id) on delete cascade,
  status text not null default 'paga' check (status in ('paga', 'reembolsada')),
  amount_cents integer not null check (amount_cents > 0),
  platform_fee_cents integer not null check (platform_fee_cents >= 0),
  fee_percent integer not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  paid_at timestamptz not null default now(),
  refunded_at timestamptz
);
create unique index program_purchases_paid_idx on public.program_purchases (program_id, buyer_id)
  where status = 'paga';
create index program_purchases_buyer_idx on public.program_purchases (buyer_id);
create index program_purchases_pro_idx on public.program_purchases (professional_id, paid_at desc);

create table public.program_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  module_id uuid not null references public.program_modules (id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (user_id, module_id)
);

/** Comprou (e não foi estornado). */
create or replace function public.has_program(p_program uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.program_purchases
     where program_id = p_program and buyer_id = p_user and status = 'paga'
  );
$$;
revoke execute on function public.has_program(uuid, uuid) from public, anon;
grant execute on function public.has_program(uuid, uuid) to authenticated;

alter table public.pro_programs enable row level security;
create policy "pro_programs: vitrine, dono, compradores e admin leem" on public.pro_programs
  for select to authenticated using (
    (active and not public.is_blocked_between(professional_id, auth.uid()))
    or professional_id = auth.uid()
    or public.has_program(id)
    or public.is_platform_admin()
  );

alter table public.program_modules enable row level security;
create policy "program_modules: dono, compradores e admin leem" on public.program_modules
  for select to authenticated using (
    exists (select 1 from public.pro_programs p
             where p.id = program_id and (p.professional_id = auth.uid() or public.is_platform_admin()))
    or public.has_program(program_id)
  );

alter table public.program_purchases enable row level security;
create policy "program_purchases: partes e admin leem" on public.program_purchases
  for select to authenticated
  using (buyer_id = auth.uid() or professional_id = auth.uid() or public.is_platform_admin());
-- Escrita só pelo service_role (webhook).

alter table public.program_progress enable row level security;
create policy "program_progress: dono lê" on public.program_progress
  for select to authenticated using (user_id = auth.uid());
create policy "program_progress: dono marca" on public.program_progress
  for insert to authenticated with check (
    user_id = auth.uid()
    and public.has_program((select program_id from public.program_modules where id = module_id))
  );
create policy "program_progress: dono desmarca" on public.program_progress
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Funções do profissional
-- ---------------------------------------------------------------------------

/** Cria (p_id nulo) ou altera um programa. Ativar exige ao menos um módulo. */
create or replace function public.save_program(
  p_id uuid, p_title text, p_summary text, p_description text, p_price_cents integer,
  p_weeks integer, p_emoji text, p_active boolean
)
returns public.pro_programs
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  pr public.pro_programs;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  if not public.pro_has_feature(me, 'loja_programas') then
    raise exception 'A loja de programas é liberada a partir do nível 3.';
  end if;
  if p_id is null then
    if (select count(*) from public.pro_programs where professional_id = me) >= 20 then
      raise exception 'Limite de 20 programas.';
    end if;
    insert into public.pro_programs (professional_id, title, summary, description, price_cents,
                                     duration_weeks, emoji, active)
    values (me, btrim(p_title), coalesce(btrim(p_summary), ''), coalesce(btrim(p_description), ''),
            p_price_cents, coalesce(p_weeks, 4), coalesce(nullif(btrim(p_emoji), ''), '🥗'), false)
    returning * into pr;
  else
    update public.pro_programs
       set title = btrim(p_title), summary = coalesce(btrim(p_summary), ''),
           description = coalesce(btrim(p_description), ''), price_cents = p_price_cents,
           duration_weeks = coalesce(p_weeks, duration_weeks),
           emoji = coalesce(nullif(btrim(p_emoji), ''), emoji)
     where id = p_id and professional_id = me
    returning * into pr;
    if pr.id is null then raise exception 'Programa não encontrado.'; end if;
  end if;
  if coalesce(p_active, false) <> pr.active then
    if p_active and not exists (select 1 from public.program_modules where program_id = pr.id) then
      raise exception 'Adicione ao menos um módulo antes de colocar o programa na loja.';
    end if;
    update public.pro_programs set active = coalesce(p_active, false) where id = pr.id returning * into pr;
  end if;
  return pr;
end;
$$;

create or replace function public.save_program_module(
  p_program uuid, p_id uuid, p_title text, p_body text, p_position integer
)
returns public.program_modules
language plpgsql security definer set search_path = public as $$
declare
  m public.program_modules;
begin
  if not exists (select 1 from public.pro_programs where id = p_program and professional_id = auth.uid()) then
    raise exception 'Programa não encontrado.';
  end if;
  if p_id is null then
    if (select count(*) from public.program_modules where program_id = p_program) >= 60 then
      raise exception 'Limite de 60 módulos por programa.';
    end if;
    insert into public.program_modules (program_id, title, body, position)
    values (p_program, btrim(p_title), btrim(p_body),
            coalesce(p_position, (select coalesce(max(position), -1) + 1 from public.program_modules
                                   where program_id = p_program)))
    returning * into m;
  else
    update public.program_modules
       set title = btrim(p_title), body = btrim(p_body), position = coalesce(p_position, position)
     where id = p_id and program_id = p_program
    returning * into m;
    if m.id is null then raise exception 'Módulo não encontrado.'; end if;
  end if;
  return m;
end;
$$;

create or replace function public.delete_program_module(p_module uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  pid uuid;
begin
  select m.program_id into pid from public.program_modules m
    join public.pro_programs p on p.id = m.program_id
   where m.id = p_module and p.professional_id = auth.uid();
  if pid is null then raise exception 'Módulo não encontrado.'; end if;
  delete from public.program_modules where id = p_module;
  -- Programa sem módulos sai da loja.
  if not exists (select 1 from public.program_modules where program_id = pid) then
    update public.pro_programs set active = false where id = pid;
  end if;
end;
$$;

/** Vendas do profissional nos últimos dias (para o painel). */
create or replace function public.my_program_sales(p_days integer default 30)
returns table (sales integer, gross_cents bigint, fee_cents bigint, net_cents bigint)
language sql stable security definer set search_path = public as $$
  select count(*)::integer, coalesce(sum(amount_cents), 0), coalesce(sum(platform_fee_cents), 0),
         coalesce(sum(amount_cents - platform_fee_cents), 0)
    from public.program_purchases
   where professional_id = auth.uid() and status = 'paga'
     and paid_at > now() - make_interval(days => greatest(coalesce(p_days, 30), 1));
$$;

-- ---------------------------------------------------------------------------
-- Gravação da compra (só o webhook, com o service_role)
-- ---------------------------------------------------------------------------
create or replace function public.record_program_purchase(
  p_program uuid, p_buyer uuid, p_amount_cents integer, p_fee_cents integer, p_fee_percent integer,
  p_stripe_session text, p_payment_intent text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  pr public.pro_programs;
begin
  select * into pr from public.pro_programs where id = p_program;
  if pr.id is null then return; end if;
  insert into public.program_purchases (program_id, buyer_id, professional_id, amount_cents,
                                        platform_fee_cents, fee_percent, stripe_session_id,
                                        stripe_payment_intent)
  values (p_program, p_buyer, pr.professional_id, p_amount_cents, p_fee_cents, p_fee_percent,
          p_stripe_session, p_payment_intent)
  on conflict do nothing;
  if found then
    perform public.notify(pr.professional_id, 'programa_vendido', p_buyer, 'program', pr.id::text,
      jsonb_build_object('title', pr.title));
  end if;
end;
$$;
revoke execute on function public.record_program_purchase(uuid, uuid, integer, integer, integer, text, text)
  from public, anon, authenticated;

revoke execute on function public.save_program(uuid, text, text, text, integer, integer, text, boolean) from public, anon;
revoke execute on function public.save_program_module(uuid, uuid, text, text, integer) from public, anon;
revoke execute on function public.delete_program_module(uuid) from public, anon;
revoke execute on function public.my_program_sales(integer) from public, anon;
grant execute on function public.save_program(uuid, text, text, text, integer, integer, text, boolean) to authenticated;
grant execute on function public.save_program_module(uuid, uuid, text, text, integer) to authenticated;
grant execute on function public.delete_program_module(uuid) to authenticated;
grant execute on function public.my_program_sales(integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): compras, progresso e programas criados.
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
