-- =============================================================================
-- Testes de segurança da rede social (RLS, RPCs e privacidade).
--
-- Como rodar (nada é gravado: tudo acontece numa transação que é desfeita):
--   npx supabase db query --linked -f supabase/tests/social_security.sql
--
-- O script cria usuários de teste, simula cada papel (anon / authenticated com
-- um uid) e termina de propósito com um erro "RESULTADOS: [...]" que contém o
-- relatório em JSON. O erro faz o Postgres desfazer tudo (rollback).
-- Cada item tem { teste, ok, obtido }. ok = false indica um furo ou regressão.
-- =============================================================================

do $test$
declare
  a uuid := 'ffffffff-0000-4000-a000-00000000000a'; -- usuário comum
  b uuid := 'ffffffff-0000-4000-a000-00000000000b'; -- amigo de A
  c uuid := 'ffffffff-0000-4000-a000-00000000000c'; -- perfil PRIVADO
  d uuid := 'ffffffff-0000-4000-a000-00000000000d'; -- bloqueado por A
  e uuid := 'ffffffff-0000-4000-a000-00000000000e'; -- usado no fluxo de pedido
  f uuid := 'ffffffff-0000-4000-a000-00000000000f'; -- estranho
  p uuid := 'ffffffff-0000-4000-a000-000000000010'; -- profissional verificado
  post_amigos uuid;
  post_publico_c uuid;
  post_oculto uuid;
  post_f uuid;
  post_p uuid;
  q uuid := 'ffffffff-0000-4000-a000-000000000011'; -- profissional que atua no tema da comunidade
  cid uuid;
  cid2 uuid;
  ch uuid;
  tp uuid;
  th uuid;
  th_old uuid;
  th_prev uuid;
  opt1 uuid;
  opt2 uuid;
  kid uuid := 'ffffffff-0000-4000-a000-0000000000b1';
  g uuid := 'ffffffff-0000-4000-a000-000000000012'; -- admin da plataforma
  res jsonb := '[]'::jsonb;
  r text;
  tbl text;
begin
  -- Executa sql como um papel. SELECT devolve as linhas em texto; DML devolve OK:<linhas>.
  create function pg_temp.as_user(uid uuid, rl text, q text) returns text language plpgsql as $f$
  declare outv text; n bigint;
  begin
    perform set_config('request.jwt.claims',
      case when uid is null then '' else json_build_object('sub', uid, 'role', rl)::text end, true);
    perform set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
    execute format('set local role %I', rl);
    begin
      if lower(left(trim(q), 6)) = 'select' then
        -- x::text devolve "(valor)"; os parênteses externos são removidos para comparar o valor puro.
        execute format('select coalesce(string_agg(regexp_replace(x::text, ''^\((.*)\)$'', ''\1''), '' | ''), ''<vazio>'') from (%s) x', q) into outv;
      else
        execute q;
        get diagnostics n = row_count;
        outv := 'OK:' || n;
      end if;
    exception when others then
      outv := 'ERRO: ' || sqlerrm;
    end;
    reset role;
    -- Sem sessão depois da chamada: as inserções diretas do teste valem como a plataforma (sem a trava de IA).
    perform set_config('request.jwt.claims', '', true);
    perform set_config('request.jwt.claim.sub', '', true);
    return outv;
  end $f$;

  -- ---------------------------------------------------------------- dados
  insert into auth.users (id, aud, role, email, raw_user_meta_data) values
    (a, 'authenticated', 'authenticated', 'zzqx.a@teste.invalid', '{"name":"Zzqx Alice","birth_date":"1990-01-01","goal":"Objetivo secreto A"}'),
    (b, 'authenticated', 'authenticated', 'zzqx.b@teste.invalid', '{"name":"Zzqx Bruno","birth_date":"1990-01-01"}'),
    (c, 'authenticated', 'authenticated', 'zzqx.c@teste.invalid', '{"name":"Zzqx Carla","birth_date":"1990-01-01","goal":"Objetivo privado da Carla"}'),
    (d, 'authenticated', 'authenticated', 'zzqx.d@teste.invalid', '{"name":"Zzqx Daniel","birth_date":"1990-01-01"}'),
    (e, 'authenticated', 'authenticated', 'zzqx.e@teste.invalid', '{"name":"Zzqx Eva","birth_date":"1990-01-01"}'),
    (f, 'authenticated', 'authenticated', 'zzqx.f@teste.invalid', '{"name":"Zzqx Fabio","birth_date":"1990-01-01"}'),
    (p, 'authenticated', 'authenticated', 'zzqx.p@teste.invalid', '{"name":"Zzqxprof Hélena","birth_date":"1990-01-01"}');
  insert into public.professionals (user_id, profession, council, registration, uf)
    values (p, 'Nutricionista', 'CRN-3', 'TESTE', 'SP');
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values (q, 'authenticated', 'authenticated', 'zzqx.q@teste.invalid', '{"name":"Zzqxprof Quirino","birth_date":"1990-01-01"}');
  insert into public.professionals (user_id, profession, council, registration, uf, specialties)
    values (q, 'Nutricionista', 'CRN-3', 'TESTE2', 'SP', array['Zzqx Tema']);
  insert into auth.users (id, aud, role, email, raw_user_meta_data)
    values (g, 'authenticated', 'authenticated', 'zzqx.g@teste.invalid', '{"name":"Zzqx Gestora","birth_date":"1990-01-01"}');
  insert into public.platform_admins (user_id) values (g);
  update public.profiles set is_private = true, bio = 'Bio privada da Carla' where id = c;
  insert into public.friendships (requester_id, addressee_id, status) values
    (a, b, 'aceita'), (b, c, 'aceita');
  insert into public.blocks (blocker_id, blocked_id) values (a, d);
  insert into public.care_links (patient_id, professional_id) values (c, p); -- p atende c (pendente)

  insert into public.posts (author_id, body, audience) values (a, 'post só para amigos de A', 'amigos')
    returning id into post_amigos;
  insert into public.posts (author_id, body, audience) values (c, 'post público de perfil privado', 'publico')
    returning id into post_publico_c;
  insert into public.posts (author_id, body, hidden) values (b, 'post oculto por moderação', false)
    returning id into post_oculto;
  update public.posts set hidden = true where id = post_oculto;
  insert into public.posts (author_id, body) values (f, 'post público de F') returning id into post_f;
  insert into public.posts (author_id, body) values (p, 'post público do profissional') returning id into post_p;
  insert into public.comments (post_id, author_id, body) values (post_f, c, 'comentário da Carla (perfil privado)');

  -- --------------------------------------------------------------- ANÔNIMO
  foreach tbl in array array['profile_private','professionals','posts','comments','friendships',
                             'follows','blocks','notifications','user_settings','post_reactions',
                             'saved_posts','care_links','messages','reports','profiles',
                             'professional_directory'] loop
    r := pg_temp.as_user(null, 'anon', format('select * from public.%I limit 3', tbl));
    res := res || jsonb_build_object('teste', 'anon não lê ' || tbl,
      'ok', (r = '<vazio>' or r like 'ERRO%'), 'obtido', left(r, 80));
  end loop;

  r := pg_temp.as_user(null, 'anon',
    format('select name, bio, goal, journey_goal from public.profiles where id = %L', c));
  res := res || jsonb_build_object('teste', 'anon NÃO lê bio/objetivo de perfil privado direto em profiles',
    'ok', (r = '<vazio>' or r like 'ERRO%'), 'obtido', left(r, 160));

  r := pg_temp.as_user(a, 'authenticated',
    format('select name, bio, goal, journey_goal from public.profiles where id = %L', c));
  res := res || jsonb_build_object('teste', 'estranho NÃO lê bio/objetivo de perfil privado direto em profiles',
    'ok', (r = '<vazio>' or r like 'ERRO%' or (r not like '%Bio privada%' and r not like '%Objetivo privado%')),
    'obtido', left(r, 160));

  r := pg_temp.as_user(null, 'anon', format('select * from public.friend_ids(%L)', a));
  res := res || jsonb_build_object('teste', 'anon NÃO consegue listar amigos de alguém (friend_ids)',
    'ok', (r not like '%' || b::text || '%'), 'obtido', left(r, 80));

  r := pg_temp.as_user(null, 'anon', format('select public.are_friends(%L, %L)', a, b));
  res := res || jsonb_build_object('teste', 'anon NÃO consegue sondar amizade (are_friends)',
    'ok', (r <> 't'), 'obtido', left(r, 80));

  r := pg_temp.as_user(null, 'anon', format('select public.is_blocked_between(%L, %L)', a, d));
  res := res || jsonb_build_object('teste', 'anon NÃO consegue sondar bloqueios (is_blocked_between)',
    'ok', (r <> 't'), 'obtido', left(r, 80));

  r := pg_temp.as_user(null, 'anon', format('select public.can_view_post(%L, %L)', post_amigos, b));
  res := res || jsonb_build_object('teste', 'anon NÃO consegue sondar visibilidade de post (can_view_post)',
    'ok', (r <> 't'), 'obtido', left(r, 80));

  r := pg_temp.as_user(null, 'anon', 'select public.log_search(''zzqx abuso'')');
  res := res || jsonb_build_object('teste', 'anon NÃO pode alimentar as buscas do tema da semana (log_search)',
    'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

  -- --------------------------------------------- AMIZADE / SEGUIR / BLOQUEIO
  r := pg_temp.as_user(a, 'authenticated', format('select public.request_friendship(%L)', p));
  res := res || jsonb_build_object('teste', 'usuário comum NÃO pede amizade a profissional',
    'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(p, 'authenticated', format('select public.request_friendship(%L)', a));
  res := res || jsonb_build_object('teste', 'profissional NÃO pede amizade a usuário comum',
    'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(d, 'authenticated', format('select public.request_friendship(%L)', a));
  res := res || jsonb_build_object('teste', 'bloqueado NÃO consegue pedir amizade a quem o bloqueou',
    'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated', format('select status from public.request_friendship(%L)', e));
  res := res || jsonb_build_object('teste', 'pedido de amizade A→E fica pendente',
    'ok', (r = 'pendente'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated',
    format('select public.respond_friendship(id, true) from public.friendships where requester_id = %L', a));
  res := res || jsonb_build_object('teste', 'terceiro (F) NÃO consegue aceitar pedido alheio',
    'ok', (r like 'ERRO%' or r = '<vazio>'), 'obtido', left(r, 100));

  r := pg_temp.as_user(e, 'authenticated',
    format('select status from public.respond_friendship((select id from public.friendships where requester_id = %L and addressee_id = %L), true)', a, e));
  res := res || jsonb_build_object('teste', 'destinatário (E) aceita o pedido',
    'ok', (r = 'aceita'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.friendships (requester_id, addressee_id, status) values (%L, %L, ''aceita'')', a, f));
  res := res || jsonb_build_object('teste', 'usuário NÃO cria amizade já aceita direto na tabela',
    'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.follows (follower_id, followee_id) values (%L, %L)', a, p));
  res := res || jsonb_build_object('teste', 'usuário segue profissional', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(p, 'authenticated', format('insert into public.follows (follower_id, followee_id) values (%L, %L)', p, a));
  res := res || jsonb_build_object('teste', 'profissional NÃO segue usuário comum',
    'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(d, 'authenticated', format('insert into public.follows (follower_id, followee_id) values (%L, %L)', d, p));
  res := res || jsonb_build_object('teste', 'D segue profissional (D não bloqueou ninguém além de A)', 'ok', (r = 'OK:1'), 'obtido', r);

  -- ----------------------------------------------------- PRIVACIDADE / POSTS
  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.posts where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'amigo (B) vê post só-amigos de A', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.posts where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'estranho (F) NÃO vê post só-amigos de A', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(d, 'authenticated', format('select count(*) from public.posts where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'bloqueado (D) NÃO vê post de A', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.posts where id = %L', post_publico_c));
  res := res || jsonb_build_object('teste', 'não-amigo NÃO vê post de perfil privado (C)', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.posts where id = %L', post_publico_c));
  res := res || jsonb_build_object('teste', 'amigo de C (B) vê post do perfil privado', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.posts where id = %L', post_oculto));
  res := res || jsonb_build_object('teste', 'post ocultado por moderação some para os outros', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated',
    format('insert into public.comments (post_id, author_id, body) values (%L, %L, ''oi'')', post_publico_c, a));
  res := res || jsonb_build_object('teste', 'NÃO comenta em post que não pode ver', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated',
    format('insert into public.post_reactions (post_id, user_id, kind) values (%L, %L, ''curtir'')', post_publico_c, a));
  res := res || jsonb_build_object('teste', 'NÃO reage a post que não pode ver', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated',
    format('insert into public.comments (post_id, author_id, body) values (%L, %L, ''oi'')', post_amigos, b));
  res := res || jsonb_build_object('teste', 'NÃO comenta fingindo ser outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(f, 'authenticated', format('delete from public.posts where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'estranho NÃO apaga post alheio', 'ok', (r like 'ERRO%' or r = 'OK:0'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('update public.posts set hidden = true where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'autor NÃO altera o campo hidden (moderação)', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated',
    'insert into public.posts (author_id, body, publish_at) values (''' || a || ''', ''agendado'', now() + interval ''2 days'')');
  res := res || jsonb_build_object('teste', 'usuário comum NÃO agenda post', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  -- A trava de IA exige uma aprovação do mesmo conteúdo antes de cada publicação.
  insert into public.content_approvals (user_id, kind, body) values (p, 'post', 'agendado');
  r := pg_temp.as_user(p, 'authenticated',
    'insert into public.posts (author_id, body, publish_at) values (''' || p || ''', ''agendado'', now() + interval ''2 days'')');
  res := res || jsonb_build_object('teste', 'profissional agenda post', 'ok', (r = 'OK:1'), 'obtido', r);

  -- -------------------------------------------------- DADOS PRIVADOS / PODER
  r := pg_temp.as_user(a, 'authenticated', format('select email from public.profile_private where id = %L', b));
  res := res || jsonb_build_object('teste', 'NÃO lê e-mail/CPF/telefone de outra pessoa', 'ok', (r = '<vazio>'), 'obtido', left(r, 80));

  r := pg_temp.as_user(a, 'authenticated', format('select * from public.user_settings where id = %L', b));
  res := res || jsonb_build_object('teste', 'NÃO lê configurações de outra pessoa', 'ok', (r = '<vazio>'), 'obtido', left(r, 80));

  r := pg_temp.as_user(a, 'authenticated', format('update public.profiles set role = ''profissional'' where id = %L', a));
  res := res || jsonb_build_object('teste', 'usuário NÃO vira "profissional" sozinho', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated', format('update public.profiles set name = ''hackeado'' where id = %L', b));
  res := res || jsonb_build_object('teste', 'usuário NÃO edita perfil alheio', 'ok', (r = 'OK:0' or r like 'ERRO%'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.platform_admins (user_id) values (%L)', a));
  res := res || jsonb_build_object('teste', 'usuário NÃO se torna admin da plataforma', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.professionals (user_id, profession, council, registration, uf) values (%L, ''X'', ''Y'', ''Z'', ''SP'')', a));
  res := res || jsonb_build_object('teste', 'usuário NÃO se auto-verifica como profissional', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated',
    format('insert into public.notifications (user_id, type, actor_id) values (%L, ''curtida'', %L)', b, a));
  res := res || jsonb_build_object('teste', 'usuário NÃO cria notificação para outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));

  r := pg_temp.as_user(a, 'authenticated', format('select * from public.professional_mp_accounts limit 3'));
  res := res || jsonb_build_object('teste', 'NÃO lê contas do Mercado Pago de profissionais', 'ok', (r = '<vazio>' or r like 'ERRO%'), 'obtido', left(r, 80));

  -- ------------------------------------------------------------- PESQUISA
  r := pg_temp.as_user(a, 'authenticated', 'select name from public.search_users(''zzqx'', null, null, null, null, false, 50, 0)');
  res := res || jsonb_build_object('teste', 'pesquisa NÃO mostra quem A bloqueou (D)', 'ok', (r not like '%Daniel%'), 'obtido', left(r, 160));
  res := res || jsonb_build_object('teste', 'pesquisa mostra o profissional', 'ok', (r like '%Hélena%'), 'obtido', left(r, 160));

  r := pg_temp.as_user(a, 'authenticated', 'select name from public.search_users(''zzqxprof helena'', null, null, null, null, false, 50, 0)');
  res := res || jsonb_build_object('teste', 'pesquisa ignora acento ("helena" acha "Hélena")', 'ok', (r like '%Hélena%'), 'obtido', left(r, 120));

  r := pg_temp.as_user(a, 'authenticated', 'select name from public.search_users(''zzqxprof helna'', null, null, null, null, false, 50, 0)');
  res := res || jsonb_build_object('teste', 'pesquisa tolera erro de digitação ("helna")', 'ok', (r like '%Hélena%'), 'obtido', left(r, 120));

  r := pg_temp.as_user(a, 'authenticated', 'select name, bio, is_private from public.search_users(''zzqx carla'', null, null, null, null, false, 5, 0)');
  res := res || jsonb_build_object('teste', 'pesquisa esconde a bio de perfil privado', 'ok', (r like '%Carla%' and r not like '%Bio privada%'), 'obtido', left(r, 160));

  r := pg_temp.as_user(d, 'authenticated', 'select name from public.search_users(''zzqx alice'', null, null, null, null, false, 5, 0)');
  res := res || jsonb_build_object('teste', 'quem foi bloqueado NÃO encontra o bloqueador na pesquisa', 'ok', (r not like '%Alice%'), 'obtido', left(r, 120));

  r := pg_temp.as_user(null, 'anon', 'select * from public.search_users(''zzqx'')');
  res := res || jsonb_build_object('teste', 'anon NÃO usa a pesquisa de usuários', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

  r := pg_temp.as_user(a, 'authenticated', format('select can_view_content, bio from public.get_public_profile(%L)', c));
  res := res || jsonb_build_object('teste', 'get_public_profile nega conteúdo de perfil privado a não-amigo',
    'ok', (r like 'f%' and r not like '%Bio privada%'), 'obtido', left(r, 120));

  -- ---------------------------- OPERAÇÕES LEGÍTIMAS (usadas por src/lib/social/api.ts)
  r := pg_temp.as_user(a, 'authenticated', format('update public.profiles set is_private = true where id = %L', a));
  res := res || jsonb_build_object('teste', 'dono liga o próprio perfil privado', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('update public.user_settings set show_email = true, notification_prefs = ''{"social": false}'' where id = %L', a));
  res := res || jsonb_build_object('teste', 'dono altera as próprias configurações', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select status from public.request_friendship(%L)', f));
  res := res || jsonb_build_object('teste', 'pedido A→F fica pendente', 'ok', (r = 'pendente'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.friendships where addressee_id = %L and status = ''pendente''', f));
  res := res || jsonb_build_object('teste', 'destinatário lista seus pedidos pendentes', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.blocks (blocker_id, blocked_id) values (%L, %L)', a, f));
  res := res || jsonb_build_object('teste', 'dono bloqueia alguém', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.friendships where addressee_id = %L', f));
  res := res || jsonb_build_object('teste', 'bloquear cancela o pedido pendente', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('delete from public.blocks where blocker_id = %L and blocked_id = %L', a, f));
  res := res || jsonb_build_object('teste', 'dono desbloqueia', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('delete from public.blocks where blocker_id = %L and blocked_id = %L', a, c));
  res := res || jsonb_build_object('teste', 'terceiro NÃO apaga bloqueio alheio', 'ok', (r = 'OK:0' or r like 'ERRO%'), 'obtido', r);

  -- ------------------------------------------------ LEITURA DE PERFIS (profiles)
  -- (neste ponto A está com perfil privado e não tem vínculo com P)
  r := pg_temp.as_user(b, 'authenticated', format('select name from public.profiles where id = %L', c));
  res := res || jsonb_build_object('teste', 'amigo lê a linha de um perfil privado', 'ok', (r like '%Carla%'), 'obtido', r);

  r := pg_temp.as_user(p, 'authenticated', format('select name from public.profiles where id = %L', c));
  res := res || jsonb_build_object('teste', 'profissional com vínculo lê o paciente privado', 'ok', (r like '%Carla%'), 'obtido', r);

  r := pg_temp.as_user(p, 'authenticated', format('select name from public.profiles where id = %L', a));
  res := res || jsonb_build_object('teste', 'profissional SEM vínculo NÃO lê perfil privado', 'ok', (r = '<vazio>'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('select name from public.profiles where id = %L', e));
  res := res || jsonb_build_object('teste', 'logado lê perfil não privado', 'ok', (r like '%Eva%'), 'obtido', r);

  r := pg_temp.as_user(c, 'authenticated', format('select name from public.profiles where id = %L', c));
  res := res || jsonb_build_object('teste', 'dono sempre lê o próprio perfil privado', 'ok', (r like '%Carla%'), 'obtido', r);

  r := pg_temp.as_user(d, 'authenticated', format('select name from public.profiles where id = %L', a));
  res := res || jsonb_build_object('teste', 'bloqueado NÃO lê a linha de quem o bloqueou', 'ok', (r = '<vazio>'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.professionals');
  res := res || jsonb_build_object('teste', 'logado lê a vitrine de profissionais', 'ok', (r::bigint >= 1), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.professional_directory');
  res := res || jsonb_build_object('teste', 'logado lê professional_directory', 'ok', (r::bigint >= 1), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select name, username from public.person_cards(array[%L::uuid])', c));
  res := res || jsonb_build_object('teste', 'person_cards mostra nome e @ de perfil privado', 'ok', (r like '%Carla%'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select bio from public.person_cards(array[%L::uuid])', c));
  res := res || jsonb_build_object('teste', 'person_cards NÃO tem coluna bio', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

  r := pg_temp.as_user(a, 'authenticated', format('select name from public.person_cards(array[%L::uuid])', d));
  res := res || jsonb_build_object('teste', 'person_cards não devolve quem tem bloqueio com A', 'ok', (r = '<vazio>'), 'obtido', r);

  r := pg_temp.as_user(null, 'anon', format('select name from public.person_cards(array[%L::uuid])', c));
  res := res || jsonb_build_object('teste', 'anon NÃO usa person_cards', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

  r := pg_temp.as_user(a, 'authenticated', 'select name from public.list_my_blocks()');
  res := res || jsonb_build_object('teste', 'list_my_blocks mostra o bloqueado com nome', 'ok', (r like '%Daniel%'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', 'select name from public.list_my_blocks()');
  res := res || jsonb_build_object('teste', 'list_my_blocks NÃO mostra bloqueios de outras pessoas', 'ok', (r = '<vazio>'), 'obtido', r);

  r := pg_temp.as_user(null, 'anon', 'select * from public.list_my_blocks()');
  res := res || jsonb_build_object('teste', 'anon NÃO usa list_my_blocks', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

  -- ------------------------------------------------ log_search e privacidade
  perform pg_temp.as_user(a, 'authenticated', 'select public.log_search(''marmita zzqx fit'')');
  perform pg_temp.as_user(a, 'authenticated', 'select public.log_search(''zzqx bruno'')');
  perform pg_temp.as_user(a, 'authenticated', 'select public.log_search(''zzqx.bruno'')');
  perform pg_temp.as_user(a, 'authenticated', 'select public.log_search(''zzqx'')');
  res := res || jsonb_build_object('teste', 'log_search registra assunto comum',
    'ok', exists (select 1 from public.search_term_stats where term = 'marmita zzqx fit'),
    'obtido', 'verificado como superusuário');
  res := res || jsonb_build_object('teste', 'log_search IGNORA o nome completo de uma pessoa',
    'ok', not exists (select 1 from public.search_term_stats where term = 'zzqx bruno'),
    'obtido', 'verificado como superusuário');
  res := res || jsonb_build_object('teste', 'log_search IGNORA o @ de uma pessoa',
    'ok', not exists (select 1 from public.search_term_stats where term = 'zzqx.bruno'),
    'obtido', 'verificado como superusuário');
  res := res || jsonb_build_object('teste', 'log_search registra termo de uma palavra que não é nome completo',
    'ok', exists (select 1 from public.search_term_stats where term = 'zzqx'),
    'obtido', 'verificado como superusuário');

  -- ------------------------------------------------------------------ get_feed
  r := pg_temp.as_user(a, 'authenticated', format('select author_name from public.get_feed(p_scope := ''todos'') where id = %L', post_f));
  res := res || jsonb_build_object('teste', 'feed mostra o autor de um post público', 'ok', (r like '%Fabio%'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select comments -> 0 ->> ''author_name'' from public.get_feed(p_scope := ''todos'') where id = %L', post_f));
  res := res || jsonb_build_object('teste', 'comentário de autor PRIVADO continua no feed (nome do cartão)', 'ok', (r like '%Carla%'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''post'', p_post := %L)', post_f));
  res := res || jsonb_build_object('teste', 'escopo post devolve a publicação pedida', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''post'', p_post := %L)', post_amigos));
  res := res || jsonb_build_object('teste', 'escopo post NÃO devolve post que a pessoa não pode ver', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''amigos'') where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'escopo amigos mostra post de amigo', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''amigos'') where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'escopo amigos NÃO mostra post de quem não é amigo', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''seguindo'') where id = %L', post_p));
  res := res || jsonb_build_object('teste', 'escopo seguindo mostra post de profissional seguido', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''seguindo'') where id = %L', post_p));
  res := res || jsonb_build_object('teste', 'escopo seguindo NÃO mostra profissional que não sigo', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.post_reactions (post_id, user_id, kind) values (%L, %L, ''apoiar'')', post_f, a));
  res := res || jsonb_build_object('teste', 'pessoa apoia um post público', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(b, 'authenticated', format('select cardinality(supports) from public.get_feed(p_scope := ''todos'') where id = %L', post_f));
  res := res || jsonb_build_object('teste', 'feed reflete o apoio de outra pessoa', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(d, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''todos'') where id = %L', post_amigos));
  res := res || jsonb_build_object('teste', 'feed NÃO mostra post de quem bloqueou o leitor', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(null, 'anon', 'select count(*) from public.get_feed()');
  res := res || jsonb_build_object('teste', 'anon NÃO usa o feed', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''todos'', p_query := ''PÚBLICO do profissional'') where id = %L', post_p));
  res := res || jsonb_build_object('teste', 'busca no feed ignora acento e caixa', 'ok', (r = '1'), 'obtido', r);

  -- ------------------------------------------------------------------ publicar
  insert into public.content_approvals (user_id, kind, title, body, tags, recipe)
    values (f, 'post', 'Bolo', 'modo de fazer', array['bolo'], '{"prepTime":"30 min","servings":"4","difficulty":"Fácil","ingredients":["ovo"],"steps":["misturar"],"category":"Doces"}'::jsonb);
  r := pg_temp.as_user(f, 'authenticated', format(
    'insert into public.posts (author_id, type, title, body, tags, audience, recipe, block_order) values (%L, ''receita'', ''Bolo'', ''modo de fazer'', array[''bolo''], ''amigos'', ''{"prepTime":"30 min","servings":"4","difficulty":"Fácil","ingredients":["ovo"],"steps":["misturar"],"category":"Doces"}''::jsonb, array[''title'',''image'',''text'',''recipe''])', f));
  res := res || jsonb_build_object('teste', 'pessoa publica receita só para amigos (recipe + block_order)', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('insert into public.posts (author_id, body) values (%L, ''fingindo ser B'')', b));
  res := res || jsonb_build_object('teste', 'NÃO publica como outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  insert into public.content_approvals (user_id, kind, body) values (a, 'post', 'tentando forçar');
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.posts (author_id, body, hidden, pinned) values (%L, ''tentando forçar'', true, true)', a));
  res := res || jsonb_build_object('teste', 'publicação nasce sem hidden/pinned mesmo se a pessoa tentar forçar', 'ok', (r = 'OK:1'
    and not exists (select 1 from public.posts where body = 'tentando forçar' and (hidden or pinned))), 'obtido', r);

  r := pg_temp.as_user(a, 'authenticated', format('insert into storage.objects (bucket_id, name, owner) values (''post-images'', ''%s/foto.jpg'', %L)', a, a));
  res := res || jsonb_build_object('teste', 'pessoa envia imagem para a PRÓPRIA pasta', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));

  r := pg_temp.as_user(a, 'authenticated', format('insert into storage.objects (bucket_id, name, owner) values (''post-images'', ''%s/foto.jpg'', %L)', b, a));
  res := res || jsonb_build_object('teste', 'pessoa NÃO envia imagem para a pasta de outra', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  r := pg_temp.as_user(null, 'anon', format('insert into storage.objects (bucket_id, name) values (''post-images'', ''%s/x.jpg'')', a));
  res := res || jsonb_build_object('teste', 'anon NÃO envia imagem', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''autor'', p_author := %L, p_type := ''receita'')', f));
  res := res || jsonb_build_object('teste', 'receita só-amigos de F NÃO aparece para A (não são amigos)', 'ok', (r = '0'), 'obtido', r);

  -- ------------------------------------------------------- escopo preparados
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.post_reactions (post_id, user_id, kind) values (%L, %L, ''preparei'')', post_f, a));
  res := res || jsonb_build_object('teste', 'pessoa marca "Eu preparei"', 'ok', (r = 'OK:1'), 'obtido', r);

  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''preparados'', p_author := %L) where id = %L', a, post_f));
  res := res || jsonb_build_object('teste', 'escopo preparados lista o que A preparou (visto por B)', 'ok', (r = '1'), 'obtido', r);

  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''preparados'', p_author := %L)', f));
  res := res || jsonb_build_object('teste', 'escopo preparados NÃO lista quem F não preparou', 'ok', (r = '0'), 'obtido', r);

  r := pg_temp.as_user(d, 'authenticated', format('select count(*) from public.get_feed(p_scope := ''preparados'', p_author := %L)', a));
  res := res || jsonb_build_object('teste', 'escopo preparados respeita bloqueio (D não vê nada de A)', 'ok', (r = '0' or r like 'ERRO%'), 'obtido', r);

  -- ------------------------------------------------------------- comunidades
  r := pg_temp.as_user(p, 'authenticated', 'select public.create_community(''Zzqx Prof'', ''x'', ''Zzqx Tema'')');
  res := res || jsonb_build_object('teste', 'profissional NÃO cria comunidade', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(e, 'authenticated', 'select status from public.create_community(''Zzqx Comunidade'', ''teste'', ''Zzqx Tema'')');
  res := res || jsonb_build_object('teste', 'usuário cria comunidade (nasce pendente)', 'ok', (r = 'pendente'), 'obtido', r);
  select id into cid from public.communities where name = 'Zzqx Comunidade';
  r := pg_temp.as_user(e, 'authenticated', 'select public.create_community(''Zzqx Segunda'', ''x'', ''Zzqx Tema'')');
  res := res || jsonb_build_object('teste', 'quem já administra NÃO cria outra', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.communities where id = %L', cid));
  res := res || jsonb_build_object('teste', 'comunidade pendente NÃO aparece para qualquer pessoa', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.communities where id = %L', cid));
  res := res || jsonb_build_object('teste', 'profissional vê a comunidade pendente', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('insert into public.community_members (community_id, user_id) values (%L, %L)', cid, f));
  res := res || jsonb_build_object('teste', 'NÃO entra em comunidade pendente', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(q, 'authenticated', 'select count(*) from public.my_community_invites() where name like ''Zzqx%''');
  res := res || jsonb_build_object('teste', 'profissional do tema recebe o convite', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(p, 'authenticated', 'select count(*) from public.my_community_invites() where name like ''Zzqx%''');
  res := res || jsonb_build_object('teste', 'profissional de outro tema NÃO é convidado (há quem atue no tema)', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.community_candidates(%L)', cid));
  res := res || jsonb_build_object('teste', 'estranho NÃO vê a lista de convidados', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', format('select count(*) from public.community_candidates(%L) where user_id = %L', cid, q));
  res := res || jsonb_build_object('teste', 'quem criou vê os convidados', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(p, 'authenticated', format('select public.accept_community_professional(%L)', cid));
  res := res || jsonb_build_object('teste', 'profissional NÃO convidado não aceita', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(f, 'authenticated', format('select public.accept_community_professional(%L)', cid));
  res := res || jsonb_build_object('teste', 'usuário comum NÃO aceita ser admin profissional', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(q, 'authenticated', format('select status from public.accept_community_professional(%L)', cid));
  res := res || jsonb_build_object('teste', 'profissional convidado aceita e a comunidade fica ativa', 'ok', (r = 'ativa'), 'obtido', r);
  r := pg_temp.as_user(d, 'authenticated', 'select status from public.create_community(''Zzqx Outra'', ''x'', ''Zzqx Tema'')');
  res := res || jsonb_build_object('teste', 'outro usuário cria uma segunda comunidade', 'ok', (r = 'pendente'), 'obtido', r);
  select id into cid2 from public.communities where name = 'Zzqx Outra';
  r := pg_temp.as_user(q, 'authenticated', format('select public.accept_community_professional(%L)', cid2));
  res := res || jsonb_build_object('teste', 'profissional que já administra NÃO aceita outra', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(d, 'authenticated', format('select id from public.leave_community_admin(%L)', cid2));
  res := res || jsonb_build_object('teste', 'admin que sai de comunidade PENDENTE cancela a comunidade', 'ok', (r <> '<vazio>' and not exists (select 1 from public.communities where id = cid2)), 'obtido', r);
  insert into public.content_approvals (user_id, kind, body) values (e, 'post', 'post na comunidade');
  r := pg_temp.as_user(e, 'authenticated', format('insert into public.posts (author_id, body, community_id) values (%L, ''post na comunidade'', %L)', e, cid));
  res := res || jsonb_build_object('teste', 'membro publica em comunidade ativa', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('insert into public.posts (author_id, body, community_id) values (%L, ''sem ser membro'', %L)', f, cid));
  res := res || jsonb_build_object('teste', 'não-membro NÃO publica na comunidade', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(f, 'authenticated', format('insert into public.community_members (community_id, user_id) values (%L, %L)', cid, f));
  res := res || jsonb_build_object('teste', 'pessoa entra em comunidade ativa', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select member_count || '' | '' || is_member || '' | '' || admin_name from public.get_communities(p_slug := (select slug from public.communities where id = %L))', cid));
  res := res || jsonb_build_object('teste', 'get_communities traz contagem, participação e admin', 'ok', (r like '%3 | true | Zzqx Eva%'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.get_community_members(%L)', cid));
  res := res || jsonb_build_object('teste', 'lista de membros com cartão', 'ok', (r = '3'), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', format('select public.toggle_post_pin(id) from public.posts where body = ''post na comunidade'' and community_id = %L', cid));
  res := res || jsonb_build_object('teste', 'admin da comunidade fixa um post', 'ok', (r in ('t', 'true')), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select public.toggle_post_pin(id) from public.posts where body = ''post na comunidade'' and community_id = %L', cid));
  res := res || jsonb_build_object('teste', 'membro comum NÃO fixa post', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(q, 'authenticated', format('select status from public.leave_community_admin(%L)', cid));
  res := res || jsonb_build_object('teste', 'profissional deixa a administração: comunidade suspensa', 'ok', (r = 'suspensa'), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', format('insert into public.posts (author_id, body, community_id) values (%L, ''na suspensa'', %L)', e, cid));
  res := res || jsonb_build_object('teste', 'comunidade suspensa NÃO aceita publicação', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(q, 'authenticated', 'select count(*) from public.my_community_invites() where name like ''Zzqx%''');
  res := res || jsonb_build_object('teste', 'quem saiu NÃO é convidado de volta', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', format('select count(*) from public.community_candidates(%L) where user_id <> %L', cid, q));
  res := res || jsonb_build_object('teste', 'sem quem atue no tema, o convite vai para outros candidatos (nunca para quem saiu)', 'ok', (r::integer >= 1), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('delete from public.community_members where community_id = %L and user_id = %L', cid, f));
  res := res || jsonb_build_object('teste', 'membro comum sai da comunidade', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', format('delete from public.community_members where community_id = %L and user_id = %L', cid, e));
  res := res || jsonb_build_object('teste', 'admin NÃO sai sem deixar a administração', 'ok', (r = 'OK:0' or r like 'ERRO%'), 'obtido', r);

  -- ----------------------------------------------- membros engajados (plataforma)
  insert into public.community_members (community_id, user_id) values (cid, f) on conflict do nothing;
  r := pg_temp.as_user(g, 'authenticated', format('select name from public.community_engaged_members(%L)', cid));
  res := res || jsonb_build_object('teste', 'plataforma vê os membros engajados (sem admin nem profissional)', 'ok', (r like '%Fabio%' and r not like '%Eva%' and r not like '%Quirino%'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.community_engaged_members(%L)', cid));
  res := res || jsonb_build_object('teste', 'usuário comum NÃO vê os membros engajados', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(g, 'authenticated', format('select count(*) from public.communities where id = %L', cid));
  res := res || jsonb_build_object('teste', 'plataforma enxerga qualquer comunidade', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(g, 'authenticated', format('select status from public.designate_community_admin_user(%L, %L)', cid, f));
  res := res || jsonb_build_object('teste', 'plataforma indica um membro como admin usuário', 'ok', (r in ('suspensa', 'ativa')), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select public.designate_community_admin_user(%L, %L)', cid, f));
  res := res || jsonb_build_object('teste', 'usuário comum NÃO indica admin', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  -- ------------------------------------------------------------------ desafios
  insert into public.challenges (title, description, category, badge_label, duration, steps)
    values ('Zzqx Desafio', 'teste', 'Zzqx Tema', 'Selo de teste', '3 dias', array['um', 'dois', 'três']) returning id into ch;
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.challenge_participants (challenge_id, user_id) values (%L, %L)', ch, a));
  res := res || jsonb_build_object('teste', 'pessoa entra num desafio', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.challenge_participants (challenge_id, user_id) values (%L, %L)', ch, a));
  res := res || jsonb_build_object('teste', 'NÃO inscreve outra pessoa no desafio', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', format('update public.challenge_participants set completed_steps = array[0, 1] where challenge_id = %L and user_id = %L', ch, a));
  res := res || jsonb_build_object('teste', 'marca passos do desafio', 'ok', (r = 'OK:1' and not exists (select 1 from public.challenge_participants where challenge_id = ch and user_id = a and completed_at is not null)), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('update public.challenge_participants set completed_steps = array[0, 1, 2] where challenge_id = %L and user_id = %L', ch, a));
  res := res || jsonb_build_object('teste', 'todos os passos concluem o desafio', 'ok', (r = 'OK:1' and exists (select 1 from public.challenge_participants where challenge_id = ch and user_id = a and completed_at is not null)), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('update public.challenge_participants set completed_steps = array[0] where challenge_id = %L and user_id = %L', ch, a));
  res := res || jsonb_build_object('teste', 'NÃO altera o progresso de outra pessoa', 'ok', (r = 'OK:0' or r like 'ERRO%'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('select participant_count || '' | '' || completed_count || '' | '' || joined || '' | '' || cardinality(my_steps) from public.get_challenges(p_id := %L)', ch));
  res := res || jsonb_build_object('teste', 'get_challenges traz contagens e meu progresso', 'ok', (r like '%1 | 1 | true | 3%'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select joined from public.get_challenges(p_id := %L)', ch));
  res := res || jsonb_build_object('teste', 'quem não entrou vê joined = falso', 'ok', (r in ('f', 'false')), 'obtido', r);
  r := pg_temp.as_user(null, 'anon', 'select count(*) from public.get_challenges()');
  res := res || jsonb_build_object('teste', 'anon NÃO lista desafios', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));
  r := pg_temp.as_user(c, 'authenticated', format('insert into public.challenge_participants (challenge_id, user_id) values (%L, %L)', ch, c));
  res := res || jsonb_build_object('teste', 'perfil privado também entra no desafio', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.get_challenge_participants(%L) where name like ''%%Carla%%''', ch));
  res := res || jsonb_build_object('teste', 'perfil privado de não-amigo NÃO aparece na lista de participantes', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.get_challenge_participants(%L) where name like ''%%Carla%%''', ch));
  res := res || jsonb_build_object('teste', 'amigo vê o perfil privado na lista de participantes', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.user_challenges(%L)', c));
  res := res || jsonb_build_object('teste', 'desafios de perfil privado: não-amigo não vê', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.user_challenges(%L)', c));
  res := res || jsonb_build_object('teste', 'desafios de perfil privado: amigo vê', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('select completed from public.user_challenges() where challenge_id = %L', ch));
  res := res || jsonb_build_object('teste', 'minha lista de desafios mostra o concluído', 'ok', (r in ('t', 'true')), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.challenge_tips (challenge_id, author_id, body) values (%L, %L, ''beba água'')', ch, a));
  res := res || jsonb_build_object('teste', 'pessoa dá uma dica no desafio', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.challenge_tips (challenge_id, author_id, body) values (%L, %L, ''fingindo'')', ch, a));
  res := res || jsonb_build_object('teste', 'NÃO dá dica no nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', format('select author_name from public.get_challenge_tips(%L)', ch));
  res := res || jsonb_build_object('teste', 'dicas trazem o nome de quem escreveu', 'ok', (r like '%Alice%'), 'obtido', r);
  r := pg_temp.as_user(d, 'authenticated', format('select count(*) from public.get_challenge_tips(%L)', ch));
  res := res || jsonb_build_object('teste', 'bloqueado NÃO vê as dicas de quem o bloqueou', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.challenges (title, description, category, badge_label, duration, steps) values (''Zzqx Meu'', ''x'', ''x'', ''x'', ''x'', array[''a''])');
  res := res || jsonb_build_object('teste', 'usuário comum NÃO cria desafio', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', format('delete from public.challenge_participants where challenge_id = %L and user_id = %L', ch, a));
  res := res || jsonb_build_object('teste', 'pessoa sai do desafio', 'ok', (r = 'OK:1'), 'obtido', r);

  -- ------------------------------------------------------------------- trilhas
  r := pg_temp.as_user(a, 'authenticated', 'select kind from public.ensure_adult_trail_profile()');
  res := res || jsonb_build_object('teste', 'cria o perfil adulto da trilha', 'ok', (r = 'adult'), 'obtido', r);
  select id into tp from public.trail_profiles where owner_id = a and kind = 'adult';
  r := pg_temp.as_user(a, 'authenticated', 'select kind from public.ensure_adult_trail_profile()');
  res := res || jsonb_build_object('teste', 'perfil adulto é criado uma só vez', 'ok', (r = 'adult' and (select count(*) from public.trail_profiles where owner_id = a and kind = 'adult') = 1), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('select public.save_trail_progress(%L, ''{"totalXP": 120, "streak": 3, "lastActiveDay": "2026-10-02", "stops": {}}''::jsonb, 120)', tp));
  res := res || jsonb_build_object('teste', 'salva o progresso da trilha', 'ok', (r <> '<vazio>' and r not like 'ERRO%' and (select total_xp from public.trail_progress where profile_id = tp) = 120 and (select streak from public.trail_progress where profile_id = tp) = 3), 'obtido', r);
  res := res || jsonb_build_object('teste', 'soma o XP ganho no dia', 'ok', ((select coalesce(sum(xp), 0) from public.trail_xp_daily where profile_id = tp) = 120), 'obtido', 'verificado como superusuário');
  r := pg_temp.as_user(a, 'authenticated', format('select public.save_trail_progress(%L, ''{"totalXP": 5000}''::jsonb, 5000)', tp));
  res := res || jsonb_build_object('teste', 'XP ganho de uma vez é limitado a 1000', 'ok', ((select coalesce(sum(xp), 0) from public.trail_xp_daily where profile_id = tp) = 1120), 'obtido', 'verificado como superusuário');
  r := pg_temp.as_user(b, 'authenticated', format('select public.save_trail_progress(%L, ''{"totalXP": 9999}''::jsonb, 1)', tp));
  res := res || jsonb_build_object('teste', 'NÃO salva no perfil de trilha de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.trail_progress where profile_id = %L', tp));
  res := res || jsonb_build_object('teste', 'NÃO lê o progresso de trilha de outra pessoa', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.trail_profiles (id, owner_id, kind, name, avatar) values (%L, %L, ''kid'', ''Lia'', ''lipe'')', kid, a));
  res := res || jsonb_build_object('teste', 'cria perfil infantil com id do próprio app', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.trail_profiles (owner_id, kind, name) values (%L, ''adult'', ''Outro'')', a));
  res := res || jsonb_build_object('teste', 'NÃO cria um segundo perfil adulto', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.trail_profiles (owner_id, kind, name) values (%L, ''kid'', ''Intruso'')', a));
  res := res || jsonb_build_object('teste', 'NÃO cria perfil de trilha em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'select name || '' '' || xp || '' '' || "position" from public.friends_weekly_ranking() where is_me');
  res := res || jsonb_build_object('teste', 'ranking entre amigos traz o meu XP da semana', 'ok', (r like '%1120%'), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', 'select count(*) from public.friends_weekly_ranking()');
  res := res || jsonb_build_object('teste', 'ranking de quem não tem amigos só tem a própria pessoa', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('delete from public.trail_profiles where id = %L', kid));
  res := res || jsonb_build_object('teste', 'remove o perfil infantil', 'ok', (r = 'OK:1'), 'obtido', r);

  -- ------------------------------------------------------------ tema da semana
  -- tema ativo próprio do teste (o de produção, se existir, é encerrado dentro da transação)
  update public.weekly_themes set status = 'encerrado' where status = 'ativo';
  insert into public.weekly_themes (week_start, status, title, description, question, poll_question)
    values ((date '2026-10-04' + 7 * 3000), 'ativo', 'Zzqx Tema Ativo', 'descrição', 'pergunta?', 'enquete?') returning id into th;
  insert into public.theme_poll_options (theme_id, position, text) values (th, 0, 'Opção um') returning id into opt1;
  insert into public.theme_poll_options (theme_id, position, text) values (th, 1, 'Opção dois') returning id into opt2;
  insert into public.weekly_themes (week_start, status, title, description) values ((date '2026-10-04' + 7 * 3001), 'previa', 'Zzqx Prévia', 'segredo') returning id into th_prev;
  insert into public.weekly_themes (week_start, status, title, description) values ((date '2026-10-04' - 7 * 3000), 'encerrado', 'Zzqx Tema Antigo', 'antigo') returning id into th_old;
  insert into public.posts (author_id, body, type, theme_id) values (f, 'receita do tema antigo', 'receita', th_old);
  r := pg_temp.as_user(a, 'authenticated', 'select title from public.get_weekly_theme()');
  res := res || jsonb_build_object('teste', 'traz o tema ativo', 'ok', (r like '%Zzqx Tema Ativo%'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', 'select jsonb_array_length(poll) from public.get_weekly_theme()');
  res := res || jsonb_build_object('teste', 'o tema ativo traz as opções da enquete', 'ok', (r = '2'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', 'select title from public.get_weekly_theme(p_status := ''previa'')');
  res := res || jsonb_build_object('teste', 'usuário comum NÃO vê a prévia do próximo tema', 'ok', (r = '<vazio>'), 'obtido', r);
  r := pg_temp.as_user(p, 'authenticated', 'select title from public.get_weekly_theme(p_status := ''previa'')');
  res := res || jsonb_build_object('teste', 'profissional vê a prévia', 'ok', (r like '%Zzqx Prévia%'), 'obtido', r);
  r := pg_temp.as_user(null, 'anon', 'select title from public.get_weekly_theme()');
  res := res || jsonb_build_object('teste', 'anon NÃO usa get_weekly_theme', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.theme_poll_votes (theme_id, option_id, user_id) values (%L, %L, %L)', th, opt1, a));
  res := res || jsonb_build_object('teste', 'pessoa vota na enquete', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('update public.theme_poll_votes set option_id = %L where theme_id = %L and user_id = %L', opt2, th, a));
  res := res || jsonb_build_object('teste', 'pessoa muda o voto', 'ok', (r = 'OK:1'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.theme_poll_votes (theme_id, option_id, user_id) values (%L, %L, %L)', th, opt2, a));
  res := res || jsonb_build_object('teste', 'NÃO vota em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.theme_poll_votes where theme_id = %L', th));
  res := res || jsonb_build_object('teste', 'NÃO lê os votos das outras pessoas', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', 'select (poll -> 1 ->> ''votes'') || '' '' || (poll -> 1 ->> ''mine'') from public.get_weekly_theme()');
  res := res || jsonb_build_object('teste', 'o resultado agregado aparece sem expor quem votou', 'ok', (r like '%1 false%'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', 'select (poll -> 1 ->> ''mine'') from public.get_weekly_theme()');
  res := res || jsonb_build_object('teste', 'o resultado marca o meu voto', 'ok', (r in ('t', 'true')), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('insert into public.theme_poll_votes (theme_id, option_id, user_id) values (%L, %L, %L)', th_old, opt1, a));
  res := res || jsonb_build_object('teste', 'NÃO vota em tema encerrado', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'select title || '' '' || recipes_count || '' '' || posts_count from public.theme_history() where title = ''Zzqx Tema Antigo''');
  res := res || jsonb_build_object('teste', 'histórico traz o tema encerrado com as contagens', 'ok', (r like '%Zzqx Tema Antigo 1 1%'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.theme_history() where title like ''%Prévia%'' or title = ''Zzqx Tema Ativo''');
  res := res || jsonb_build_object('teste', 'histórico NÃO traz prévia nem tema ativo', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('update public.weekly_themes set title = ''hackeado'' where id = %L', th));
  res := res || jsonb_build_object('teste', 'usuário comum NÃO edita o tema', 'ok', (r = 'OK:0' or r like 'ERRO%'), 'obtido', r);
  r := pg_temp.as_user(g, 'authenticated', format('update public.weekly_themes set title = ''Zzqx Editado'' where id = %L', th_prev));
  res := res || jsonb_build_object('teste', 'admin da plataforma edita o tema', 'ok', (r = 'OK:1'), 'obtido', r);

  -- ------------------------------------------------------------- notificações
  r := pg_temp.as_user(e, 'authenticated', 'select actor_name from public.get_notifications() where type = ''amizade_pedido''');
  res := res || jsonb_build_object('teste', 'pedido de amizade gera notificação com o nome de quem pediu', 'ok', (r like '%Alice%'), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.get_notifications() where type = ''amizade_aceita''');
  res := res || jsonb_build_object('teste', 'amizade aceita notifica quem pediu', 'ok', (r::integer >= 1), 'obtido', r);
  r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.notifications where user_id = %L', e));
  res := res || jsonb_build_object('teste', 'NÃO lê notificações de outra pessoa', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(null, 'anon', 'select count(*) from public.get_notifications()');
  res := res || jsonb_build_object('teste', 'anon NÃO usa get_notifications', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));
  r := pg_temp.as_user(e, 'authenticated', 'select count(*) from public.notifications where read_at is null');
  res := res || jsonb_build_object('teste', 'há notificações não lidas antes de marcar', 'ok', (r::integer >= 1), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', 'select public.mark_all_notifications_read()');
  res := res || jsonb_build_object('teste', 'marcar tudo como lido funciona', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 80));
  r := pg_temp.as_user(e, 'authenticated', 'select count(*) from public.notifications where read_at is null');
  res := res || jsonb_build_object('teste', 'depois de marcar, não restam não lidas', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(e, 'authenticated', 'update public.notifications set type = ''conquista''');
  res := res || jsonb_build_object('teste', 'a pessoa só altera read_at da notificação (não o conteúdo)', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(e, 'authenticated', format('insert into public.notifications (user_id, type) values (%L, ''conquista'')', b));
  res := res || jsonb_build_object('teste', 'NÃO cria notificação para outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  -- ---------------------------------------------- BLOQUEAR LIMPA RELAÇÕES
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.blocks (blocker_id, blocked_id) values (%L, %L)', b, a));
  res := res || jsonb_build_object('teste', 'B bloqueia A', 'ok', (r = 'OK:1'), 'obtido', r);
  res := res || jsonb_build_object('teste', 'bloquear desfaz a amizade',
    'ok', not exists (select 1 from public.friendships where least(requester_id, addressee_id) = least(a, b)
                                                         and greatest(requester_id, addressee_id) = greatest(a, b)),
    'obtido', 'verificado como superusuário');

  -- ------------------------------------------------- PONTUAÇÃO DOS PROFISSIONAIS
  declare
    s0 integer; s1 integer; ask uuid; rep uuid;
  begin
    -- Verificação já deu os pontos iniciais.
    res := res || jsonb_build_object('teste', 'profissional verificado já tem pontuação inicial',
      'ok', coalesce((select score from public.pro_scores where professional_id = p), 0) >= 20,
      'obtido', (select score::text from public.pro_scores where professional_id = p));
    res := res || jsonb_build_object('teste', 'usuário comum NÃO tem pontuação', 'ok',
      not exists (select 1 from public.pro_scores where professional_id = a), 'obtido', 'verificado como superusuário');

    -- Publicar soma, com teto de 3 por dia.
    s0 := (select score from public.pro_scores where professional_id = p);
    insert into public.posts (author_id, body) values (p, 'pro 1'), (p, 'pro 2'), (p, 'pro 3'), (p, 'pro 4'), (p, 'pro 5');
    s1 := (select score from public.pro_scores where professional_id = p);
    res := res || jsonb_build_object('teste', 'publicações do profissional pontuam, com teto diário',
      'ok', (s1 - s0) between 5 and 15, 'obtido', (s1 - s0)::text);

    -- Responder pergunta de outra pessoa vale 4; comentar na própria publicação não vale nada.
    insert into public.posts (author_id, body, type) values (a, 'como assar pão?', 'pergunta') returning id into ask;
    s0 := (select score from public.pro_scores where professional_id = p);
    insert into public.comments (post_id, author_id, body) values (ask, p, 'use forno bem quente');
    s1 := (select score from public.pro_scores where professional_id = p);
    res := res || jsonb_build_object('teste', 'responder pergunta soma 4', 'ok', (s1 - s0 = 4), 'obtido', (s1 - s0)::text);
    insert into public.posts (author_id, body, type) values (p, 'minha pergunta', 'pergunta') returning id into ask;
    s0 := (select score from public.pro_scores where professional_id = p);
    insert into public.comments (post_id, author_id, body) values (ask, p, 'resposta a mim mesmo');
    s1 := (select score from public.pro_scores where professional_id = p);
    res := res || jsonb_build_object('teste', 'comentar na própria publicação NÃO pontua', 'ok', (s1 = s0), 'obtido', (s1 - s0)::text);

    -- Apoio recebido soma.
    s0 := (select score from public.pro_scores where professional_id = p);
    insert into public.post_reactions (post_id, user_id, kind) values (ask, a, 'apoiar');
    s1 := (select score from public.pro_scores where professional_id = p);
    res := res || jsonb_build_object('teste', 'apoio recebido soma 1', 'ok', (s1 - s0 = 1), 'obtido', (s1 - s0)::text);

    -- Denúncia procedente tira 30 (e só uma vez).
    s0 := (select score from public.pro_scores where professional_id = p);
    insert into public.reports (reporter_id, target_type, target_id, reason) values (a, 'post', ask, 'ofensivo') returning id into rep;
    update public.reports set status = 'procedente' where id = rep;
    s1 := (select score from public.pro_scores where professional_id = p);
    res := res || jsonb_build_object('teste', 'denúncia procedente tira 30 pontos', 'ok', (s0 - s1 = 30), 'obtido', (s0 - s1)::text);
    update public.reports set status = 'improcedente' where id = rep;
    update public.reports set status = 'procedente' where id = rep;
    res := res || jsonb_build_object('teste', 'a mesma denúncia NÃO desconta duas vezes',
      'ok', ((select score from public.pro_scores where professional_id = p) = s1), 'obtido', 'idempotente');

    -- Piso em zero e níveis.
    perform public._pro_award(p, 'ajuste_admin', 'admin', gen_random_uuid(), 'teste', -5000);
    res := res || jsonb_build_object('teste', 'pontuação nunca fica negativa',
      'ok', ((select score from public.pro_scores where professional_id = p) = 0 and (select level from public.pro_scores where professional_id = p) = 1),
      'obtido', (select score::text from public.pro_scores where professional_id = p));
    res := res || jsonb_build_object('teste', 'nível 1 não libera o perfil de membros', 'ok', not public.pro_has_feature(p, 'perfil_membros'), 'obtido', 'nível 1');
    res := res || jsonb_build_object('teste', 'nível 1 cobra 20% das assinaturas', 'ok', (public.pro_membership_fee_percent(p) = 20), 'obtido', public.pro_membership_fee_percent(p)::text);
    perform public._pro_award(p, 'ajuste_admin', 'admin', gen_random_uuid(), 'teste', 350);
    res := res || jsonb_build_object('teste', '350 pontos levam ao nível 3 (destaque)',
      'ok', ((select level from public.pro_scores where professional_id = p) = 3), 'obtido', (select level::text from public.pro_scores where professional_id = p));
    res := res || jsonb_build_object('teste', 'nível 3 libera o perfil de membros', 'ok', public.pro_has_feature(p, 'perfil_membros'), 'obtido', 'nível 3');
    res := res || jsonb_build_object('teste', 'nível 3 cobra 15% das assinaturas', 'ok', (public.pro_membership_fee_percent(p) = 15), 'obtido', public.pro_membership_fee_percent(p)::text);
    res := res || jsonb_build_object('teste', 'nível 3 ainda não tem selo de excelência', 'ok', not public.pro_has_feature(p, 'selo_excelencia'), 'obtido', 'nível 3');

    -- Excelência exige 90 dias sem denúncia procedente (a de agora conta).
    perform public._pro_award(p, 'ajuste_admin', 'admin', gen_random_uuid(), 'teste', 2500);
    res := res || jsonb_build_object('teste', 'denúncia procedente recente segura o nível abaixo da excelência',
      'ok', ((select level from public.pro_scores where professional_id = p) = 4), 'obtido', (select level::text from public.pro_scores where professional_id = p));
    update public.pro_score_events set created_at = now() - interval '120 days' where professional_id = p and kind = 'denuncia_procedente';
    perform public.apply_pro_inactivity();
    res := res || jsonb_build_object('teste', 'passados 90 dias a excelência é liberada na reavaliação semanal',
      'ok', ((select level from public.pro_scores where professional_id = p) = 5), 'obtido', (select level::text from public.pro_scores where professional_id = p));

    -- Visibilidade e permissões.
    r := pg_temp.as_user(p, 'authenticated', format('select score from public.get_pro_status(%L)', p));
    res := res || jsonb_build_object('teste', 'o profissional vê a própria pontuação', 'ok', (r ~ '^[0-9]+$'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', format('select coalesce(score::text, ''oculta'') from public.get_pro_status(%L)', p));
    res := res || jsonb_build_object('teste', 'outras pessoas NÃO veem a pontuação exata', 'ok', (r = 'oculta'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', format('select level_code from public.get_pro_status(%L)', p));
    res := res || jsonb_build_object('teste', 'o nível (selo) é público', 'ok', (r = 'excelencia'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.pro_score_events where professional_id = %L', p));
    res := res || jsonb_build_object('teste', 'outras pessoas NÃO leem o histórico de pontos', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', 'select count(*) from public.get_my_pro_events()');
    res := res || jsonb_build_object('teste', 'o profissional lê o próprio histórico', 'ok', (r::integer > 0), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', format('insert into public.pro_score_events (professional_id, kind, points, ref_type, ref_id) values (%L, ''ajuste_admin'', 999, ''x'', gen_random_uuid())', p));
    res := res || jsonb_build_object('teste', 'NÃO dá pontos a si mesmo direto na tabela', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(p, 'authenticated', format('select public.admin_adjust_pro_score(%L, 500, ''quero mais'')', p));
    res := res || jsonb_build_object('teste', 'profissional NÃO ajusta a própria pontuação', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(g, 'authenticated', format('select public.admin_adjust_pro_score(%L, -10, ''teste de ajuste'')', p));
    res := res || jsonb_build_object('teste', 'administração ajusta a pontuação com motivo', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(g, 'authenticated', format('select public.admin_adjust_pro_score(%L, -10, '''')', p));
    res := res || jsonb_build_object('teste', 'ajuste sem motivo é recusado', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(null, 'anon', 'select public.get_pro_rules()');
    res := res || jsonb_build_object('teste', 'anon NÃO lê as regras', 'ok', (r like 'ERRO%'), 'obtido', left(r, 80));

    -- Ausência: quem some por 14 dias perde 5 por semana; não duplica na mesma semana.
    update public.professionals set verified_at = now() - interval '60 days' where user_id = q;
    delete from public.pro_score_events where professional_id = q;
    delete from public.pro_scores where professional_id = q;
    perform public._pro_award(q, 'ajuste_admin', 'admin', gen_random_uuid(), 'base', 50);
    update public.pro_score_events set created_at = now() - interval '30 days' where professional_id = q;
    s0 := (select score from public.pro_scores where professional_id = q);
    perform public.apply_pro_inactivity();
    perform public.apply_pro_inactivity();
    s1 := (select score from public.pro_scores where professional_id = q);
    res := res || jsonb_build_object('teste', 'ausência tira 5 pontos uma vez por semana', 'ok', (s0 - s1 = 5), 'obtido', (s0 - s1)::text);
  end;

  -- ------------------------------------------------------------ PERFIL DE MEMBROS
  declare
    mc uuid; appt_id uuid; price integer;
  begin
    -- p está no nível 5 (testes de pontuação); q ficou no nível 1.
    r := pg_temp.as_user(q, 'authenticated',
      'select public.save_member_plan(''Plano'', ''desc'', 2500, 10, array[''a''], false)');
    res := res || jsonb_build_object('teste', 'nível 1 NÃO cria perfil de membros', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(p, 'authenticated',
      'select public.save_member_plan(''Plano da Hélena'', ''conteúdo e desconto'', 2500, 20, array[''Receitas exclusivas'', ''Lives''], true)');
    res := res || jsonb_build_object('teste', 'ativar sem conta de recebimento é recusado', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));
    r := pg_temp.as_user(p, 'authenticated',
      'select public.save_member_plan(''Plano da Hélena'', ''conteúdo e desconto'', 500, 20, array[''x''], false)');
    res := res || jsonb_build_object('teste', 'mensalidade abaixo de R$ 10 é recusada', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));
    insert into public.pro_stripe_accounts (professional_id, stripe_account_id, charges_enabled) values (p, 'acct_zzqx', true);
    r := pg_temp.as_user(p, 'authenticated',
      'select public.save_member_plan(''Plano da Hélena'', ''conteúdo e desconto'', 2500, 20, array[''Receitas exclusivas'', ''Lives''], true)');
    res := res || jsonb_build_object('teste', 'com conta conectada e nível, o plano é ativado', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 100));

    r := pg_temp.as_user(a, 'authenticated', format('select price_cents || ''/'' || coalesce(fee_percent::text, '''') from public.get_member_plan(%L)', p));
    res := res || jsonb_build_object('teste', 'visitante vê o plano ativo, sem a taxa', 'ok', (r = '2500/'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', format('select fee_percent from public.get_member_plan(%L)', p));
    res := res || jsonb_build_object('teste', 'o dono vê a taxa do nível (10% no nível 5)', 'ok', (r = '10'), 'obtido', r);

    -- Conteúdo exclusivo.
    r := pg_temp.as_user(p, 'authenticated', 'select public.publish_member_content(''Cardápio da semana'', ''Só para membros'', null) is not null');
    res := res || jsonb_build_object('teste', 'profissional de nível 3+ publica conteúdo exclusivo', 'ok', (r in ('t', 'true')), 'obtido', r);
    r := pg_temp.as_user(q, 'authenticated', 'select public.publish_member_content(''x'', ''y'', null)');
    res := res || jsonb_build_object('teste', 'nível 1 NÃO publica conteúdo exclusivo', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.member_content where professional_id = %L', p));
    res := res || jsonb_build_object('teste', 'quem não é membro NÃO lê o conteúdo exclusivo', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', format('select content_count from public.get_member_plan(%L)', p));
    res := res || jsonb_build_object('teste', 'o visitante vê só quantos conteúdos existem', 'ok', (r = '1'), 'obtido', r);

    -- Assinatura em dia libera conteúdo e dá desconto.
    insert into public.member_subscriptions (professional_id, member_id, status, price_cents, stripe_subscription_id, current_period_end)
      values (p, a, 'ativa', 2500, 'sub_zzqx_a', now() + interval '20 days');
    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.member_content where professional_id = %L', p));
    res := res || jsonb_build_object('teste', 'membro lê o conteúdo exclusivo', 'ok', (r = '1'), 'obtido', r);
    r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.member_content where professional_id = %L', p));
    res := res || jsonb_build_object('teste', 'outro usuário continua sem acesso', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.member_subscriptions where professional_id = %L', p));
    res := res || jsonb_build_object('teste', 'membro vê a própria assinatura', 'ok', (r = '1'), 'obtido', r);
    r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.member_subscriptions where professional_id = %L', p));
    res := res || jsonb_build_object('teste', 'outros NÃO veem assinaturas alheias', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', 'select count(*) from public.my_subscribers()');
    res := res || jsonb_build_object('teste', 'o profissional vê seus assinantes', 'ok', (r = '1'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.my_subscribers()');
    res := res || jsonb_build_object('teste', 'quem não é o profissional não vê assinantes de ninguém', 'ok', (r = '0'), 'obtido', r);

    -- Desconto de 20% numa consulta de preço 20000.
    update public.professionals set consultation_price_cents = 20000, accepting_patients = true where user_id = p;
    insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality, status, price_cents, hold_expires_at, created_by)
      values (p, a, now() + interval '9 days', now() + interval '9 days 1 hour', 'online', 'aguardando_pagamento', 20000, now() + interval '30 minutes', a)
      returning id, price_cents into appt_id, price;
    res := res || jsonb_build_object('teste', 'membro paga 20% a menos na consulta', 'ok', (price = 16000), 'obtido', price::text);
    insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality, status, price_cents, hold_expires_at, created_by)
      values (p, b, now() + interval '10 days', now() + interval '10 days 1 hour', 'online', 'aguardando_pagamento', 20000, now() + interval '30 minutes', b)
      returning price_cents into price;
    res := res || jsonb_build_object('teste', 'quem não é membro paga o preço cheio', 'ok', (price = 20000), 'obtido', price::text);

    -- Assinatura cancelada fora do período perde o acesso; cancelando ainda vale até o fim do período.
    update public.member_subscriptions set status = 'cancelando' where stripe_subscription_id = 'sub_zzqx_a';
    res := res || jsonb_build_object('teste', 'assinatura cancelando mantém o acesso até o fim do período', 'ok', public.is_member(p, a), 'obtido', 'cancelando');
    update public.member_subscriptions set current_period_end = now() - interval '1 day' where stripe_subscription_id = 'sub_zzqx_a';
    res := res || jsonb_build_object('teste', 'período vencido encerra o acesso', 'ok', not public.is_member(p, a), 'obtido', 'vencida');
    update public.member_subscriptions set status = 'inadimplente', current_period_end = now() + interval '5 days' where stripe_subscription_id = 'sub_zzqx_a';
    res := res || jsonb_build_object('teste', 'inadimplente NÃO tem acesso', 'ok', not public.is_member(p, a), 'obtido', 'inadimplente');

    -- Nada de gravar assinatura pelo app.
    r := pg_temp.as_user(b, 'authenticated', format('insert into public.member_subscriptions (professional_id, member_id, status, price_cents) values (%L, %L, ''ativa'', 100)', p, b));
    res := res || jsonb_build_object('teste', 'NÃO cria assinatura direto pelo app', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', format('select public.upsert_member_subscription(%L, %L, ''ativa'', 100, ''sub_x'', ''cus_x'', now())', p, b));
    res := res || jsonb_build_object('teste', 'NÃO chama a gravação do servidor pelo app', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

    -- Faturas e divisão.
    perform public.record_member_invoice('sub_zzqx_a', 'in_zzqx_1', 2500, 250);
    perform public.record_member_invoice('sub_zzqx_a', 'in_zzqx_1', 2500, 250);
    r := pg_temp.as_user(p, 'authenticated', 'select gross_cents || ''/'' || fee_cents || ''/'' || net_cents || ''/'' || invoices from public.my_member_earnings(30)');
    res := res || jsonb_build_object('teste', 'ganhos: valor, parte da plataforma e líquido (fatura não duplica)', 'ok', (r = '2500/250/2250/1'), 'obtido', r);
    r := pg_temp.as_user(b, 'authenticated', 'select invoices from public.my_member_earnings(30)');
    res := res || jsonb_build_object('teste', 'outro usuário não tem ganhos', 'ok', (r = '0'), 'obtido', r);

    -- Perder o nível desativa a oferta.
    perform public._pro_award(p, 'ajuste_admin', 'admin', gen_random_uuid(), 'teste', -5000);
    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_member_plan(%L)', p));
    res := res || jsonb_build_object('teste', 'ao perder o nível, o plano deixa de ser oferecido', 'ok', (r = '0'), 'obtido', r);
  end;

  -- ------------------------------------------------ ABA PROFISSIONAIS DO FEED
  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_feed(''profissionais'', null, null, null, null, null, null, 100) where author_id = %L', p));
  res := res || jsonb_build_object('teste', 'escopo profissionais traz as publicações de profissionais', 'ok', (r::integer >= 1), 'obtido', r);
  r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.get_feed(''profissionais'', null, null, null, null, null, null, 100) where author_id <> all (select user_id from public.professionals)'));
  res := res || jsonb_build_object('teste', 'escopo profissionais NÃO traz publicações de quem não é profissional', 'ok', (r = '0'), 'obtido', r);

  -- ------------------------------------------------------- NOTIFICAÇÕES PUSH
  declare
    rid uuid;
    n_claim integer;
  begin
    r := pg_temp.as_user(a, 'authenticated', 'select public.push_subscribe(''https://push.teste.invalid/a1'', ''chave-p256dh'', ''chave-auth'', ''teste'')');
    res := res || jsonb_build_object('teste', 'inscreve o próprio aparelho', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.push_subscriptions');
    res := res || jsonb_build_object('teste', 'NÃO vê o aparelho de outra pessoa', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(b, 'authenticated', format('insert into public.push_subscriptions (endpoint, user_id, p256dh, auth) values (''https://push.teste.invalid/x'', %L, ''p'', ''a'')', a));
    res := res || jsonb_build_object('teste', 'NÃO inscreve aparelho em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', format('insert into public.reminders (user_id, kind, title, time_of_day) values (%L, ''refeicao'', ''x'', ''08:00'')', a));
    res := res || jsonb_build_object('teste', 'NÃO cria lembrete para outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.push_claim()');
    res := res || jsonb_build_object('teste', 'NÃO chama o envio de push pelo app', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'update public.push_settings set timezone = ''Lugar/Inexistente''');
    res := res || jsonb_build_object('teste', 'recusa fuso horário inválido', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

    -- Lembrete de agora (no fuso padrão) é entregue uma vez só.
    insert into public.reminders (user_id, kind, title, time_of_day)
    values (a, 'refeicao', 'Almoço de teste', ((now() at time zone 'America/Sao_Paulo') - interval '1 minute')::time)
    returning id into rid;
    select count(*) into n_claim from public.push_claim() c where c.payload ->> 'tag' = 'lembrete-' || rid;
    res := res || jsonb_build_object('teste', 'lembrete na hora é entregue', 'ok', (n_claim = 1), 'obtido', n_claim);
    select count(*) into n_claim from public.push_claim() c where c.payload ->> 'tag' = 'lembrete-' || rid;
    res := res || jsonb_build_object('teste', 'lembrete NÃO é entregue duas vezes no mesmo dia', 'ok', (n_claim = 0), 'obtido', n_claim);

    -- Aviso do site entra na fila e sai no envio; categoria desligada não vira push.
    -- (um teste anterior desligou a categoria social de A no site; aqui ela volta a valer)
    update public.user_settings set notification_prefs = notification_prefs - 'social' where id = a;
    perform public.notify(a, 'seguidor', f, 'profile', f::text);
    select count(*) into n_claim from public.push_claim() c where c.kind = 'aviso' and c.user_id = a;
    res := res || jsonb_build_object('teste', 'aviso do site vira push', 'ok', (n_claim = 1), 'obtido', n_claim);
    update public.push_settings set categories = '{"social": false}' where user_id = a;
    perform public.notify(a, 'seguidor', b, 'profile', b::text);
    select count(*) into n_claim from public.push_claim() c where c.kind = 'aviso' and c.user_id = a;
    res := res || jsonb_build_object('teste', 'categoria desligada NÃO vira push', 'ok', (n_claim = 0), 'obtido', n_claim);
  end;

  -- ------------------------------------------------------- ÁGUA DO DIA
  update public.care_links set status = 'ativo' where patient_id = c and professional_id = p;
  r := pg_temp.as_user(c, 'authenticated', 'select public.water_add(current_date, 3)');
  res := res || jsonb_build_object('teste', 'registra copos de água', 'ok', (r = '3'), 'obtido', r);
  r := pg_temp.as_user(c, 'authenticated', 'select public.water_add(current_date, -10)');
  res := res || jsonb_build_object('teste', 'copos de água nunca ficam negativos', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(c, 'authenticated', 'select public.water_add(current_date - 30, 1)');
  res := res || jsonb_build_object('teste', 'NÃO reescreve água de dias antigos', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.water_days where user_id = %L', c));
  res := res || jsonb_build_object('teste', 'NÃO vê a água de outra pessoa', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.water_days where user_id = %L', c));
  res := res || jsonb_build_object('teste', 'profissional vinculado vê a água do paciente', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.water_days (user_id, day, glasses, goal) values (%L, current_date, 5, 8)', c));
  res := res || jsonb_build_object('teste', 'NÃO grava água em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', format('select public.water_set_goal(5, null, %L)', c));
  res := res || jsonb_build_object('teste', 'sem vínculo NÃO muda a meta de água', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(p, 'authenticated', format('select public.water_set_goal(6, null, %L)', c));
  res := res || jsonb_build_object('teste', 'profissional vinculado ajusta a meta de água', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
  r := (select count(*)::text from public.notifications where user_id = c and type = 'meta_agua');
  res := res || jsonb_build_object('teste', 'paciente é avisado da meta de água nova', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(c, 'authenticated', 'select goal from public.water_days where day = current_date');
  res := res || jsonb_build_object('teste', 'meta nova já vale para hoje', 'ok', (r = '6'), 'obtido', r);

  -- ------------------------------------------------------- HISTÓRICO DE RÓTULOS
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.label_scans (user_id, source, barcode, name) values (auth.uid(), ''codigo'', ''7891000100103'', ''Produto teste'')');
  res := res || jsonb_build_object('teste', 'guarda rótulo lido no histórico', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.label_scans (user_id, source, barcode, name) values (auth.uid(), ''codigo'', ''7891000100103'', ''Produto teste'')');
  r := pg_temp.as_user(a, 'authenticated', 'select count(*) from public.label_scans where barcode = ''7891000100103''');
  res := res || jsonb_build_object('teste', 'mesmo código lido de novo NÃO duplica', 'ok', (r = '1'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.label_scans');
  res := res || jsonb_build_object('teste', 'NÃO vê o histórico de rótulos de outra pessoa', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.label_scans (user_id, source, name) values (%L, ''foto'', ''x'')', a));
  res := res || jsonb_build_object('teste', 'NÃO grava rótulo no histórico de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  -- ------------------------------------------------------- NINA E O ACOMPANHAMENTO
  r := pg_temp.as_user(c, 'authenticated', 'select public.nina_care_allowed()');
  res := res || jsonb_build_object('teste', 'Nina NÃO usa o acompanhamento sem permissão', 'ok', (r = 'f'), 'obtido', r);
  r := pg_temp.as_user(c, 'authenticated', 'select public.record_consent(''nina_acompanhamento'', ''v1'', true)');
  r := pg_temp.as_user(c, 'authenticated', 'select public.nina_care_allowed()');
  res := res || jsonb_build_object('teste', 'paciente autoriza a Nina a usar o acompanhamento', 'ok', (r = 't'), 'obtido', r);
  r := pg_temp.as_user(p, 'authenticated', format('select public.nina_care_allowed(%L)', c));
  res := res || jsonb_build_object('teste', 'nutri vinculada vê que o paciente autorizou', 'ok', (r = 't'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('select public.nina_care_allowed(%L)', c));
  res := res || jsonb_build_object('teste', 'quem não acompanha NÃO vê a permissão da Nina', 'ok', (r = 'f'), 'obtido', r);
  r := pg_temp.as_user(c, 'authenticated', 'select public.record_consent(''nina_acompanhamento'', ''v1'', false)');
  r := pg_temp.as_user(c, 'authenticated', 'select public.nina_care_allowed()');
  res := res || jsonb_build_object('teste', 'paciente revoga a permissão da Nina', 'ok', (r = 'f'), 'obtido', r);

  -- ------------------------------------------------------- GELADEIRA (receitas e lista de compras)
  declare
    rec_ok uuid;
    rec_oculta uuid;
  begin
    insert into public.posts (author_id, body, type, title, recipe)
    values (f, 'receita de teste', 'receita', 'Zzqx Omelete',
            '{"ingredients": ["2 ovos", "1 tomate"], "steps": ["bater"]}')
    returning id into rec_ok;
    insert into public.posts (author_id, body, type, title, recipe, hidden)
    values (b, 'receita oculta', 'receita', 'Zzqx Oculta', '{"ingredients": ["3 ovos"]}', false)
    returning id into rec_oculta;
    update public.posts set hidden = true where id = rec_oculta;

    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.recipes_with_ingredients(array[''ovo'']) where id = %L', rec_ok));
    res := res || jsonb_build_object('teste', 'acha receita da comunidade pelo ingrediente', 'ok', (r = '1'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.recipes_with_ingredients(array[''ovo'']) where id = %L', rec_oculta));
    res := res || jsonb_build_object('teste', 'NÃO acha receita oculta pela moderação', 'ok', (r = '0'), 'obtido', r);

    r := pg_temp.as_user(a, 'authenticated', 'insert into public.shopping_items (user_id, text, source) values (auth.uid(), ''alho'', ''geladeira'')');
    res := res || jsonb_build_object('teste', 'põe item na própria lista de compras', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.shopping_items');
    res := res || jsonb_build_object('teste', 'NÃO vê a lista de compras de outra pessoa', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(b, 'authenticated', format('insert into public.shopping_items (user_id, text) values (%L, ''x'')', a));
    res := res || jsonb_build_object('teste', 'NÃO põe item na lista de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', format('insert into public.saved_recipes (user_id, source, title) values (%L, ''nina'', ''x'')', a));
    res := res || jsonb_build_object('teste', 'NÃO guarda receita em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  end;

  -- ------------------------------------------------------- CARDÁPIO DA SEMANA
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.weekly_menus (user_id, week_start, budget, meals) values (auth.uid(), ''2026-10-12'', ''economico'', ''{"0-almoco": {"title": "Arroz, feijão e ovo"}}'')');
  res := res || jsonb_build_object('teste', 'cria o próprio cardápio da semana', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.weekly_menus (user_id, week_start) values (auth.uid(), ''2026-10-14'')');
  res := res || jsonb_build_object('teste', 'cardápio só começa na segunda-feira', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.weekly_menus');
  res := res || jsonb_build_object('teste', 'NÃO vê o cardápio de outra pessoa', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', format('insert into public.weekly_menus (user_id, week_start) values (%L, ''2026-10-19'')', a));
  res := res || jsonb_build_object('teste', 'NÃO cria cardápio em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.shopping_items (user_id, text, source, section) values (auth.uid(), ''1 maço de couve'', ''cardapio'', ''hortifruti'')');
  res := res || jsonb_build_object('teste', 'item do cardápio entra na lista com a seção', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));

  -- ------------------------------------------------------- CALENDÁRIO DA FEIRA
  r := pg_temp.as_user(a, 'authenticated', 'update public.user_settings set season_uf = ''PE'' where id = auth.uid()');
  res := res || jsonb_build_object('teste', 'escolhe o próprio estado da feira', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'update public.user_settings set season_uf = ''XX'' where id = auth.uid()');
  res := res || jsonb_build_object('teste', 'NÃO aceita estado inexistente', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  -- ------------------------------------------------------- LANCHEIRA DA SEMANA
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.trail_profiles (id, owner_id, kind, name) values (''ffffffff-0000-4000-a000-0000000000c1'', auth.uid(), ''kid'', ''Zzqx Criança'')');
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.lunchbox_profiles (profile_id, age_range, allergies) values (''ffffffff-0000-4000-a000-0000000000c1'', ''4-6'', ''amendoim'')');
  res := res || jsonb_build_object('teste', 'responsável conta sobre a própria criança', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(a, 'authenticated', 'insert into public.lunchboxes (profile_id, week_start, snacks) values (''ffffffff-0000-4000-a000-0000000000c1'', ''2026-10-12'', ''{"0-manha": {"title": "Pão com queijo"}}'')');
  res := res || jsonb_build_object('teste', 'responsável monta a lancheira da própria criança', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.lunchboxes');
  res := res || jsonb_build_object('teste', 'NÃO vê a lancheira de criança de outra conta', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.lunchbox_profiles');
  res := res || jsonb_build_object('teste', 'NÃO vê alergias de criança de outra conta', 'ok', (r = '0'), 'obtido', r);
  r := pg_temp.as_user(b, 'authenticated', 'insert into public.lunchboxes (profile_id, week_start) values (''ffffffff-0000-4000-a000-0000000000c1'', ''2026-10-19'')');
  res := res || jsonb_build_object('teste', 'NÃO monta lancheira para criança de outra conta', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  r := pg_temp.as_user(c, 'authenticated', 'insert into public.trail_profiles (id, owner_id, kind, name) values (''ffffffff-0000-4000-a000-0000000000c2'', auth.uid(), ''adult'', ''Zzqx Adulto'')');
  r := pg_temp.as_user(c, 'authenticated', 'insert into public.lunchboxes (profile_id, week_start) values (''ffffffff-0000-4000-a000-0000000000c2'', ''2026-10-19'')');
  res := res || jsonb_build_object('teste', 'lancheira só para perfil infantil', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

  -- ------------------------------------------------------- PAINEL DO PROFISSIONAL (adesão e modelos)
  declare
    plano uuid := 'ffffffff-0000-4000-a000-0000000000d1';
    modelo text;
  begin
    r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.adherence_overview(7) where patient_id = %L', c));
    res := res || jsonb_build_object('teste', 'profissional vê a adesão do paciente vinculado', 'ok', (r = '1'), 'obtido', r);
    r := pg_temp.as_user(q, 'authenticated', format('select count(*) from public.adherence_overview(7) where patient_id = %L', c));
    res := res || jsonb_build_object('teste', 'NÃO vê adesão de paciente sem vínculo', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.adherence_daily(%L, 30)', c));
    res := res || jsonb_build_object('teste', 'relatório de 30 dias do paciente vinculado', 'ok', (r = '30'), 'obtido', r);
    r := pg_temp.as_user(q, 'authenticated', format('select count(*) from public.adherence_daily(%L, 30)', c));
    res := res || jsonb_build_object('teste', 'NÃO abre relatório de paciente sem vínculo', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.adherence_daily(%L, 30)', c));
    res := res || jsonb_build_object('teste', 'NÃO profissional NÃO abre relatório', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

    r := pg_temp.as_user(p, 'authenticated', format('insert into public.meal_plans (id, patient_id, professional_id, title) values (%L, %L, auth.uid(), ''Zzqx Plano'')', plano, c));
    r := pg_temp.as_user(p, 'authenticated', format('insert into public.meal_plan_meals (plan_id, name, position) values (%L, ''Almoço'', 0)', plano));
    modelo := pg_temp.as_user(p, 'authenticated', format('select public.save_meal_plan_template(%L, ''Zzqx Modelo'')', plano));
    res := res || jsonb_build_object('teste', 'salva plano como modelo', 'ok', (modelo not like 'ERRO%' and modelo <> '<vazio>'), 'obtido', left(modelo, 90));
    r := pg_temp.as_user(q, 'authenticated', format('select public.save_meal_plan_template(%L, ''roubo'')', plano));
    res := res || jsonb_build_object('teste', 'NÃO salva modelo do plano de outro profissional', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(q, 'authenticated', 'select count(*) from public.meal_plan_templates');
    res := res || jsonb_build_object('teste', 'NÃO vê modelos de outro profissional', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(q, 'authenticated', 'insert into public.meal_plan_templates (professional_id, title) values (auth.uid(), ''x'')');
    res := res || jsonb_build_object('teste', 'modelo só nasce de um plano (sem insert direto)', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    if modelo not like 'ERRO%' then
      r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.create_plan_from_template(%L, %L)', modelo, c));
      res := res || jsonb_build_object('teste', 'cria plano a partir do modelo', 'ok', (r = '1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.create_plan_from_template(%L, %L)', modelo, a));
      res := res || jsonb_build_object('teste', 'NÃO cria plano de modelo para quem não é paciente', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(q, 'authenticated', format('select count(*) from public.create_plan_from_template(%L, %L)', modelo, c));
      res := res || jsonb_build_object('teste', 'NÃO usa modelo de outro profissional', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    end if;
  end;

  -- ------------------------------------------------------- FUNÇÕES (registros do dia)
  if to_regclass('public.daily_checkins') is not null then
    r := pg_temp.as_user(a, 'authenticated', 'insert into public.daily_checkins (user_id, day, habits, mood) values (auth.uid(), current_date, array[''water'', ''veg''], 1)');
    res := res || jsonb_build_object('teste', 'registra os próprios hábitos e humor do dia', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'update public.daily_checkins set pledge = true where day = current_date');
    res := res || jsonb_build_object('teste', 'marca o compromisso da semana no próprio registro', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.daily_checkins');
    res := res || jsonb_build_object('teste', 'NÃO vê os registros do dia de outra pessoa', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(b, 'authenticated', format('insert into public.daily_checkins (user_id, day) values (%L, current_date - 1)', a));
    res := res || jsonb_build_object('teste', 'NÃO cria registro do dia em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', 'update public.daily_checkins set mood = 3');
    res := res || jsonb_build_object('teste', 'NÃO altera registro do dia de outra pessoa', 'ok', (r = 'OK:0'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'insert into public.daily_checkins (user_id, day, habits) values (auth.uid(), current_date - 1, array[''cerveja''])');
    res := res || jsonb_build_object('teste', 'NÃO aceita hábito fora da lista', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    if exists (select 1 from information_schema.columns where table_name = 'user_settings' and column_name = 'habit_choice') then
      r := pg_temp.as_user(a, 'authenticated', 'update public.daily_checkins set habits = array[''fruit'', ''beans'', ''no_soda''] where day = current_date');
      res := res || jsonb_build_object('teste', 'aceita hábitos novos do catálogo', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(a, 'authenticated', 'update public.user_settings set habit_choice = array[''water'', ''fruit'', ''slow'', ''outdoor''] where id = auth.uid()');
      res := res || jsonb_build_object('teste', 'escolhe os próprios hábitos (3 a 8)', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(a, 'authenticated', 'update public.user_settings set habit_choice = array[''water'', ''fruit''] where id = auth.uid()');
      res := res || jsonb_build_object('teste', 'NÃO escolhe menos de 3 hábitos', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(a, 'authenticated', 'update public.user_settings set habit_choice = array[''water'', ''fruit'', ''cerveja''] where id = auth.uid()');
      res := res || jsonb_build_object('teste', 'NÃO escolhe hábito fora do catálogo', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    end if;
    r := pg_temp.as_user(a, 'authenticated', 'insert into public.daily_checkins (user_id, day, mood) values (auth.uid(), current_date - 30, 1)');
    res := res || jsonb_build_object('teste', 'NÃO reescreve registro de semanas atrás', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'select (public.export_my_data() -> ''registros_do_dia'') is not null');
    res := res || jsonb_build_object('teste', 'exportação de dados inclui os registros do dia', 'ok', (r = 't'), 'obtido', left(r, 90));
  end if;

  -- ------------------------------------------------ PARCEIRO DE JORNADA (N6)
  -- Aqui A e E são amigos (pedido aceito acima); F é estranho; B bloqueou A.
  if to_regclass('public.journey_pairs') is not null then
    r := pg_temp.as_user(f, 'authenticated', format('select status from public.journey_invite(%L)', a));
    res := res || jsonb_build_object('teste', 'estranho NÃO convida para a dupla', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', format('select status from public.journey_invite(%L)', b));
    res := res || jsonb_build_object('teste', 'NÃO convida quem bloqueou (ou desfez a amizade)', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', format('select status from public.journey_invite(%L)', e));
    res := res || jsonb_build_object('teste', 'convida um amigo para a dupla (fica pendente)', 'ok', (r = 'pendente'), 'obtido', left(r, 90));
    r := pg_temp.as_user(f, 'authenticated', 'select count(*) from public.journey_pairs');
    res := res || jsonb_build_object('teste', 'terceiro NÃO vê a dupla dos outros', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(a, 'authenticated', 'select status from public.journey_respond((select id from public.journey_pairs limit 1), true)');
    res := res || jsonb_build_object('teste', 'quem convidou NÃO aceita o próprio convite', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(e, 'authenticated', 'select status from public.journey_respond((select id from public.journey_pairs limit 1), true)');
    res := res || jsonb_build_object('teste', 'convidado aceita e a dupla fica ativa', 'ok', (r = 'ativa'), 'obtido', left(r, 90));
    res := res || jsonb_build_object('teste', 'quem convidou é avisado do aceite',
      'ok', exists (select 1 from public.notifications where user_id = a and type = 'dupla_aceita' and actor_id = e),
      'obtido', 'verificado como superusuário');
    r := pg_temp.as_user(a, 'authenticated', 'select mood from public.journey_checkin(current_date, ''cuidei'', ''BomDiaDupla'')');
    res := res || jsonb_build_object('teste', 'faz o check-in do dia', 'ok', (r = 'cuidei'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'insert into public.journey_checkins (user_id, day, mood) values (auth.uid(), current_date - 1, ''cuidei'')');
    res := res || jsonb_build_object('teste', 'NÃO grava check-in direto na tabela (só pela função)', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', 'select mood from public.journey_checkin(current_date - 5, ''cuidei'')');
    res := res || jsonb_build_object('teste', 'NÃO faz check-in de dias atrás', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', format('select mood from public.journey_checkin(current_date, ''dificil'', %L)', repeat('x', 141)));
    res := res || jsonb_build_object('teste', 'NÃO aceita recado com mais de 140 caracteres', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(e, 'authenticated', 'select public.journey_partner_status(current_date) -> ''partner_today'' ->> ''note''');
    res := res || jsonb_build_object('teste', 'parceiro vê o check-in de hoje', 'ok', (r = 'BomDiaDupla'), 'obtido', left(r, 90));
    r := pg_temp.as_user(e, 'authenticated', 'select count(*) from public.journey_checkins');
    res := res || jsonb_build_object('teste', 'parceiro NÃO lê o histórico de check-ins direto na tabela', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(f, 'authenticated', 'select public.journey_partner_status(current_date) is null');
    res := res || jsonb_build_object('teste', 'quem não tem dupla não vê nada', 'ok', (r = 't'), 'obtido', left(r, 90));
    r := pg_temp.as_user(f, 'authenticated', format('select public.journey_partner_id(%L)', a));
    res := res || jsonb_build_object('teste', 'NÃO descobre com quem outra pessoa faz dupla', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    perform pg_temp.as_user(e, 'authenticated', 'select public.journey_cheer(current_date)');
    perform pg_temp.as_user(e, 'authenticated', 'select public.journey_cheer(current_date)');
    res := res || jsonb_build_object('teste', 'mandar força avisa só uma vez por dia',
      'ok', (select count(*) = 1 from public.notifications where user_id = a and type = 'dupla_forca'),
      'obtido', (select count(*)::text from public.notifications where user_id = a and type = 'dupla_forca'));
    r := pg_temp.as_user(a, 'authenticated', 'select (public.export_my_data() -> ''jornada_checkins'') is not null');
    res := res || jsonb_build_object('teste', 'exportação de dados inclui a jornada', 'ok', (r = 't'), 'obtido', left(r, 90));
    r := pg_temp.as_user(a, 'authenticated', format('select public.remove_friendship(%L)', e));
    res := res || jsonb_build_object('teste', 'desfazer a amizade encerra a dupla',
      'ok', not exists (select 1 from public.journey_pairs where a in (user_a, user_b)),
      'obtido', 'verificado como superusuário');
  end if;

  -- ------------------------------------------------ MINHA CASA (F1)
  -- B e C são amigos; F não é amigo de B.
  if to_regclass('public.households') is not null then
    declare
      hid uuid;
      code text;
    begin
      r := pg_temp.as_user(b, 'authenticated', 'select name from public.household_create(''CasaTeste'', ''🏡'')');
      res := res || jsonb_build_object('teste', 'cria uma casa', 'ok', (r = 'CasaTeste'), 'obtido', left(r, 90));
      select household_id into hid from public.household_members where user_id = b;
      r := pg_temp.as_user(b, 'authenticated', 'select name from public.household_create(''Outra'')');
      res := res || jsonb_build_object('teste', 'NÃO cria uma segunda casa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', 'select count(*) from public.households');
      res := res || jsonb_build_object('teste', 'quem não mora NÃO vê a casa', 'ok', (r = '0'), 'obtido', r);
      code := pg_temp.as_user(b, 'authenticated', 'select public.household_invite_code() ->> ''code''');
      res := res || jsonb_build_object('teste', 'gera código de convite de 6 letras', 'ok', (code ~ '^[A-Z2-9]{6}$'), 'obtido', left(code, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select public.household_preview(%L) ->> ''name''', lower(code)));
      res := res || jsonb_build_object('teste', 'com o código, vê só o nome da casa', 'ok', (r = 'CasaTeste'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', 'select name from public.household_join(''ZZZZZZ'')');
      res := res || jsonb_build_object('teste', 'NÃO entra com código errado', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select name from public.household_join(%L)', code));
      res := res || jsonb_build_object('teste', 'entra na casa com o código', 'ok', (r = 'CasaTeste'), 'obtido', left(r, 90));
      res := res || jsonb_build_object('teste', 'quem já mora é avisado da entrada',
        'ok', exists (select 1 from public.notifications where user_id = b and type = 'casa_novo_membro' and actor_id = f),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.shopping_items (user_id, household_id, text) values (auth.uid(), %L, ''Leite'')', hid));
      res := res || jsonb_build_object('teste', 'adiciona item na lista da casa', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', format('insert into public.shopping_items (user_id, household_id, text) values (auth.uid(), %L, ''Intruso'')', hid));
      res := res || jsonb_build_object('teste', 'quem não mora NÃO põe item na lista da casa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', 'select count(*) from public.shopping_items where household_id is not null');
      res := res || jsonb_build_object('teste', 'quem não mora NÃO vê a lista da casa', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(f, 'authenticated', format('update public.shopping_items set done = true where household_id = %L', hid));
      res := res || jsonb_build_object('teste', 'outro morador marca como comprado', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      res := res || jsonb_build_object('teste', '"comprado por" é quem marcou',
        'ok', exists (select 1 from public.shopping_items where household_id = hid and bought_by = f and user_id = b),
        'obtido', 'verificado como superusuário');
      perform pg_temp.as_user(f, 'authenticated', format('update public.shopping_items set household_id = null, user_id = auth.uid() where household_id = %L', hid));
      res := res || jsonb_build_object('teste', 'NÃO tira o item da casa nem troca quem adicionou',
        'ok', exists (select 1 from public.shopping_items where household_id = hid and user_id = b),
        'obtido', 'verificado como superusuário');
      perform pg_temp.as_user(f, 'authenticated', 'insert into public.shopping_items (user_id, text) values (auth.uid(), ''Pão'')');
      r := pg_temp.as_user(f, 'authenticated', 'select public.household_bring_my_items()');
      res := res || jsonb_build_object('teste', 'leva a lista pessoal para a casa', 'ok', (r = '1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select public.household_remove_member(%L)', b));
      res := res || jsonb_build_object('teste', 'membro comum NÃO tira ninguém da casa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.household_invite_friend(%L)', f));
      res := res || jsonb_build_object('teste', 'NÃO chama pelo app quem não é amigo', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.household_invite_friend(%L)', c));
      res := res || jsonb_build_object('teste', 'chama um amigo para a casa (ele recebe o aviso)',
        'ok', r not like 'ERRO%' and exists (select 1 from public.notifications where user_id = c and type = 'casa_convite'),
        'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', 'select (public.export_my_data() -> ''casa'' ->> ''nome'')');
      res := res || jsonb_build_object('teste', 'exportação de dados inclui a casa', 'ok', (r = 'CasaTeste'), 'obtido', left(r, 90));
      perform pg_temp.as_user(b, 'authenticated', 'select public.household_leave()');
      res := res || jsonb_build_object('teste', 'quando o responsável sai, quem fica assume',
        'ok', exists (select 1 from public.household_members where user_id = f and role = 'responsavel'),
        'obtido', 'verificado como superusuário');
      perform pg_temp.as_user(f, 'authenticated', 'select public.household_leave()');
      res := res || jsonb_build_object('teste', 'quando o último sai, a casa e a lista dela acabam',
        'ok', not exists (select 1 from public.households where id = hid)
              and not exists (select 1 from public.shopping_items where household_id = hid),
        'obtido', 'verificado como superusuário');
    end;
  end if;

  -- --------------------------------------------- MINHA CASA: GELADEIRA E CARDÁPIO (F2)
  if to_regclass('public.fridge_items') is not null then
    declare
      hid uuid;
      code text;
    begin
      perform pg_temp.as_user(c, 'authenticated', 'select public.household_create(''Cozinha'')');
      select household_id into hid from public.household_members where user_id = c;
      code := pg_temp.as_user(c, 'authenticated', 'select public.household_invite_code() ->> ''code''');
      perform pg_temp.as_user(f, 'authenticated', format('select public.household_join(%L)', code));
      r := pg_temp.as_user(f, 'authenticated', format('insert into public.fridge_items (user_id, household_id, text) values (auth.uid(), %L, ''tomate'')', hid));
      res := res || jsonb_build_object('teste', 'põe item na geladeira da casa', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', 'select count(*) from public.fridge_items where household_id is not null');
      res := res || jsonb_build_object('teste', 'outro morador vê a geladeira da casa', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(c, 'authenticated', format('insert into public.fridge_items (user_id, household_id, text) values (auth.uid(), %L, ''Tomate'')', hid));
      res := res || jsonb_build_object('teste', 'NÃO repete item na geladeira (maiúsculas não importam)', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.fridge_items where household_id is not null');
      res := res || jsonb_build_object('teste', 'quem não mora NÃO vê a geladeira da casa', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.fridge_items (user_id, household_id, text) values (auth.uid(), %L, ''intruso'')', hid));
      res := res || jsonb_build_object('teste', 'quem não mora NÃO mexe na geladeira da casa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      perform pg_temp.as_user(f, 'authenticated', 'insert into public.fridge_items (user_id, text) values (auth.uid(), ''cebola'')');
      perform pg_temp.as_user(f, 'authenticated', 'select public.household_bring_my_items()');
      res := res || jsonb_build_object('teste', 'leva a geladeira pessoal para a casa',
        'ok', exists (select 1 from public.fridge_items where household_id = hid and text = 'cebola')
              and not exists (select 1 from public.fridge_items where user_id = f and household_id is null),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(c, 'authenticated', 'select household_id is not null from public.weekly_menu_save(date_trunc(''week'', current_date)::date, ''economico'', ''{}''::jsonb)');
      res := res || jsonb_build_object('teste', 'grava o cardápio da semana da casa', 'ok', (r = 't'), 'obtido', left(r, 90));
      perform pg_temp.as_user(f, 'authenticated', 'select public.weekly_menu_save(date_trunc(''week'', current_date)::date, ''moderado'', ''{}''::jsonb)');
      res := res || jsonb_build_object('teste', 'outro morador muda o mesmo cardápio da casa',
        'ok', (select count(*) = 1 and bool_and(budget = 'moderado' and updated_by = f)
                 from public.weekly_menus where household_id = hid),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(f, 'authenticated', 'update public.weekly_menus set budget = ''livre'' where household_id is not null');
      res := res || jsonb_build_object('teste', 'cardápio da casa só muda pela função', 'ok', (r = 'OK:0' or r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select household_id is null from public.weekly_menu_save(date_trunc(''week'', current_date)::date, ''livre'', ''{}''::jsonb)');
      res := res || jsonb_build_object('teste', 'quem não mora numa casa grava o cardápio pessoal', 'ok', (r = 't'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.weekly_menus where household_id is not null');
      res := res || jsonb_build_object('teste', 'quem não mora NÃO vê o cardápio da casa', 'ok', (r = '0'), 'obtido', r);
      perform pg_temp.as_user(c, 'authenticated', 'select public.household_leave()');
      perform pg_temp.as_user(f, 'authenticated', 'select public.household_leave()');
      res := res || jsonb_build_object('teste', 'casa acabou: geladeira e cardápio dela também',
        'ok', not exists (select 1 from public.fridge_items where household_id = hid)
              and not exists (select 1 from public.weekly_menus where household_id = hid),
        'obtido', 'verificado como superusuário');
    end;
  end if;

  -- ------------------------------------------------ MINHA CASA: LANCHEIRAS E MURAL (F3)
  if to_regclass('public.household_notes') is not null then
    declare
      hid uuid;
      code text;
      k3 uuid := 'ffffffff-0000-4000-a000-0000000000c3';
      note_c uuid;
    begin
      perform pg_temp.as_user(c, 'authenticated', 'select public.household_create(''Lanches'')');
      select household_id into hid from public.household_members where user_id = c;
      code := pg_temp.as_user(c, 'authenticated', 'select public.household_invite_code() ->> ''code''');
      perform pg_temp.as_user(f, 'authenticated', format('select public.household_join(%L)', code));
      insert into public.trail_profiles (id, owner_id, kind, name, avatar) values (k3, c, 'kid', 'Bia', 'nina');
      r := pg_temp.as_user(f, 'authenticated', 'select count(*) from public.household_kids()');
      res := res || jsonb_build_object('teste', 'vê as crianças dos outros moradores', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(f, 'authenticated', format('insert into public.lunchboxes (profile_id, week_start) values (%L, date_trunc(''week'', current_date)::date)', k3));
      res := res || jsonb_build_object('teste', 'adulto da casa monta a lancheira da criança de outro morador', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      res := res || jsonb_build_object('teste', 'a lancheira continua de quem criou o perfil da criança',
        'ok', exists (select 1 from public.lunchboxes where profile_id = k3 and owner_id = c),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(f, 'authenticated', format('insert into public.lunchbox_profiles (profile_id, allergies) values (%L, ''amendoim'')', k3));
      res := res || jsonb_build_object('teste', 'adulto da casa conta as alergias da criança', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.lunchboxes where profile_id = %L', k3));
      res := res || jsonb_build_object('teste', 'quem não mora NÃO vê a lancheira da criança', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.lunchboxes (profile_id, week_start) values (%L, date_trunc(''week'', current_date)::date + 7)', k3));
      res := res || jsonb_build_object('teste', 'quem não mora NÃO monta a lancheira da criança', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.household_kids()');
      res := res || jsonb_build_object('teste', 'quem não mora NÃO vê as crianças da casa', 'ok', (r = '0'), 'obtido', r);

      r := pg_temp.as_user(f, 'authenticated', format('insert into public.household_notes (household_id, body) values (%L, ''sobrou arroz'')', hid));
      res := res || jsonb_build_object('teste', 'escreve no mural da casa', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', 'select count(*) from public.household_notes');
      res := res || jsonb_build_object('teste', 'outro morador lê o mural', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.household_notes');
      res := res || jsonb_build_object('teste', 'quem não mora NÃO lê o mural', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.household_notes (household_id, body) values (%L, ''intruso'')', hid));
      res := res || jsonb_build_object('teste', 'quem não mora NÃO escreve no mural', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      perform pg_temp.as_user(c, 'authenticated', format('insert into public.household_notes (household_id, body) values (%L, ''janto fora'')', hid));
      select id into note_c from public.household_notes where author_id = c;
      r := pg_temp.as_user(f, 'authenticated', format('delete from public.household_notes where id = %L', note_c));
      res := res || jsonb_build_object('teste', 'membro NÃO apaga recado de outra pessoa', 'ok', (r = 'OK:0'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', 'delete from public.household_notes where body = ''sobrou arroz''');
      res := res || jsonb_build_object('teste', 'responsável apaga qualquer recado', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));

      perform pg_temp.as_user(f, 'authenticated', 'select public.household_leave()');
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.lunchboxes where profile_id = %L', k3));
      res := res || jsonb_build_object('teste', 'quem sai da casa deixa de ver as lancheiras das crianças', 'ok', (r = '0'), 'obtido', r);
      perform pg_temp.as_user(c, 'authenticated', 'select public.household_leave()');
    end;
  end if;

  -- ------------------------------------------------ EVENTOS AO VIVO (M8)
  -- Comunidade ativa administrada pelo profissional P; B, C, D e F participam; E não.
  if to_regclass('public.community_events') is not null then
    declare
      ec uuid;
      ev uuid;
      qb uuid;
      qb2 uuid;
    begin
      insert into public.communities (slug, name, category, admin_user_id, professional_id, status)
      values ('zzqx-eventos', 'Zzqx Eventos', 'Zzqx Tema', b, p, 'ativa') returning id into ec;
      insert into public.community_members (community_id, user_id) values (ec, b), (ec, c), (ec, d), (ec, f);
      r := pg_temp.as_user(f, 'authenticated', format('select id from public.event_create(%L, ''Tira-dúvidas'', '''', now() + interval ''1 day'', 60)', ec));
      res := res || jsonb_build_object('teste', 'membro NÃO marca evento na comunidade', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select title from public.event_create(%L, ''Pergunte'', ''Ao vivo'', now() - interval ''1 minute'', 60)', ec));
      res := res || jsonb_build_object('teste', 'profissional da comunidade marca o evento', 'ok', (r = 'Pergunte'), 'obtido', left(r, 90));
      select id into ev from public.community_events where community_id = ec;
      res := res || jsonb_build_object('teste', 'membros são avisados do evento',
        'ok', exists (select 1 from public.notifications where user_id = f and type = 'evento_novo'),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(e, 'authenticated', 'select count(*) from public.community_events');
      res := res || jsonb_build_object('teste', 'quem não participa NÃO vê os eventos', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(e, 'authenticated', format('select id from public.event_ask(%L, ''Posso comer ovo todo dia?'')', ev));
      res := res || jsonb_build_object('teste', 'quem não participa NÃO pergunta', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select body from public.event_ask(%L, ''Posso comer ovo todo dia?'')', ev));
      res := res || jsonb_build_object('teste', 'membro manda pergunta', 'ok', r like '%ovo%', 'obtido', left(r, 90));
      select id into qb from public.event_questions where author_id = b;
      perform pg_temp.as_user(b, 'authenticated', format('select public.event_ask(%L, ''Segunda pergunta aqui'')', ev));
      perform pg_temp.as_user(b, 'authenticated', format('select public.event_ask(%L, ''Terceira pergunta aqui'')', ev));
      r := pg_temp.as_user(b, 'authenticated', format('select id from public.event_ask(%L, ''Quarta pergunta aqui'')', ev));
      res := res || jsonb_build_object('teste', 'até 3 perguntas por pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select public.event_vote(%L)', qb));
      res := res || jsonb_build_object('teste', 'membro vota numa pergunta', 'ok', (r = 't'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.event_vote(%L)', qb));
      res := res || jsonb_build_object('teste', 'NÃO vota na própria pergunta', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select public.event_answer(%L, ''Pode sim'')', qb));
      res := res || jsonb_build_object('teste', 'membro NÃO responde pergunta', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select public.event_answer(%L, ''Pode sim, com variedade'')', qb));
      res := res || jsonb_build_object('teste', 'profissional responde e fixa',
        'ok', r not like 'ERRO%' and exists (select 1 from public.event_questions where id = qb and pinned and answer is not null),
        'obtido', left(r, 90));
      res := res || jsonb_build_object('teste', 'quem perguntou é avisado da resposta',
        'ok', exists (select 1 from public.notifications where user_id = b and type = 'evento_resposta'),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(f, 'authenticated', format('select (array_agg(pinned))[1] from public.event_questions_list(%L)', ev));
      res := res || jsonb_build_object('teste', 'a resposta fixada vem primeiro', 'ok', (r = 't'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.event_delete_question(%L)', qb));
      res := res || jsonb_build_object('teste', 'NÃO apaga pergunta já respondida', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      select id into qb2 from public.event_questions where author_id = b and body like 'Segunda%';
      perform pg_temp.as_user(f, 'authenticated', format('select public.event_flag(%L)', qb2));
      perform pg_temp.as_user(c, 'authenticated', format('select public.event_flag(%L)', qb2));
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.event_questions_list(%L)', ev));
      res := res || jsonb_build_object('teste', 'com 2 denúncias a pergunta continua', 'ok', (r = '3'), 'obtido', r);
      perform pg_temp.as_user(d, 'authenticated', format('select public.event_flag(%L)', qb2));
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.event_questions_list(%L)', ev));
      res := res || jsonb_build_object('teste', 'com 3 denúncias a pergunta some para os membros', 'ok', (r = '2'), 'obtido', r);
      r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.event_questions_list(%L)', ev));
      res := res || jsonb_build_object('teste', 'o profissional ainda vê a pergunta ocultada', 'ok', (r = '3'), 'obtido', r);
      r := pg_temp.as_user(e, 'authenticated', 'select count(*) from public.event_questions');
      res := res || jsonb_build_object('teste', 'quem não participa NÃO lê as perguntas', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', '' ||
        format('select public.event_delete_question((select id from public.event_questions where author_id = auth.uid() and body like %L))', 'Terceira%'));
      res := res || jsonb_build_object('teste', 'apaga a própria pergunta antes da resposta', 'ok', (r not like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select (public.export_my_data() -> ''eventos_perguntas'') is not null');
      res := res || jsonb_build_object('teste', 'exportação de dados inclui as perguntas dos eventos', 'ok', (r = 't'), 'obtido', left(r, 90));
    end;
  end if;

  -- ------------------------------------------------ LOJA DE PROGRAMAS (N10)
  if to_regclass('public.pro_programs') is not null then
    declare
      prog uuid;
      modu uuid;
    begin
      update public.pro_scores set level = 1 where professional_id = p;
      r := pg_temp.as_user(p, 'authenticated', 'select id from public.save_program(null, ''Lanches de verdade'', ''4 semanas'', '''', 5000, 4, ''🥕'', false)');
      res := res || jsonb_build_object('teste', 'loja de programas só a partir do nível 3', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      insert into public.pro_scores (professional_id, score, level) values (p, 200, 3)
      on conflict (professional_id) do update set level = 3;
      r := pg_temp.as_user(f, 'authenticated', 'select id from public.save_program(null, ''Meu programa'', '''', '''', 5000, 4, ''🥕'', false)');
      res := res || jsonb_build_object('teste', 'usuário comum NÃO cria programa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', 'select title from public.save_program(null, ''Lanches de verdade'', ''4 semanas'', '''', 5000, 4, ''🥕'', false)');
      res := res || jsonb_build_object('teste', 'profissional nível 3 cria programa', 'ok', (r like '%Lanches%'), 'obtido', left(r, 90));
      select id into prog from public.pro_programs where professional_id = p;
      r := pg_temp.as_user(p, 'authenticated', format('select active from public.save_program(%L, ''Lanches de verdade'', ''4 semanas'', '''', 5000, 4, ''🥕'', true)', prog));
      res := res || jsonb_build_object('teste', 'NÃO põe na loja programa sem módulos', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      perform pg_temp.as_user(p, 'authenticated', format('select public.save_program_module(%L, null, ''Semana 1'', ''Frutas no lanche'', null)', prog));
      select id into modu from public.program_modules where program_id = prog;
      r := pg_temp.as_user(p, 'authenticated', format('select active from public.save_program(%L, ''Lanches de verdade'', ''4 semanas'', '''', 5000, 4, ''🥕'', true)', prog));
      res := res || jsonb_build_object('teste', 'com módulo, o programa entra na loja', 'ok', (r = 't'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.pro_programs');
      res := res || jsonb_build_object('teste', 'qualquer pessoa vê o programa na vitrine', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.program_modules');
      res := res || jsonb_build_object('teste', 'NÃO vê os módulos sem comprar', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.program_purchases (program_id, buyer_id, professional_id, amount_cents, platform_fee_cents, fee_percent) values (%L, auth.uid(), %L, 5000, 0, 0)', prog, p));
      res := res || jsonb_build_object('teste', 'NÃO registra compra sem pagar', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.record_program_purchase(%L, auth.uid(), 5000, 0, 0, ''cs_x'', ''pi_x'')', prog));
      res := res || jsonb_build_object('teste', 'só o webhook grava a compra', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      perform public.record_program_purchase(prog, b, 5000, 1000, 20, 'cs_teste', 'pi_teste');
      perform public.record_program_purchase(prog, b, 5000, 1000, 20, 'cs_teste', 'pi_teste');
      res := res || jsonb_build_object('teste', 'compra gravada uma vez só (webhook repetido)',
        'ok', (select count(*) = 1 from public.program_purchases where program_id = prog),
        'obtido', 'verificado como superusuário');
      res := res || jsonb_build_object('teste', 'profissional é avisado da venda',
        'ok', exists (select 1 from public.notifications where user_id = p and type = 'programa_vendido'),
        'obtido', 'verificado como superusuário');
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.program_modules');
      res := res || jsonb_build_object('teste', 'quem comprou vê os módulos', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.program_progress (user_id, module_id) values (auth.uid(), %L)', modu));
      res := res || jsonb_build_object('teste', 'quem comprou marca o módulo como feito', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('insert into public.program_progress (user_id, module_id) values (auth.uid(), %L)', modu));
      res := res || jsonb_build_object('teste', 'quem não comprou NÃO marca progresso', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', 'select net_cents from public.my_program_sales(30)');
      res := res || jsonb_build_object('teste', 'painel mostra o líquido das vendas', 'ok', (r = '4000'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', 'select count(*) from public.program_purchases');
      res := res || jsonb_build_object('teste', 'terceiro NÃO vê compras alheias', 'ok', (r = '0'), 'obtido', r);
      update public.program_purchases set status = 'reembolsada' where program_id = prog;
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.program_modules');
      res := res || jsonb_build_object('teste', 'estorno tira o acesso aos módulos', 'ok', (r = '0'), 'obtido', r);
      perform pg_temp.as_user(p, 'authenticated', format('select public.delete_program_module(%L)', modu));
      res := res || jsonb_build_object('teste', 'programa sem módulos sai da loja',
        'ok', exists (select 1 from public.pro_programs where id = prog and not active),
        'obtido', 'verificado como superusuário');
    end;
  end if;

  -- ------------------------------------------------ MERCADOS PARCEIROS (R1)
  if to_regclass('public.market_partners') is not null then
    declare
      mp uuid;
    begin
      select id into mp from public.market_partners where name = 'Amazon';
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) > 0 from public.market_partners');
      res := res || jsonb_build_object('teste', 'usuário vê os parceiros ativos', 'ok', (r = 't'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', 'insert into public.market_partners (name, search_url) values (''Golpe'', ''https://golpe.example/{q}'')');
      res := res || jsonb_build_object('teste', 'usuário NÃO cadastra parceiro', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.market_click(%L, ''receita'', ''azeite de oliva'')', mp));
      res := res || jsonb_build_object('teste', 'clique devolve a busca com o produto codificado',
        'ok', (r = 'https://www.amazon.com.br/s?k=azeite%20de%20oliva'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.market_click(%L, ''lista'', ''feijão'')', mp));
      res := res || jsonb_build_object('teste', 'acentos viram UTF-8 na busca', 'ok', (r like '%feij%C3%A3o'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.market_clicks');
      res := res || jsonb_build_object('teste', 'usuário NÃO lê os cliques', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.admin_market_stats(30)');
      res := res || jsonb_build_object('teste', 'relatório de cliques é só da administração', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(g, 'authenticated', 'select clicks from public.admin_market_stats(30) where name = ''Amazon''');
      res := res || jsonb_build_object('teste', 'administração vê os cliques por parceiro', 'ok', (r = '2'), 'obtido', left(r, 90));
      r := pg_temp.as_user(g, 'authenticated', 'insert into public.market_partners (name, search_url) values (''Sem busca'', ''https://loja.example/'')');
      res := res || jsonb_build_object('teste', 'endereço do parceiro precisa ter {q}', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select (public.export_my_data() -> ''compras_em_parceiros'') is not null');
      res := res || jsonb_build_object('teste', 'exportação de dados inclui os cliques', 'ok', (r = 't'), 'obtido', left(r, 90));
    end;
  end if;

  -- ------------------------------------------------ ESTÚDIO DE REDES SOCIAIS (S1)
  -- G é admin da plataforma; B é usuário comum; P é profissional.
  if to_regclass('public.social_posts') is not null then
    r := pg_temp.as_user(g, 'authenticated', 'insert into public.social_profiles (network, handle) values (''instagram'', ''nutriconnect'')');
    res := res || jsonb_build_object('teste', 'admin cadastra perfil no estúdio', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
    r := pg_temp.as_user(g, 'authenticated', 'insert into public.social_posts (title, format, status) values (''Mitos do glúten'', ''carrossel'', ''ideia'')');
    res := res || jsonb_build_object('teste', 'admin guarda ideia de post', 'ok', (r = 'OK:1'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.social_posts');
    res := res || jsonb_build_object('teste', 'usuário comum NÃO vê o estúdio', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', 'insert into public.social_posts (title) values (''Meu post'')');
    res := res || jsonb_build_object('teste', 'profissional ainda NÃO usa o estúdio', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(b, 'authenticated', 'select public.social_trends(14)');
    res := res || jsonb_build_object('teste', 'tendências internas só para o estúdio', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(g, 'authenticated', 'select public.social_trends(14) ? ''top_posts''');
    res := res || jsonb_build_object('teste', 'admin vê as tendências internas', 'ok', (r = 't'), 'obtido', left(r, 90));
    r := pg_temp.as_user(g, 'authenticated', 'insert into public.social_posts (title, status) values (''x'', ''viral'')');
    res := res || jsonb_build_object('teste', 'status do post só da lista', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
  end if;

  -- ------------------------------------------------ HABILITAÇÃO PARA TELECONSULTA (M4)
  -- P é profissional verificado; F e B são usuários comuns.
  if to_regclass('public.teleconsult_checks') is not null then
    declare
      tc uuid;
      ok_insert boolean;
    begin
      r := pg_temp.as_user(f, 'authenticated', format('select status from public.teleconsult_submit(''e-nutricionista'', ''123'', %L)', f::text || '/doc.jpg'));
      res := res || jsonb_build_object('teste', 'quem não é profissional NÃO pede habilitação', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select status from public.teleconsult_submit(''e-nutricionista'', ''123'', %L)', b::text || '/doc.jpg'));
      res := res || jsonb_build_object('teste', 'comprovante precisa estar na pasta do profissional', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select status from public.teleconsult_submit(''e-nutricionista'', ''CRN3-123'', %L)', p::text || '/doc.jpg'));
      res := res || jsonb_build_object('teste', 'profissional pede habilitação para teleconsulta', 'ok', (r = 'em_analise'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select status from public.teleconsult_submit(''e-nutricionista'', ''CRN3-123'', %L)', p::text || '/doc2.jpg'));
      res := res || jsonb_build_object('teste', 'um pedido em análise por vez', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.teleconsult_checks');
      res := res || jsonb_build_object('teste', 'terceiro NÃO vê pedidos de habilitação', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(p, 'authenticated', 'update public.professionals set teleconsult_approved_at = now() where user_id = auth.uid()');
      res := res || jsonb_build_object('teste', 'profissional NÃO se aprova sozinho', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.pro_online_allowed(%L)', p));
      res := res || jsonb_build_object('teste', 'sem exigência, todos atendem online', 'ok', (r = 't'), 'obtido', r);
      insert into public.platform_settings (key, value) values ('site_teleconsult_required', 'true'::jsonb)
      on conflict (key) do update set value = 'true'::jsonb;
      r := pg_temp.as_user(b, 'authenticated', format('select public.pro_online_allowed(%L)', p));
      res := res || jsonb_build_object('teste', 'com exigência, sem aprovação NÃO atende online', 'ok', (r = 'f'), 'obtido', r);
      begin
        insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality)
        values (p, b, now() + interval '30 days', now() + interval '30 days 1 hour', 'online');
        ok_insert := true;
      exception when others then
        ok_insert := false;
      end;
      res := res || jsonb_build_object('teste', 'banco recusa consulta online sem habilitação', 'ok', not ok_insert, 'obtido', ok_insert::text);
      select id into tc from public.teleconsult_checks where professional_id = p and status = 'em_analise';
      r := pg_temp.as_user(b, 'authenticated', format('select public.admin_review_teleconsult(%L, true)', tc));
      res := res || jsonb_build_object('teste', 'só a administração aprova habilitação', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(g, 'authenticated', format('select public.admin_review_teleconsult(%L, true)', tc));
      res := res || jsonb_build_object('teste', 'administração aprova e o profissional é avisado',
        'ok', r not like 'ERRO%' and exists (select 1 from public.notifications where user_id = p and type = 'teleconsulta_aprovada'),
        'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.pro_online_allowed(%L)', p));
      res := res || jsonb_build_object('teste', 'aprovado atende online com a exigência ligada', 'ok', (r = 't'), 'obtido', r);
      delete from public.platform_settings where key = 'site_teleconsult_required';
    end;
  end if;

  -- ------------------------------------------------ AVALIAÇÕES VERIFICADAS (P1)
  -- P é profissional; B teve consulta com P; F não teve; G é admin.
  if to_regclass('public.professional_reviews') is not null then
    declare
      ap_ok uuid;
      ap_fut uuid;
      rv uuid;
    begin
      insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality, status)
      values (p, b, now() - interval '3 days', now() - interval '3 days' + interval '1 hour', 'presencial', 'realizada')
      returning id into ap_ok;
      insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality, status)
      values (p, b, now() + interval '40 days', now() + interval '40 days 1 hour', 'presencial', 'agendada')
      returning id into ap_fut;

      r := pg_temp.as_user(f, 'authenticated', format('select public.submit_professional_review(%L, 5)', ap_ok));
      res := res || jsonb_build_object('teste', 'quem não teve a consulta NÃO avalia', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.submit_professional_review(%L, 5)', ap_fut));
      res := res || jsonb_build_object('teste', 'consulta futura NÃO pode ser avaliada', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.submit_professional_review(%L, 9)', ap_ok));
      res := res || jsonb_build_object('teste', 'nota fora de 1 a 5 é recusada', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('insert into public.professional_reviews (appointment_id, professional_id, patient_id, rating) values (%L, %L, %L, 5)', ap_ok, p, b));
      res := res || jsonb_build_object('teste', 'avaliação NÃO entra por insert direto', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select public.submit_professional_review(%L, 4, ''Muito_atenciosa'')', ap_ok));
      res := res || jsonb_build_object('teste', 'paciente avalia a consulta que teve',
        'ok', r not like 'ERRO%' and exists (select 1 from public.notifications where user_id = p and type = 'consulta_avaliada'),
        'obtido', left(r, 90));
      rv := r::uuid;
      r := pg_temp.as_user(b, 'authenticated', format('select public.submit_professional_review(%L, 5)', ap_ok));
      res := res || jsonb_build_object('teste', 'segunda avaliação da mesma consulta edita a primeira',
        'ok', (select count(*) from public.professional_reviews where appointment_id = ap_ok) = 1
          and (select rating from public.professional_reviews where appointment_id = ap_ok) = 5,
        'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select average || ''/'' || total from public.professional_rating_summaries() where professional_id = %L', p));
      res := res || jsonb_build_object('teste', 'média pública conta a avaliação', 'ok', (r = '5.0/1'), 'obtido', r);
      r := pg_temp.as_user(f, 'authenticated', format('select public.reply_professional_review(%L, ''Obrigada'')', rv));
      res := res || jsonb_build_object('teste', 'só o profissional avaliado responde', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('select public.reply_professional_review(%L, ''Obrigada'')', rv));
      res := res || jsonb_build_object('teste', 'profissional responde a avaliação',
        'ok', r not like 'ERRO%' and (select reply from public.professional_reviews where id = rv) = 'Obrigada', 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', 'select count(*) from public.professional_reviews');
      res := res || jsonb_build_object('teste', 'terceiro NÃO lê a tabela de avaliações direto', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('select public.admin_set_review_hidden(%L, true)', rv));
      res := res || jsonb_build_object('teste', 'só a administração oculta avaliação', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(g, 'authenticated', format('select public.admin_set_review_hidden(%L, true)', rv));
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.list_professional_reviews(%L)', p));
      res := res || jsonb_build_object('teste', 'avaliação oculta some da lista pública', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('delete from public.professional_reviews where id = %L', rv));
      res := res || jsonb_build_object('teste', 'autor apaga a própria avaliação',
        'ok', not exists (select 1 from public.professional_reviews where id = rv), 'obtido', left(r, 90));
    end;
  end if;

  -- ------------------------------------------------ DIÁRIO DE SINTOMAS (X1)
  -- C é paciente de P (acompanhamento ativo); F é estranho.
  if to_regclass('public.symptom_logs') is not null then
    update public.care_links set status = 'ativo' where patient_id = c and professional_id = p;
    r := pg_temp.as_user(c, 'authenticated', 'insert into public.symptom_logs (patient_id, symptom, intensity) values (auth.uid(), ''azia'', 2)');
    res := res || jsonb_build_object('teste', 'paciente anota um sintoma', 'ok', r not like 'ERRO%', 'obtido', left(r, 90));
    r := pg_temp.as_user(c, 'authenticated', format('insert into public.symptom_logs (patient_id, symptom, intensity) values (%L, ''azia'', 2)', b));
    res := res || jsonb_build_object('teste', 'NÃO anota sintoma em nome de outra pessoa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(c, 'authenticated', 'insert into public.symptom_logs (patient_id, symptom, intensity) values (auth.uid(), ''febre_alta'', 2)');
    res := res || jsonb_build_object('teste', 'sintoma só da lista', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(c, 'authenticated', 'insert into public.symptom_logs (patient_id, symptom, intensity, felt_at) values (auth.uid(), ''gases'', 1, now() + interval ''2 days'')');
    res := res || jsonb_build_object('teste', 'sintoma no futuro é recusado', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
    r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.symptom_logs where patient_id = %L', c));
    res := res || jsonb_build_object('teste', 'estranho NÃO vê os sintomas', 'ok', (r = '0'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', format('select count(*) from public.symptom_logs where patient_id = %L', c));
    res := res || jsonb_build_object('teste', 'profissional com acompanhamento ativo vê os sintomas', 'ok', (r = '1'), 'obtido', r);
    r := pg_temp.as_user(p, 'authenticated', format('delete from public.symptom_logs where patient_id = %L', c));
    res := res || jsonb_build_object('teste', 'profissional NÃO apaga sintomas do paciente',
      'ok', (select count(*) from public.symptom_logs where patient_id = c) = 1, 'obtido', left(r, 90));
  end if;

  -- ------------------------------------------------ LEMBRETES DE CONSULTA E EXAMES (X2)
  -- C é paciente de P (acompanhamento ativo); F é estranho.
  if to_regclass('public.exam_reminders') is not null then
    declare
      ap24 uuid;
      ap1 uuid;
      ex uuid;
      n_before integer;
    begin
      update public.care_links set status = 'ativo' where patient_id = c and professional_id = p;
      insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality, status)
      values (p, c, now() + interval '20 hours', now() + interval '21 hours', 'presencial', 'agendada')
      returning id into ap24;
      insert into public.appointments (professional_id, patient_id, starts_at, ends_at, modality, status)
      values (p, c, now() + interval '30 minutes', now() + interval '90 minutes', 'presencial', 'confirmada')
      returning id into ap1;

      perform public.send_care_reminders();
      res := res || jsonb_build_object('teste', 'lembrete 24 h antes chega ao paciente',
        'ok', exists (select 1 from public.notifications where user_id = c and type = 'consulta_lembrete' and entity_id = ap24::text and data ->> 'when' = '24h'),
        'obtido', '');
      res := res || jsonb_build_object('teste', 'lembrete 1 h antes chega a paciente e profissional',
        'ok', (select count(*) from public.notifications where type = 'consulta_lembrete' and entity_id = ap1::text and data ->> 'when' = '1h') = 2,
        'obtido', '');
      select count(*) into n_before from public.notifications where type = 'consulta_lembrete';
      perform public.send_care_reminders();
      res := res || jsonb_build_object('teste', 'lembrete não repete',
        'ok', (select count(*) from public.notifications where type = 'consulta_lembrete') = n_before, 'obtido', '');

      r := pg_temp.as_user(f, 'authenticated', format('select public.confirm_attendance(%L)', ap24));
      res := res || jsonb_build_object('teste', 'só o paciente confirma presença', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', format('select public.confirm_attendance(%L)', ap24));
      res := res || jsonb_build_object('teste', 'paciente confirma presença e o profissional é avisado',
        'ok', r not like 'ERRO%'
          and (select patient_confirmed_at is not null from public.appointments where id = ap24)
          and exists (select 1 from public.notifications where user_id = p and type = 'consulta_presenca'),
        'obtido', left(r, 90));
      update public.appointments set starts_at = starts_at + interval '2 days', ends_at = ends_at + interval '2 days' where id = ap24;
      res := res || jsonb_build_object('teste', 'remarcar zera lembretes e confirmação',
        'ok', (select reminder_24h_at is null and patient_confirmed_at is null from public.appointments where id = ap24),
        'obtido', '');

      r := pg_temp.as_user(c, 'authenticated', 'insert into public.exam_reminders (patient_id, title, due_at) values (auth.uid(), ''Hemograma'', now() + interval ''5 hours'') returning id');
      res := res || jsonb_build_object('teste', 'paciente anota um exame', 'ok', r not like 'ERRO%', 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.exam_reminders where patient_id = %L', c));
      res := res || jsonb_build_object('teste', 'estranho NÃO vê os exames', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(f, 'authenticated', format('insert into public.exam_reminders (patient_id, requested_by, title, due_at) values (%L, auth.uid(), ''Glicemia'', now() + interval ''3 days'')', c));
      res := res || jsonb_build_object('teste', 'estranho NÃO pede exame', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('insert into public.exam_reminders (patient_id, title, due_at) values (%L, ''Glicemia'', now() + interval ''3 days'')', c));
      res := res || jsonb_build_object('teste', 'profissional só cria exame como pedido dele', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(p, 'authenticated', format('insert into public.exam_reminders (patient_id, requested_by, title, due_at) values (%L, auth.uid(), ''Glicemia_jejum'', now() + interval ''3 days'')', c));
      res := res || jsonb_build_object('teste', 'profissional do acompanhamento pede exame e o paciente é avisado',
        'ok', r not like 'ERRO%' and exists (select 1 from public.notifications where user_id = c and type = 'exame_pedido'),
        'obtido', left(r, 90));
      perform public.send_care_reminders();
      res := res || jsonb_build_object('teste', 'lembrete do exame nas próximas 24 h',
        'ok', (select count(*) from public.notifications where user_id = c and type = 'exame_lembrete') = 1, 'obtido', '');
      r := pg_temp.as_user(c, 'authenticated', 'select (public.export_my_data() -> ''exames_agendados'') is not null');
      res := res || jsonb_build_object('teste', 'cópia dos dados (LGPD) inclui os exames', 'ok', (r = 't'), 'obtido', left(r, 90));
    end;
  end if;

  -- ------------------------------------------------ DESAFIOS ENTRE AMIGOS E LIGA (X3)
  -- B e C são amigos; A não é amigo de nenhum dos dois (B bloqueou A acima); F é estranho.
  if to_regclass('public.friend_challenges') is not null then
    declare
      ch uuid;
      today date := (now() at time zone 'America/Sao_Paulo')::date;
    begin
      r := pg_temp.as_user(b, 'authenticated', format('select public.create_friend_challenge(''agua'', 3, array[%L]::uuid[])', f));
      res := res || jsonb_build_object('teste', 'desafio só com amigos', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', 'select public.create_friend_challenge(''agua'', 3, array[]::uuid[])');
      res := res || jsonb_build_object('teste', 'desafio precisa de pelo menos 1 amigo', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.friends_weekly_league() where user_id = %L', c));
      res := res || jsonb_build_object('teste', 'amigo sem pontos NÃO aparece na liga (sem lanterninha)', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('select public.create_friend_challenge(''agua'', 3, array[%L]::uuid[])', c));
      res := res || jsonb_build_object('teste', 'cria desafio e o amigo é convidado',
        'ok', r not like 'ERRO%' and exists (select 1 from public.notifications where user_id = c and type = 'desafio_amigo_convite'),
        'obtido', left(r, 90));
      ch := r::uuid;
      r := pg_temp.as_user(a, 'authenticated', format('select count(*) from public.friend_challenges where id = %L', ch));
      res := res || jsonb_build_object('teste', 'quem não está no desafio NÃO o vê', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(a, 'authenticated', format('select public.respond_friend_challenge(%L, true)', ch));
      res := res || jsonb_build_object('teste', 'só o convidado responde', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', format('select public.respond_friend_challenge(%L, true)', ch));
      res := res || jsonb_build_object('teste', 'amigo aceita e quem criou é avisado',
        'ok', r not like 'ERRO%' and exists (select 1 from public.notifications where user_id = b and type = 'desafio_amigo_aceito'),
        'obtido', left(r, 90));
      insert into public.water_days (user_id, day, glasses, goal) values (c, today, 8, 8)
      on conflict (user_id, day) do update set glasses = 8, goal = 8;
      r := pg_temp.as_user(b, 'authenticated', format(
        'select (m ->> ''days'') from public.my_friend_challenges() x, jsonb_array_elements(x.members) m where x.id = %L and (m ->> ''user_id'')::uuid = %L', ch, c));
      res := res || jsonb_build_object('teste', 'placar conta os dias de água na meta do amigo', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(c, 'authenticated', format('select public.cheer_friend_challenge(%L, %L)', ch, b));
      res := res || jsonb_build_object('teste', 'mandar força para quem está no desafio', 'ok', (r = 't'), 'obtido', r);
      r := pg_temp.as_user(c, 'authenticated', format('select public.cheer_friend_challenge(%L, %L)', ch, b));
      res := res || jsonb_build_object('teste', 'força só uma vez por dia', 'ok', (r = 'f'), 'obtido', r);
      r := pg_temp.as_user(a, 'authenticated', format('select public.cheer_friend_challenge(%L, %L)', ch, b));
      res := res || jsonb_build_object('teste', 'quem não participa NÃO manda força', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(b, 'authenticated', format('select agua from public.friends_weekly_league() where user_id = %L', c));
      res := res || jsonb_build_object('teste', 'liga mostra os dias do amigo', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', 'select count(*) from public.friends_weekly_league() where is_me');
      res := res || jsonb_build_object('teste', 'você sempre aparece na sua liga', 'ok', (r = '1'), 'obtido', r);
      r := pg_temp.as_user(c, 'authenticated', 'select public.set_league_visible(false)');
      r := pg_temp.as_user(b, 'authenticated', format('select count(*) from public.friends_weekly_league() where user_id = %L', c));
      res := res || jsonb_build_object('teste', 'quem sai da liga some para os amigos', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(b, 'authenticated', format('select public.create_friend_challenge(''calma'', 2, array[%L]::uuid[])', c));
      r := pg_temp.as_user(b, 'authenticated', format('select public.create_friend_challenge(''trilha'', 2, array[%L]::uuid[])', c));
      r := pg_temp.as_user(b, 'authenticated', format('select public.create_friend_challenge(''mover'', 2, array[%L]::uuid[])', c));
      res := res || jsonb_build_object('teste', 'no máximo 3 desafios criados por semana', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.friend_challenge_members where challenge_id = %L', ch));
      res := res || jsonb_build_object('teste', 'estranho NÃO vê os membros', 'ok', (r = '0'), 'obtido', r);
    end;
  end if;

  -- ------------------------------------------------ PONTOS E RECOMPENSAS (X4)
  -- C ganha pontos pela semana passada; F é estranho; G é admin.
  if to_regclass('public.reward_points') is not null then
    declare
      prev date := public.current_week_start() - 7;
      rw uuid;
      new_code text;
      red uuid;
    begin
      insert into public.water_days (user_id, day, glasses, goal) values
        (c, prev, 8, 8), (c, prev + 1, 8, 8), (c, prev + 2, 3, 8)
      on conflict (user_id, day) do update set glasses = excluded.glasses, goal = excluded.goal;
      perform public.award_weekly_points(prev);
      r := pg_temp.as_user(c, 'authenticated', 'select public.reward_balance()');
      res := res || jsonb_build_object('teste', 'semana com 2 dias de água na meta vale 20 pontos', 'ok', (r::integer >= 20), 'obtido', r);
      perform public.award_weekly_points(prev);
      res := res || jsonb_build_object('teste', 'creditar a semana de novo NÃO duplica',
        'ok', (select count(*) from public.reward_points where user_id = c and reason = 'semana' and ref = prev::text) = 1, 'obtido', '');
      res := res || jsonb_build_object('teste', 'aviso de pontos da semana',
        'ok', exists (select 1 from public.notifications where user_id = c and type = 'pontos_semana'), 'obtido', '');
      r := pg_temp.as_user(f, 'authenticated', format('select count(*) from public.reward_points where user_id = %L', c));
      res := res || jsonb_build_object('teste', 'estranho NÃO vê os pontos', 'ok', (r = '0'), 'obtido', r);
      r := pg_temp.as_user(c, 'authenticated', 'insert into public.reward_points (user_id, delta, reason, ref) values (auth.uid(), 9999, ''ajuste'', ''x'')');
      res := res || jsonb_build_object('teste', 'NÃO dá para se dar pontos', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', 'insert into public.rewards (kind, title, cost, discount_percent) values (''desconto_programa'', ''Cupom_falso'', 50, 50)');
      res := res || jsonb_build_object('teste', 'só a administração cria recompensa', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));

      select id into rw from public.rewards where kind = 'desconto_programa' and active order by position limit 1;
      r := pg_temp.as_user(c, 'authenticated', format('select public.redeem_reward(%L)', rw));
      res := res || jsonb_build_object('teste', 'sem pontos suficientes NÃO resgata', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      insert into public.reward_points (user_id, delta, reason, ref) values (c, 1000, 'ajuste', 'teste');
      r := pg_temp.as_user(c, 'authenticated', format('select public.redeem_reward(%L)', rw));
      res := res || jsonb_build_object('teste', 'resgata a recompensa e recebe um código', 'ok', (r like 'NC-%'), 'obtido', left(r, 90));
      new_code := r;
      select id into red from public.reward_redemptions where reward_redemptions.code = new_code;
      r := pg_temp.as_user(c, 'authenticated', 'select public.reward_balance()');
      res := res || jsonb_build_object('teste', 'resgate desconta os pontos',
        'ok', r::integer = public.reward_balance(c) and public.reward_balance(c) < 1000, 'obtido', r);
      r := pg_temp.as_user(c, 'authenticated', format('update public.reward_redemptions set status = ''ativo'', expires_at = now() + interval ''10 years'' where id = %L', red));
      res := res || jsonb_build_object('teste', 'NÃO altera o próprio código',
        'ok', (select expires_at < now() + interval '1 year' from public.reward_redemptions where id = red), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', format('select public.use_reward_redemption(%L, ''x'')', red));
      res := res || jsonb_build_object('teste', 'pessoa NÃO marca o código como usado sozinha', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(c, 'authenticated', format('select public.admin_set_redemption(%L, ''devolver'')', red));
      res := res || jsonb_build_object('teste', 'só a administração devolve pontos', 'ok', (r like 'ERRO%'), 'obtido', left(r, 90));
      r := pg_temp.as_user(g, 'authenticated', format('select public.admin_set_redemption(%L, ''devolver'')', red));
      res := res || jsonb_build_object('teste', 'administração devolve os pontos do código',
        'ok', r not like 'ERRO%' and exists (select 1 from public.reward_points where user_id = c and reason = 'estorno'), 'obtido', left(r, 90));
      res := res || jsonb_build_object('teste', 'código usado pelo webhook só uma vez',
        'ok', public.use_reward_redemption(red, 'compra') = false, 'obtido', '');
    end;
  end if;

  -- Respostas em fio nos comentários (reply_to, um nível).
  if to_regclass('public.comments') is not null
     and exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'comments' and column_name = 'reply_to') then
    declare
      cm_c uuid;
      cm_a uuid;
    begin
      select id into cm_c from public.comments where post_id = post_f and author_id = c limit 1;
      -- Aprovações da IA (o gatilho exige uma para cada comentário).
      insert into public.content_approvals (user_id, kind, post_id, body) values
        (a, 'comment', post_f, 'resposta da Ana'), (a, 'comment', post_p, 'fora'),
        (b, 'comment', post_f, 'resposta da resposta');
      r := pg_temp.as_user(a, 'authenticated',
        format('insert into public.comments (post_id, author_id, body, reply_to) values (%L, %L, ''resposta da Ana'', %L)', post_f, a, cm_c));
      res := res || jsonb_build_object('teste', 'responde a um comentário do post', 'ok', (r = 'OK:1'), 'obtido', left(r, 100));
      select id into cm_a from public.comments where post_id = post_f and author_id = a and reply_to = cm_c limit 1;
      res := res || jsonb_build_object('teste', 'quem foi respondido recebe aviso',
        'ok', exists (select 1 from public.notifications where user_id = c and type = 'comentario' and actor_id = a and (data ->> 'reply')::boolean),
        'obtido', '');
      r := pg_temp.as_user(a, 'authenticated',
        format('insert into public.comments (post_id, author_id, body, reply_to) values (%L, %L, ''fora'', %L)', post_p, a, cm_c));
      res := res || jsonb_build_object('teste', 'NÃO responde a comentário de outro post', 'ok', (r like 'ERRO%'), 'obtido', left(r, 100));
      r := pg_temp.as_user(b, 'authenticated',
        format('insert into public.comments (post_id, author_id, body, reply_to) values (%L, %L, ''resposta da resposta'', %L)', post_f, b, cm_a));
      res := res || jsonb_build_object('teste', 'resposta a resposta fica no mesmo fio',
        'ok', exists (select 1 from public.comments where author_id = b and post_id = post_f and reply_to = cm_c), 'obtido', left(r, 100));
    end;
  end if;

  -- Relatório (o erro desfaz toda a transação).
  raise exception 'RESULTADOS:%', jsonb_pretty(res);
end
$test$;
