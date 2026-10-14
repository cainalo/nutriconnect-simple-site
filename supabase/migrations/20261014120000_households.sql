-- Grupo familiar "Minha casa" (F1): quem mora junto cria uma casa, convida por código/link (vale 7
-- dias) ou chamando um amigo, e a lista de compras passa a ser da casa, atualizada em tempo real
-- para todos (quem adicionou, quem comprou). Uma casa por pessoa, até 8 pessoas; papéis
-- responsável (gerencia membros e passa o papel) e membro. Nada clínico é compartilhado.
--
-- Lista de compras: item com household_id nulo é pessoal (user_id = dono); com household_id é da
-- casa (user_id = quem adicionou). Enquanto a pessoa está numa casa, o app mostra a lista da casa;
-- os itens pessoais ficam guardados e voltam quando ela sai. Ao sair, o que ela pôs na lista da casa
-- fica com a casa.

-- ---------------------------------------------------------------------------
-- Casas e membros
-- ---------------------------------------------------------------------------
create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 1 and 40),
  emoji text not null default '🏠' check (length(emoji) between 1 and 8),
  created_by uuid references public.profiles (id) on delete set null,
  invite_code text unique check (invite_code ~ '^[A-Z2-9]{6}$'),
  invite_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.household_members (
  -- Uma casa por pessoa.
  user_id uuid primary key references public.profiles (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  role text not null default 'membro' check (role in ('responsavel', 'membro')),
  joined_at timestamptz not null default now()
);
create index household_members_house_idx on public.household_members (household_id);

/** Casa da pessoa (null = não está em nenhuma). */
create or replace function public.my_household_id(p_user uuid default auth.uid())
returns uuid language sql stable security definer set search_path = public as $$
  select household_id from public.household_members where user_id = p_user;
$$;
revoke execute on function public.my_household_id(uuid) from public, anon;
grant execute on function public.my_household_id(uuid) to authenticated;

alter table public.households enable row level security;
create policy "households: membros leem" on public.households
  for select to authenticated using (id = public.my_household_id());

alter table public.household_members enable row level security;
create policy "household_members: membros da casa leem" on public.household_members
  for select to authenticated using (household_id = public.my_household_id());
-- Escrita só pelas funções abaixo.

-- Quando alguém sai (ou a conta é apagada): se era o último, a casa acaba; se era o único
-- responsável, quem está há mais tempo assume.
create or replace function public.trg_household_member_left()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  next_user uuid;
begin
  if not exists (select 1 from public.household_members where household_id = old.household_id) then
    delete from public.households where id = old.household_id;
  elsif not exists (
    select 1 from public.household_members
     where household_id = old.household_id and role = 'responsavel'
  ) then
    select user_id into next_user from public.household_members
     where household_id = old.household_id order by joined_at limit 1;
    update public.household_members set role = 'responsavel' where user_id = next_user;
  end if;
  return null;
end;
$$;
create trigger household_members_left after delete on public.household_members
  for each row execute function public.trg_household_member_left();

-- ---------------------------------------------------------------------------
-- Lista de compras da casa
-- ---------------------------------------------------------------------------
alter table public.shopping_items
  add column household_id uuid references public.households (id) on delete cascade,
  add column bought_by uuid references public.profiles (id) on delete set null;
create index shopping_items_house_idx on public.shopping_items (household_id, created_at desc)
  where household_id is not null;

drop policy "shopping_items: dono lê" on public.shopping_items;
drop policy "shopping_items: dono cria" on public.shopping_items;
drop policy "shopping_items: dono altera" on public.shopping_items;
drop policy "shopping_items: dono apaga" on public.shopping_items;

create policy "shopping_items: dono ou casa lê" on public.shopping_items
  for select to authenticated using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );
create policy "shopping_items: dono ou casa cria" on public.shopping_items
  for insert to authenticated with check (
    user_id = auth.uid()
    and (household_id is null or household_id = public.my_household_id())
  );
create policy "shopping_items: dono ou casa altera" on public.shopping_items
  for update to authenticated
  using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  )
  with check (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );
create policy "shopping_items: dono ou casa apaga" on public.shopping_items
  for delete to authenticated using (
    (household_id is null and user_id = auth.uid())
    or (household_id is not null and household_id = public.my_household_id())
  );

-- Quem adicionou não muda; o item só troca de lista quando o dono leva um item pessoal para a
-- própria casa. "Comprado por" é marcado sozinho.
create or replace function public.trg_shopping_item_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id := old.user_id;
    if not (old.household_id is null and old.user_id = auth.uid()
            and new.household_id = public.my_household_id()) then
      new.household_id := old.household_id;
    end if;
  end if;
  if new.done and not old.done then
    new.bought_by := coalesce(auth.uid(), new.bought_by);
  elsif not new.done then
    new.bought_by := null;
  else
    new.bought_by := old.bought_by;
  end if;
  return new;
end;
$$;
create trigger shopping_items_update before update on public.shopping_items
  for each row execute function public.trg_shopping_item_update();

-- Limite de 200 itens por lista (a pessoal de cada um e a de cada casa).
create or replace function public.shopping_items_limit()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.household_id is null then
    if (select count(*) from public.shopping_items
         where user_id = new.user_id and household_id is null) >= 200 then
      raise exception 'Limite de 200 itens na lista de compras.';
    end if;
  elsif (select count(*) from public.shopping_items where household_id = new.household_id) >= 200 then
    raise exception 'Limite de 200 itens na lista de compras da casa.';
  end if;
  return new;
end;
$$;

-- Tempo real: a lista e os membros se atualizam na tela de todos da casa.
do $$
begin
  alter publication supabase_realtime add table public.shopping_items;
exception when others then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.household_members;
exception when others then null;
end $$;

-- ---------------------------------------------------------------------------
-- Avisos da casa (categoria "social")
-- ---------------------------------------------------------------------------
create or replace function public.notification_category(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('reacao', 'comentario', 'amizade_pedido', 'amizade_aceita', 'seguidor') then 'social'
    when p_type like 'dupla\_%' or p_type like 'casa\_%' then 'social'
    when p_type in ('tema_previa', 'tema_ativo') then 'theme'
    when p_type = 'conquista' then 'achievements'
    when p_type in ('conteudo_oculto', 'conteudo_liberado', 'conta_suspensa', 'conta_reativada') then 'system'
    else 'clinical'
  end;
$$;

-- ---------------------------------------------------------------------------
-- Funções chamadas pelo app
-- ---------------------------------------------------------------------------

/** Código de convite novo (6 letras/números sem os que confundem: 0, O, 1, I). */
create or replace function public._household_code()
returns text language sql volatile as $$
  select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::integer, 1), '')
    from generate_series(1, 6);
$$;
revoke execute on function public._household_code() from public, anon, authenticated;

create or replace function public._household_require(p_role text default null)
returns uuid language plpgsql stable security definer set search_path = public as $$
declare
  hid uuid;
  my_role text;
begin
  if auth.uid() is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  select household_id, role into hid, my_role from public.household_members where user_id = auth.uid();
  if hid is null then raise exception 'Você ainda não está em uma casa.'; end if;
  if p_role is not null and my_role <> p_role then
    raise exception 'Só quem é responsável pela casa pode fazer isso.';
  end if;
  return hid;
end;
$$;
revoke execute on function public._household_require(text) from public, anon, authenticated;

create or replace function public.household_create(p_name text, p_emoji text default '🏠')
returns public.households
language plpgsql security definer set search_path = public as $$
declare
  h public.households;
begin
  if auth.uid() is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  if public.my_household_id() is not null then
    raise exception 'Você já está em uma casa. Saia dela para criar outra.';
  end if;
  insert into public.households (name, emoji, created_by)
  values (btrim(p_name), coalesce(nullif(btrim(p_emoji), ''), '🏠'), auth.uid())
  returning * into h;
  insert into public.household_members (user_id, household_id, role)
  values (auth.uid(), h.id, 'responsavel');
  return h;
end;
$$;

create or replace function public.household_update(p_name text, p_emoji text)
returns public.households
language plpgsql security definer set search_path = public as $$
declare
  h public.households;
begin
  update public.households
     set name = btrim(p_name), emoji = coalesce(nullif(btrim(p_emoji), ''), emoji)
   where id = public._household_require('responsavel')
  returning * into h;
  return h;
end;
$$;

/** Código de convite da casa (gera um novo se não houver ou se venceu; `p_new` troca o atual). */
create or replace function public.household_invite_code(p_new boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  hid uuid := public._household_require();
  h public.households;
  tries integer := 0;
begin
  select * into h from public.households where id = hid for update;
  if p_new or h.invite_code is null or h.invite_expires_at <= now() then
    loop
      begin
        update public.households
           set invite_code = public._household_code(), invite_expires_at = now() + interval '7 days'
         where id = hid returning * into h;
        exit;
      exception when unique_violation then
        tries := tries + 1;
        if tries > 5 then raise; end if;
      end;
    end loop;
  end if;
  return jsonb_build_object('code', h.invite_code, 'expires_at', h.invite_expires_at);
end;
$$;

/** O que a tela de entrada mostra antes de aceitar (sem os nomes de quem mora lá). */
create or replace function public.household_preview(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
           'name', h.name, 'emoji', h.emoji,
           'members', (select count(*) from public.household_members m where m.household_id = h.id))
    from public.households h
   where h.invite_code = upper(btrim(p_code)) and h.invite_expires_at > now()
     and auth.uid() is not null;
$$;

create or replace function public.household_join(p_code text)
returns public.households
language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  h public.households;
  m record;
begin
  if me is null then raise exception 'É preciso estar logado.' using errcode = '42501'; end if;
  select * into h from public.households
   where invite_code = upper(btrim(p_code)) and invite_expires_at > now()
   for update;
  if h.id is null then raise exception 'Código inválido ou vencido. Peça um novo a quem convidou.'; end if;
  if public.my_household_id() = h.id then return h; end if;
  if public.my_household_id() is not null then
    raise exception 'Você já está em uma casa. Saia dela para entrar em outra.';
  end if;
  if (select count(*) from public.household_members where household_id = h.id) >= 8 then
    raise exception 'Esta casa já tem 8 pessoas.';
  end if;
  insert into public.household_members (user_id, household_id) values (me, h.id);
  for m in select user_id from public.household_members where household_id = h.id and user_id <> me loop
    perform public.notify(m.user_id, 'casa_novo_membro', me, 'household', h.id::text,
      jsonb_build_object('house', h.name));
  end loop;
  return h;
end;
$$;

/** Chama um amigo para a casa: ele recebe um aviso com o link de entrada. */
create or replace function public.household_invite_friend(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  hid uuid := public._household_require();
  invite jsonb;
begin
  if not public.are_friends(auth.uid(), p_user) or public.is_blocked_between(auth.uid(), p_user) then
    raise exception 'Dá para chamar pelo app só quem é seu amigo. Para os outros, mande o código.';
  end if;
  if public.my_household_id(p_user) = hid then raise exception 'Essa pessoa já mora nesta casa.'; end if;
  invite := public.household_invite_code(false);
  perform public.notify(p_user, 'casa_convite', auth.uid(), 'household', invite ->> 'code',
    jsonb_build_object('house', (select name from public.households where id = hid)));
end;
$$;

/** Junta os itens da lista pessoal à lista da casa. Devolve quantos foram. */
create or replace function public.household_bring_my_items()
returns integer language plpgsql security definer set search_path = public as $$
declare
  hid uuid := public._household_require();
  n integer;
begin
  update public.shopping_items set household_id = hid
   where user_id = auth.uid() and household_id is null and not done;
  get diagnostics n = row_count;
  return n;
end;
$$;

create or replace function public.household_leave()
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public._household_require();
  delete from public.household_members where user_id = auth.uid();
end;
$$;

create or replace function public.household_remove_member(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  hid uuid := public._household_require('responsavel');
begin
  if p_user = auth.uid() then raise exception 'Para sair, use "Sair da casa".'; end if;
  delete from public.household_members where user_id = p_user and household_id = hid;
  if not found then raise exception 'Essa pessoa não está na casa.'; end if;
end;
$$;

/** Passa o papel de responsável para outra pessoa da casa. */
create or replace function public.household_transfer(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  hid uuid := public._household_require('responsavel');
begin
  if not exists (select 1 from public.household_members where user_id = p_user and household_id = hid) then
    raise exception 'Essa pessoa não está na casa.';
  end if;
  update public.household_members set role = 'responsavel' where user_id = p_user;
  update public.household_members set role = 'membro' where user_id = auth.uid() and p_user <> auth.uid();
end;
$$;

revoke execute on function public.household_create(text, text) from public, anon;
revoke execute on function public.household_update(text, text) from public, anon;
revoke execute on function public.household_invite_code(boolean) from public, anon;
revoke execute on function public.household_preview(text) from public, anon;
revoke execute on function public.household_join(text) from public, anon;
revoke execute on function public.household_invite_friend(uuid) from public, anon;
revoke execute on function public.household_bring_my_items() from public, anon;
revoke execute on function public.household_leave() from public, anon;
revoke execute on function public.household_remove_member(uuid) from public, anon;
revoke execute on function public.household_transfer(uuid) from public, anon;
grant execute on function public.household_create(text, text) to authenticated;
grant execute on function public.household_update(text, text) to authenticated;
grant execute on function public.household_invite_code(boolean) to authenticated;
grant execute on function public.household_preview(text) to authenticated;
grant execute on function public.household_join(text) to authenticated;
grant execute on function public.household_invite_friend(uuid) to authenticated;
grant execute on function public.household_bring_my_items() to authenticated;
grant execute on function public.household_leave() to authenticated;
grant execute on function public.household_remove_member(uuid) to authenticated;
grant execute on function public.household_transfer(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Exportação dos dados (LGPD): inclui a participação na casa.
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
