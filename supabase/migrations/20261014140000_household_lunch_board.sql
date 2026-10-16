-- Minha casa (F3): os adultos da casa veem e montam as lancheiras das crianças de qualquer
-- morador (o perfil infantil continua de quem o criou), e a casa ganha um mural de recados curtos
-- ("hoje janto fora", "sobrou arroz"), em tempo real.

-- ---------------------------------------------------------------------------
-- Lancheiras compartilhadas na casa
-- ---------------------------------------------------------------------------

/** Perfil infantil meu ou de alguém que mora comigo. */
create or replace function public.kid_lunch_access(p_profile uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trail_profiles t
     where t.id = p_profile and t.kind = 'kid'
       and (t.owner_id = auth.uid()
            or (public.my_household_id() is not null
                and public.my_household_id(t.owner_id) = public.my_household_id()))
  );
$$;
revoke execute on function public.kid_lunch_access(uuid) from public, anon;
grant execute on function public.kid_lunch_access(uuid) to authenticated;

drop policy "lunchbox_profiles: responsável" on public.lunchbox_profiles;
create policy "lunchbox_profiles: responsável ou casa" on public.lunchbox_profiles
  for all to authenticated
  using (public.kid_lunch_access(profile_id))
  with check (public.kid_lunch_access(profile_id));

drop policy "lunchboxes: responsável" on public.lunchboxes;
create policy "lunchboxes: responsável ou casa" on public.lunchboxes
  for all to authenticated
  using (public.kid_lunch_access(profile_id))
  with check (public.kid_lunch_access(profile_id));

-- A lancheira é sempre de quem criou o perfil da criança, mesmo quando outro adulto da casa monta.
create or replace function public.trg_lunch_owner()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.owner_id := (select owner_id from public.trail_profiles where id = new.profile_id);
  return new;
end;
$$;
create trigger lunchbox_profiles_owner before insert or update on public.lunchbox_profiles
  for each row execute function public.trg_lunch_owner();
create trigger lunchboxes_owner before insert or update on public.lunchboxes
  for each row execute function public.trg_lunch_owner();

/** Crianças dos outros moradores (nome e personagem), para a Lancheira da casa. */
create or replace function public.household_kids()
returns table (id uuid, name text, avatar text, owner_id uuid)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.avatar, t.owner_id
    from public.trail_profiles t
    join public.household_members m on m.user_id = t.owner_id
   where t.kind = 'kid'
     and m.household_id = public.my_household_id()
     and t.owner_id <> auth.uid()
   order by t.created_at;
$$;
revoke execute on function public.household_kids() from public, anon;
grant execute on function public.household_kids() to authenticated;

-- ---------------------------------------------------------------------------
-- Mural da casa
-- ---------------------------------------------------------------------------
create table public.household_notes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (length(btrim(body)) between 1 and 200),
  created_at timestamptz not null default now()
);
create index household_notes_house_idx on public.household_notes (household_id, created_at desc);

alter table public.household_notes enable row level security;
create policy "household_notes: moradores leem" on public.household_notes
  for select to authenticated using (household_id = public.my_household_id());
create policy "household_notes: moradores escrevem" on public.household_notes
  for insert to authenticated
  with check (household_id = public.my_household_id() and author_id = auth.uid());
-- Apaga o próprio recado; o responsável apaga qualquer um.
create policy "household_notes: autor ou responsável apaga" on public.household_notes
  for delete to authenticated using (
    household_id = public.my_household_id()
    and (author_id = auth.uid()
         or exists (select 1 from public.household_members
                     where user_id = auth.uid() and role = 'responsavel'))
  );

-- O mural guarda os 100 recados mais recentes.
create or replace function public.trg_household_notes_trim()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.household_notes
   where household_id = new.household_id
     and id not in (select id from public.household_notes
                     where household_id = new.household_id
                     order by created_at desc limit 100);
  return null;
end;
$$;
create trigger household_notes_trim after insert on public.household_notes
  for each row execute function public.trg_household_notes_trim();

do $$
begin
  alter publication supabase_realtime add table public.household_notes;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui os recados do mural.
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
