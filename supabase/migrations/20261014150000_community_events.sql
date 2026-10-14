-- Eventos ao vivo nas comunidades (M8): "Pergunte à nutri". O profissional verificado que
-- administra a comunidade marca um evento (data, hora e duração); os membros mandam perguntas antes
-- e durante, votam nas dos outros, e o profissional responde e fixa as respostas. Tudo em tempo real.
-- Proteções: só quem participa da comunidade vê e pergunta; até 3 perguntas por pessoa por evento;
-- o profissional oculta perguntas, e 3 denúncias de membros ocultam a pergunta sozinhas.

create table public.community_events (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities (id) on delete cascade,
  host_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (length(btrim(title)) between 3 and 120),
  description text not null default '' check (length(description) <= 1000),
  starts_at timestamptz not null,
  duration_min smallint not null default 60 check (duration_min between 15 and 180),
  canceled boolean not null default false,
  created_at timestamptz not null default now()
);
create index community_events_community_idx on public.community_events (community_id, starts_at desc);

/** Quem participa (ou administra) a comunidade do evento. */
create or replace function public.event_can_view(p_event uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_events e
     where e.id = p_event
       and public.community_is_visible(e.community_id, p_user)
       and (public.is_community_member(e.community_id, p_user)
            or public.is_community_admin(e.community_id, p_user)
            or public.is_platform_admin(p_user))
  );
$$;
revoke execute on function public.event_can_view(uuid, uuid) from public, anon;
grant execute on function public.event_can_view(uuid, uuid) to authenticated;

alter table public.community_events enable row level security;
create policy "community_events: participantes leem" on public.community_events
  for select to authenticated using (public.event_can_view(id));
-- Escrita pelas funções abaixo.

create table public.event_questions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.community_events (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) between 5 and 300),
  answer text check (length(answer) <= 2000),
  answered_at timestamptz,
  pinned boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index event_questions_event_idx on public.event_questions (event_id);

create table public.event_question_votes (
  question_id uuid not null references public.event_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Repetido aqui para o tempo real filtrar por evento.
  event_id uuid not null references public.community_events (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

create table public.event_question_flags (
  question_id uuid not null references public.event_questions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (question_id, user_id)
);

/** É quem conduz o evento da pergunta. */
create or replace function public.event_is_host(p_event uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_events where id = p_event and host_id = p_user);
$$;
revoke execute on function public.event_is_host(uuid, uuid) from public, anon;
grant execute on function public.event_is_host(uuid, uuid) to authenticated;

alter table public.event_questions enable row level security;
create policy "event_questions: participantes leem" on public.event_questions
  for select to authenticated using (
    public.event_can_view(event_id)
    and (not hidden or author_id = auth.uid() or public.event_is_host(event_id))
  );
alter table public.event_question_votes enable row level security;
create policy "event_question_votes: participantes leem" on public.event_question_votes
  for select to authenticated using (public.event_can_view(event_id));
alter table public.event_question_flags enable row level security;
create policy "event_question_flags: dono lê" on public.event_question_flags
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Avisos (categoria "social")
-- ---------------------------------------------------------------------------
create or replace function public.notification_category(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('reacao', 'comentario', 'amizade_pedido', 'amizade_aceita', 'seguidor') then 'social'
    when p_type like 'dupla\_%' or p_type like 'casa\_%' or p_type like 'evento\_%' then 'social'
    when p_type in ('tema_previa', 'tema_ativo') then 'theme'
    when p_type = 'conquista' then 'achievements'
    when p_type in ('conteudo_oculto', 'conteudo_liberado', 'conta_suspensa', 'conta_reativada') then 'system'
    else 'clinical'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

create or replace function public.event_create(
  p_community uuid, p_title text, p_description text, p_starts_at timestamptz, p_duration integer
)
returns public.community_events
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e public.community_events;
  c public.communities;
  m record;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  select * into c from public.communities where id = p_community;
  if c.id is null or c.professional_id is distinct from me or not public.is_verified_professional(me) then
    raise exception 'Só o profissional que administra a comunidade marca eventos.';
  end if;
  if c.status <> 'ativa' then raise exception 'A comunidade está pausada.'; end if;
  if p_starts_at < now() - interval '5 minutes' then
    raise exception 'Escolha uma data a partir de agora.';
  end if;
  if (select count(*) from public.community_events
       where community_id = p_community and not canceled
         and starts_at + make_interval(mins => duration_min) > now()) >= 5 then
    raise exception 'A comunidade já tem 5 eventos marcados.';
  end if;
  insert into public.community_events (community_id, host_id, title, description, starts_at, duration_min)
  values (p_community, me, btrim(p_title), coalesce(btrim(p_description), ''), p_starts_at,
          coalesce(p_duration, 60))
  returning * into e;
  -- Avisa quem participa.
  for m in select user_id from public.community_members
            where community_id = p_community and user_id <> me limit 5000 loop
    perform public.notify(m.user_id, 'evento_novo', me, 'community_event', e.id::text,
      jsonb_build_object('title', e.title, 'community', c.name, 'starts_at', e.starts_at));
  end loop;
  return e;
end;
$$;

create or replace function public.event_cancel(p_event uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.community_events set canceled = true where id = p_event and host_id = auth.uid();
  if not found then raise exception 'Evento não encontrado.'; end if;
end;
$$;

create or replace function public.event_ask(p_event uuid, p_body text)
returns public.event_questions
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  e public.community_events;
  q public.event_questions;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  select * into e from public.community_events where id = p_event;
  if e.id is null or not public.event_can_view(p_event) then
    raise exception 'Entre na comunidade para perguntar.';
  end if;
  if e.canceled then raise exception 'Este evento foi cancelado.'; end if;
  if now() > e.starts_at + make_interval(mins => e.duration_min) then
    raise exception 'O evento já terminou.';
  end if;
  if (select count(*) from public.event_questions where event_id = p_event and author_id = me) >= 3 then
    raise exception 'Você já mandou 3 perguntas para este evento.';
  end if;
  insert into public.event_questions (event_id, author_id, body)
  values (p_event, me, btrim(p_body)) returning * into q;
  return q;
end;
$$;

/** Vota (ou tira o voto) numa pergunta. Devolve true se ficou votada. */
create or replace function public.event_vote(p_question uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  q public.event_questions;
begin
  select * into q from public.event_questions where id = p_question;
  if q.id is null or not public.event_can_view(q.event_id) or q.hidden then
    raise exception 'Pergunta não encontrada.';
  end if;
  if q.author_id = me then raise exception 'Não dá para votar na própria pergunta.'; end if;
  delete from public.event_question_votes where question_id = p_question and user_id = me;
  if found then return false; end if;
  insert into public.event_question_votes (question_id, user_id, event_id)
  values (p_question, me, q.event_id);
  return true;
end;
$$;

/** O profissional responde (e fixa a resposta, se quiser). */
create or replace function public.event_answer(p_question uuid, p_answer text, p_pin boolean default true)
returns void language plpgsql security definer set search_path = public as $$
declare
  q public.event_questions;
begin
  select * into q from public.event_questions where id = p_question;
  if q.id is null or not public.event_is_host(q.event_id) then
    raise exception 'Só quem conduz o evento responde.';
  end if;
  update public.event_questions
     set answer = nullif(btrim(p_answer), ''),
         answered_at = case when nullif(btrim(p_answer), '') is null then null else now() end,
         pinned = coalesce(p_pin, pinned)
   where id = p_question;
  if nullif(btrim(p_answer), '') is not null and q.answer is null then
    perform public.notify(q.author_id, 'evento_resposta', auth.uid(), 'community_event', q.event_id::text,
      jsonb_build_object('question', left(q.body, 120)));
  end if;
end;
$$;

create or replace function public.event_moderate(p_question uuid, p_pinned boolean, p_hidden boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  q public.event_questions;
begin
  select * into q from public.event_questions where id = p_question;
  if q.id is null or not public.event_is_host(q.event_id) then
    raise exception 'Só quem conduz o evento faz isso.';
  end if;
  update public.event_questions
     set pinned = coalesce(p_pinned, pinned), hidden = coalesce(p_hidden, hidden)
   where id = p_question;
end;
$$;

/** Denuncia uma pergunta; com 3 denúncias ela some para todos (o profissional ainda vê). */
create or replace function public.event_flag(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  q public.event_questions;
begin
  select * into q from public.event_questions where id = p_question;
  if q.id is null or not public.event_can_view(q.event_id) then
    raise exception 'Pergunta não encontrada.';
  end if;
  if q.author_id = me then raise exception 'Não dá para denunciar a própria pergunta.'; end if;
  insert into public.event_question_flags (question_id, user_id) values (p_question, me)
  on conflict do nothing;
  if (select count(*) from public.event_question_flags where question_id = p_question) >= 3 then
    update public.event_questions set hidden = true, pinned = false where id = p_question;
  end if;
end;
$$;

/** Apaga a própria pergunta enquanto não foi respondida. */
create or replace function public.event_delete_question(p_question uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from public.event_questions
   where id = p_question and author_id = auth.uid() and answer is null;
  if not found then raise exception 'Só dá para apagar a própria pergunta antes da resposta.'; end if;
end;
$$;

/** Perguntas do evento com os votos: fixadas primeiro, depois as mais votadas. */
create or replace function public.event_questions_list(p_event uuid)
returns table (
  id uuid, author_id uuid, body text, answer text, answered_at timestamptz,
  pinned boolean, hidden boolean, created_at timestamptz, votes integer, voted boolean
)
language sql stable security definer set search_path = public as $$
  select q.id, q.author_id, q.body, q.answer, q.answered_at, q.pinned, q.hidden, q.created_at,
         (select count(*)::integer from public.event_question_votes v where v.question_id = q.id),
         exists (select 1 from public.event_question_votes v
                  where v.question_id = q.id and v.user_id = auth.uid())
    from public.event_questions q
   where q.event_id = p_event
     and public.event_can_view(p_event)
     and (not q.hidden or q.author_id = auth.uid() or public.event_is_host(p_event))
   order by q.pinned desc,
            (select count(*) from public.event_question_votes v where v.question_id = q.id) desc,
            q.created_at;
$$;

revoke execute on function public.event_create(uuid, text, text, timestamptz, integer) from public, anon;
revoke execute on function public.event_cancel(uuid) from public, anon;
revoke execute on function public.event_ask(uuid, text) from public, anon;
revoke execute on function public.event_vote(uuid) from public, anon;
revoke execute on function public.event_answer(uuid, text, boolean) from public, anon;
revoke execute on function public.event_moderate(uuid, boolean, boolean) from public, anon;
revoke execute on function public.event_flag(uuid) from public, anon;
revoke execute on function public.event_delete_question(uuid) from public, anon;
revoke execute on function public.event_questions_list(uuid) from public, anon;
grant execute on function public.event_create(uuid, text, text, timestamptz, integer) to authenticated;
grant execute on function public.event_cancel(uuid) to authenticated;
grant execute on function public.event_ask(uuid, text) to authenticated;
grant execute on function public.event_vote(uuid) to authenticated;
grant execute on function public.event_answer(uuid, text, boolean) to authenticated;
grant execute on function public.event_moderate(uuid, boolean, boolean) to authenticated;
grant execute on function public.event_flag(uuid) to authenticated;
grant execute on function public.event_delete_question(uuid) to authenticated;
grant execute on function public.event_questions_list(uuid) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.event_questions;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.event_question_votes;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): perguntas e votos nos eventos.
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
