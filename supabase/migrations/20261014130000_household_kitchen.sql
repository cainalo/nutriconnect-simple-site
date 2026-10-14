-- Minha casa (F2): a Geladeira sai do navegador e vai para a conta (pessoal ou da casa, em tempo
-- real), e o Cardápio da semana passa a ser um só para a casa (porções = número de moradores).
-- Enquanto a pessoa está numa casa, ela vê a geladeira e o cardápio da casa; os pessoais ficam
-- guardados e voltam quando ela sai.

-- ---------------------------------------------------------------------------
-- Geladeira
-- ---------------------------------------------------------------------------
create table public.fridge_items (
  id uuid primary key default gen_random_uuid(),
  -- Dono do item pessoal, ou quem pôs o item na geladeira da casa.
  user_id uuid not null references public.profiles (id) on delete cascade,
  household_id uuid references public.households (id) on delete cascade,
  text text not null check (length(btrim(text)) between 1 and 40),
  created_at timestamptz not null default now()
);
create unique index fridge_items_personal_key on public.fridge_items (user_id, lower(text))
  where household_id is null;
create unique index fridge_items_house_key on public.fridge_items (household_id, lower(text))
  where household_id is not null;

alter table public.fridge_items enable row level security;
create policy "fridge_items: dono ou casa lê" on public.fridge_items
  for select to authenticated using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );
create policy "fridge_items: dono ou casa cria" on public.fridge_items
  for insert to authenticated with check (
    user_id = auth.uid()
    and (household_id is null or household_id = public.my_household_id())
  );
create policy "fridge_items: dono ou casa apaga" on public.fridge_items
  for delete to authenticated using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );

create or replace function public.fridge_items_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.household_id is null then
    if (select count(*) from public.fridge_items
         where user_id = new.user_id and household_id is null) >= 30 then
      raise exception 'Limite de 30 itens na geladeira.';
    end if;
  elsif (select count(*) from public.fridge_items where household_id = new.household_id) >= 30 then
    raise exception 'Limite de 30 itens na geladeira da casa.';
  end if;
  return new;
end;
$$;
create trigger fridge_items_limit before insert on public.fridge_items
  for each row execute function public.fridge_items_limit();

do $$
begin
  alter publication supabase_realtime add table public.fridge_items;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Cardápio da semana da casa
-- ---------------------------------------------------------------------------
alter table public.weekly_menus
  add column household_id uuid references public.households (id) on delete cascade,
  add column updated_by uuid references public.profiles (id) on delete set null;
alter table public.weekly_menus drop constraint if exists weekly_menus_user_id_week_start_key;
create unique index weekly_menus_personal_key on public.weekly_menus (user_id, week_start)
  where household_id is null;
create unique index weekly_menus_house_key on public.weekly_menus (household_id, week_start)
  where household_id is not null;

drop policy "weekly_menus: dono lê" on public.weekly_menus;
drop policy "weekly_menus: dono cria" on public.weekly_menus;
drop policy "weekly_menus: dono altera" on public.weekly_menus;
drop policy "weekly_menus: dono apaga" on public.weekly_menus;
create policy "weekly_menus: dono ou casa lê" on public.weekly_menus
  for select to authenticated using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );
create policy "weekly_menus: dono cria" on public.weekly_menus
  for insert to authenticated with check (user_id = auth.uid() and household_id is null);
create policy "weekly_menus: dono altera" on public.weekly_menus
  for update to authenticated
  using (user_id = auth.uid() and household_id is null)
  with check (user_id = auth.uid() and household_id is null);
create policy "weekly_menus: dono ou casa apaga" on public.weekly_menus
  for delete to authenticated using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );

create or replace function public.weekly_menus_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.household_id is null then
    if (select count(*) from public.weekly_menus
         where user_id = new.user_id and household_id is null) >= 120 then
      raise exception 'Limite de 120 cardápios guardados.';
    end if;
  elsif (select count(*) from public.weekly_menus where household_id = new.household_id) >= 120 then
    raise exception 'Limite de 120 cardápios guardados na casa.';
  end if;
  return new;
end;
$$;

/** Grava o cardápio da semana: o da casa, se a pessoa mora numa, ou o pessoal. */
create or replace function public.weekly_menu_save(p_week date, p_budget text, p_meals jsonb)
returns public.weekly_menus
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  hid uuid := public.my_household_id();
  m public.weekly_menus;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  if hid is null then
    update public.weekly_menus set budget = p_budget, meals = p_meals, updated_by = me
     where user_id = me and household_id is null and week_start = p_week
    returning * into m;
    if m.id is null then
      insert into public.weekly_menus (user_id, week_start, budget, meals, updated_by)
      values (me, p_week, p_budget, p_meals, me) returning * into m;
    end if;
  else
    update public.weekly_menus set budget = p_budget, meals = p_meals, updated_by = me
     where household_id = hid and week_start = p_week
    returning * into m;
    if m.id is null then
      insert into public.weekly_menus (user_id, household_id, week_start, budget, meals, updated_by)
      values (me, hid, p_week, p_budget, p_meals, me) returning * into m;
    end if;
  end if;
  return m;
end;
$$;
revoke execute on function public.weekly_menu_save(date, text, jsonb) from public, anon;
grant execute on function public.weekly_menu_save(date, text, jsonb) to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.weekly_menus;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Levar para a casa: a lista de compras (não comprados) e a geladeira pessoal.
-- ---------------------------------------------------------------------------
create or replace function public.household_bring_my_items()
returns integer language plpgsql security definer set search_path = public as $$
declare
  hid uuid := public._household_require();
  n integer;
  f integer;
begin
  update public.shopping_items set household_id = hid
   where user_id = auth.uid() and household_id is null and not done;
  get diagnostics n = row_count;
  -- Só o que ainda cabe (e não repete) na geladeira da casa.
  insert into public.fridge_items (user_id, household_id, text)
  select auth.uid(), hid, p.text from public.fridge_items p
   where p.user_id = auth.uid() and p.household_id is null
     and not exists (select 1 from public.fridge_items h
                      where h.household_id = hid and lower(h.text) = lower(p.text))
   order by p.created_at
   limit greatest(0, 30 - (select count(*) from public.fridge_items where household_id = hid))
  on conflict do nothing;
  get diagnostics f = row_count;
  delete from public.fridge_items where user_id = auth.uid() and household_id is null;
  return n + f;
end;
$$;

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui a geladeira.
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
