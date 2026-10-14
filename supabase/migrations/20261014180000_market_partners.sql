-- Compras nos mercados (R1, sugestão de um voluntário na apresentação): botão "Comprar" na receita,
-- na lista de compras e no plano alimentar leva o produto à busca de um mercado/loja parceiro. O
-- endereço de busca de cada parceiro já leva o código de afiliado da plataforma (cadastrado pelo
-- admin), e cada clique é contado para acompanhar as comissões. O app avisa que são links de
-- parceiros (o NutriConnect pode receber comissão).

create table public.market_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 2 and 60),
  -- Endereço de busca com {q} no lugar do produto (e o código de afiliado, se houver).
  search_url text not null check (search_url ~ '^https://[^\s]+$' and position('{q}' in search_url) > 0),
  emoji text not null default '🛒' check (length(emoji) between 1 and 8),
  -- Estados atendidos (vazio = todo o Brasil).
  states text[] not null default '{}',
  active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger market_partners_updated_at before update on public.market_partners
  for each row execute function public.set_updated_at();

alter table public.market_partners enable row level security;
create policy "market_partners: ativos para todos, tudo para o admin" on public.market_partners
  for select to authenticated using (active or public.is_platform_admin());
create policy "market_partners: admin cria" on public.market_partners
  for insert to authenticated with check (public.is_platform_admin());
create policy "market_partners: admin altera" on public.market_partners
  for update to authenticated
  using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "market_partners: admin apaga" on public.market_partners
  for delete to authenticated using (public.is_platform_admin());

create table public.market_clicks (
  id bigserial primary key,
  partner_id uuid not null references public.market_partners (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  source text not null check (source in ('receita', 'lista', 'plano', 'cardapio', 'lancheira', 'outro')),
  query text not null check (length(query) between 1 and 120),
  created_at timestamptz not null default now()
);
create index market_clicks_partner_idx on public.market_clicks (partner_id, created_at desc);

alter table public.market_clicks enable row level security;
create policy "market_clicks: admin lê" on public.market_clicks
  for select to authenticated using (public.is_platform_admin());
-- Gravação pela market_click().

/** Registra o clique e devolve o endereço da busca no parceiro. */
create or replace function public.market_click(p_partner uuid, p_source text, p_query text)
returns text language plpgsql security definer set search_path = public as $$
declare
  pt public.market_partners;
  q text := left(btrim(coalesce(p_query, '')), 120);
begin
  if auth.uid() is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  if q = '' then raise exception 'Informe o produto.'; end if;
  select * into pt from public.market_partners where id = p_partner and active;
  if pt.id is null then raise exception 'Parceiro indisponível.'; end if;
  insert into public.market_clicks (partner_id, user_id, source, query)
  values (pt.id, auth.uid(),
          case when p_source in ('receita', 'lista', 'plano', 'cardapio', 'lancheira') then p_source
               else 'outro' end,
          q);
  -- Codifica o produto para a URL (espaço vira %20).
  return replace(pt.search_url, '{q}',
    (select string_agg(
              case when ch ~ '[A-Za-z0-9._~-]' then ch
                   else (select string_agg('%' || upper(lpad(to_hex(b), 2, '0')), '')
                           from (select get_byte(convert_to(ch, 'UTF8'), i) as b
                                   from generate_series(0, octet_length(convert_to(ch, 'UTF8')) - 1) i) bytes)
              end, '' order by n)
       from regexp_split_to_table(q, '') with ordinality as t(ch, n)));
end;
$$;
revoke execute on function public.market_click(uuid, text, text) from public, anon;
grant execute on function public.market_click(uuid, text, text) to authenticated;

/** Cliques por parceiro nos últimos dias (painel do admin). */
create or replace function public.admin_market_stats(p_days integer default 30)
returns table (partner_id uuid, name text, clicks bigint, people bigint, top_queries text[])
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_platform_admin() then
    raise exception 'Apenas a administração.' using errcode = '42501';
  end if;
  return query
  select p.id, p.name,
         count(c.id),
         count(distinct c.user_id),
         (select array_agg(t.query order by t.n desc) from (
            select c2.query, count(*) as n from public.market_clicks c2
             where c2.partner_id = p.id
               and c2.created_at > now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
             group by c2.query order by count(*) desc limit 5) t)
    from public.market_partners p
    left join public.market_clicks c
      on c.partner_id = p.id
     and c.created_at > now() - make_interval(days => greatest(coalesce(p_days, 30), 1))
   group by p.id, p.name, p.position
   order by count(c.id) desc, p.position;
end;
$$;
revoke execute on function public.admin_market_stats(integer) from public, anon;
grant execute on function public.admin_market_stats(integer) to authenticated;

-- Parceiros iniciais (busca pública; o admin acrescenta o código de afiliado de cada programa).
insert into public.market_partners (name, search_url, emoji, position) values
  ('Mercado Livre', 'https://lista.mercadolivre.com.br/{q}', '🛍️', 1),
  ('Amazon', 'https://www.amazon.com.br/s?k={q}', '📦', 2);

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui os cliques nos parceiros.
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
