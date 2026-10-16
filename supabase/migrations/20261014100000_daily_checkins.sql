-- Funções (página /funcoes): os registros do dia que os cards guardavam só no aparelho
-- (hábitos, humor com a comida, compromisso do tema da semana, refeição com calma e quiz) passam
-- a ficar na conta, valendo em todos os aparelhos. São registros pessoais: só a própria pessoa lê
-- e escreve (não aparecem para o profissional).

create table public.daily_checkins (
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Data local da pessoa (vem do aparelho).
  day date not null,
  habits text[] not null default '{}'
    check (habits <@ array['water', 'veg', 'move', 'sleep']::text[]),
  -- 0 ótima, 1 boa, 2 normal, 3 pesada.
  mood smallint check (mood between 0 and 3),
  -- Praticou o compromisso do tema da semana neste dia.
  pledge boolean not null default false,
  -- Refeições com calma (20 minutos) concluídas no dia.
  mindful_meals smallint not null default 0 check (mindful_meals between 0 and 10),
  -- Melhor resultado no quiz no dia (acertos).
  quiz_best smallint check (quiz_best between 0 and 20),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create trigger daily_checkins_updated_at before update on public.daily_checkins
  for each row execute function public.set_updated_at();

alter table public.daily_checkins enable row level security;

create policy "daily_checkins: dono lê" on public.daily_checkins
  for select to authenticated using (user_id = auth.uid());
-- Só a semana corrente pode ser marcada (o compromisso da semana volta até a segunda-feira);
-- o histórico mais antigo não é reescrito.
create policy "daily_checkins: dono cria" on public.daily_checkins
  for insert to authenticated
  with check (user_id = auth.uid() and day between current_date - 7 and current_date + 1);
create policy "daily_checkins: dono altera" on public.daily_checkins
  for update to authenticated
  using (user_id = auth.uid() and day between current_date - 7 and current_date + 1)
  with check (user_id = auth.uid() and day between current_date - 7 and current_date + 1);
create policy "daily_checkins: dono apaga" on public.daily_checkins
  for delete to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui os registros do dia.
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
      ('registros_do_dia', 'daily_checkins', array['user_id'])
    ) as v(label, tbl, cols)
  loop
    result := result || jsonb_build_object(spec.label, public._export_rows(spec.tbl, spec.cols, me));
  end loop;

  return result;
end;
$$;
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
