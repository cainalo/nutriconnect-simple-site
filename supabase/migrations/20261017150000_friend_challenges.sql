-- X3 — Desafios entre amigos e liga da semana (ranking gentil, sem culpa).
-- Tudo conta DIAS na semana (domingo a sábado, horário de Brasília, como o ranking da trilha), a
-- partir do que o site já registra: água na meta, hábitos do dia (verduras, comida feita em casa,
-- movimento), refeição com calma e trilha. Ninguém vê números de saúde dos amigos, só quantos dias.
-- Desafio: quem cria convida de 1 a 7 amigos; cada um aceita ou recusa. Liga: você e seus amigos
-- que não desligaram "aparecer na liga" (user_settings.league_visible).

alter table public.user_settings
  add column if not exists league_visible boolean not null default true;

create table public.friend_challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles (id) on delete cascade,
  metric text not null check (metric in ('agua', 'verduras', 'caseira', 'mover', 'calma', 'trilha')),
  -- Meta em dias na semana.
  target smallint not null check (target between 1 and 7),
  title text check (title is null or length(btrim(title)) between 2 and 60),
  week_start date not null,
  created_at timestamptz not null default now()
);
create index friend_challenges_creator_idx on public.friend_challenges (creator_id, week_start);

create table public.friend_challenge_members (
  challenge_id uuid not null references public.friend_challenges (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'convidado' check (status in ('convidado', 'aceito', 'recusado')),
  responded_at timestamptz,
  primary key (challenge_id, user_id)
);
create index friend_challenge_members_user_idx on public.friend_challenge_members (user_id);

alter table public.friend_challenges enable row level security;
alter table public.friend_challenge_members enable row level security;

create or replace function public.is_friend_challenge_member(p_challenge uuid, p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.friend_challenge_members
                  where challenge_id = p_challenge and user_id = p_user);
$$;

-- Leitura só para quem está no desafio; escrita só pelas funções abaixo.
create policy "friend_challenges: membros leem" on public.friend_challenges
  for select to authenticated using (public.is_friend_challenge_member(id));
create policy "friend_challenges: criador apaga" on public.friend_challenges
  for delete to authenticated using (creator_id = auth.uid());
create policy "friend_challenge_members: membros leem" on public.friend_challenge_members
  for select to authenticated using (public.is_friend_challenge_member(challenge_id));

/** Domingo da semana atual (Brasília). */
create or replace function public.current_week_start()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'America/Sao_Paulo')::date
         - extract(dow from (now() at time zone 'America/Sao_Paulo'))::integer;
$$;

/** Dias da semana em que a pessoa cumpriu a métrica (uso interno). */
create or replace function public._activity_days(p_user uuid, p_metric text, p_week date)
returns integer language sql stable security definer set search_path = public as $$
  select case p_metric
    when 'agua' then (select count(*) from public.water_days
                       where user_id = p_user and day between p_week and p_week + 6 and glasses >= goal)
    when 'verduras' then (select count(*) from public.daily_checkins
                           where user_id = p_user and day between p_week and p_week + 6 and 'veg' = any (habits))
    when 'caseira' then (select count(*) from public.daily_checkins
                          where user_id = p_user and day between p_week and p_week + 6 and 'homemade' = any (habits))
    when 'mover' then (select count(*) from public.daily_checkins
                        where user_id = p_user and day between p_week and p_week + 6 and 'move' = any (habits))
    when 'calma' then (select count(*) from public.daily_checkins
                        where user_id = p_user and day between p_week and p_week + 6 and mindful_meals > 0)
    when 'trilha' then (select count(distinct x.day) from public.trail_xp_daily x
                          join public.trail_profiles t on t.id = x.profile_id
                         where t.owner_id = p_user and t.kind = 'adult' and x.xp > 0
                           and x.day between p_week and p_week + 6)
    else 0
  end::integer;
$$;
revoke execute on function public._activity_days(uuid, text, date) from public, anon, authenticated;

/** Cria o desafio da semana e convida amigos (de 1 a 7). Até 3 desafios criados por semana. */
create or replace function public.create_friend_challenge(
  p_metric text, p_target integer, p_friends uuid[], p_title text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_week date := public.current_week_start();
  f uuid;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta.' using errcode = '42501'; end if;
  if p_friends is null or cardinality(p_friends) not between 1 and 7 then
    raise exception 'Convide de 1 a 7 amigos.' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_friends) u
              where u not in (select public.friend_ids(auth.uid())) or u = auth.uid()) then
    raise exception 'Só dá para convidar amigos.' using errcode = '42501';
  end if;
  if (select count(*) from public.friend_challenges where creator_id = auth.uid() and week_start = v_week) >= 3 then
    raise exception 'Você já criou 3 desafios nesta semana.' using errcode = '22023';
  end if;

  insert into public.friend_challenges (creator_id, metric, target, title, week_start)
  values (auth.uid(), p_metric, p_target, nullif(btrim(coalesce(p_title, '')), ''), v_week)
  returning id into v_id;
  insert into public.friend_challenge_members (challenge_id, user_id, status, responded_at)
  values (v_id, auth.uid(), 'aceito', now());
  foreach f in array (select array(select distinct unnest(p_friends))) loop
    insert into public.friend_challenge_members (challenge_id, user_id) values (v_id, f);
    perform public.notify(f, 'desafio_amigo_convite', auth.uid(), 'friend_challenge', v_id::text,
      jsonb_build_object('metric', p_metric, 'target', p_target));
  end loop;
  return v_id;
end;
$$;
revoke execute on function public.create_friend_challenge(text, integer, uuid[], text) from public, anon;
grant execute on function public.create_friend_challenge(text, integer, uuid[], text) to authenticated;

create or replace function public.respond_friend_challenge(p_challenge uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_creator uuid;
begin
  update public.friend_challenge_members
     set status = case when p_accept then 'aceito' else 'recusado' end, responded_at = now()
   where challenge_id = p_challenge and user_id = auth.uid() and status = 'convidado';
  if not found then raise exception 'Convite não encontrado.' using errcode = '42501'; end if;
  if p_accept then
    select creator_id into v_creator from public.friend_challenges where id = p_challenge;
    perform public.notify(v_creator, 'desafio_amigo_aceito', auth.uid(), 'friend_challenge', p_challenge::text);
  end if;
end;
$$;
revoke execute on function public.respond_friend_challenge(uuid, boolean) from public, anon;
grant execute on function public.respond_friend_challenge(uuid, boolean) to authenticated;

/** Desafios da pessoa (desta semana e da anterior), com o placar de cada membro. */
create or replace function public.my_friend_challenges()
returns table (
  id uuid, metric text, target smallint, title text, week_start date, creator_id uuid,
  my_status text, members jsonb
)
language sql stable security definer set search_path = public as $$
  select c.id, c.metric, c.target, c.title, c.week_start, c.creator_id, me.status,
         (select jsonb_agg(jsonb_build_object(
                    'user_id', m.user_id, 'name', p.name, 'avatar_url', p.avatar_url,
                    'status', m.status,
                    'days', case when m.status = 'aceito'
                                 then public._activity_days(m.user_id, c.metric, c.week_start) else 0 end,
                    'is_me', m.user_id = auth.uid())
                  order by p.name)
            from public.friend_challenge_members m
            join public.profiles p on p.id = m.user_id
           where m.challenge_id = c.id and m.status <> 'recusado')
    from public.friend_challenges c
    join public.friend_challenge_members me on me.challenge_id = c.id and me.user_id = auth.uid()
   where me.status <> 'recusado' and c.week_start >= public.current_week_start() - 7
   order by c.week_start desc, c.created_at desc;
$$;
revoke execute on function public.my_friend_challenges() from public, anon;
grant execute on function public.my_friend_challenges() to authenticated;

/** "Mandar força" para alguém do desafio (um aviso por pessoa por dia). */
create or replace function public.cheer_friend_challenge(p_challenge uuid, p_user uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_user = auth.uid()
     or not exists (select 1 from public.friend_challenge_members
                     where challenge_id = p_challenge and user_id = auth.uid() and status = 'aceito')
     or not exists (select 1 from public.friend_challenge_members
                     where challenge_id = p_challenge and user_id = p_user and status = 'aceito') then
    raise exception 'Só entre participantes do desafio.' using errcode = '42501';
  end if;
  if exists (select 1 from public.notifications
              where user_id = p_user and actor_id = auth.uid() and type = 'desafio_forca'
                and created_at > now() - interval '20 hours') then
    return false;
  end if;
  perform public.notify(p_user, 'desafio_forca', auth.uid(), 'friend_challenge', p_challenge::text);
  return true;
end;
$$;
revoke execute on function public.cheer_friend_challenge(uuid, uuid) from public, anon;
grant execute on function public.cheer_friend_challenge(uuid, uuid) to authenticated;

/**
 * Liga da semana: você e seus amigos (os que aparecem na liga). Pontos = dias de água na meta +
 * dias com verduras + dias com comida feita em casa + dias de movimento + dias com refeição calma
 * + dias de trilha (máximo 42). Quem não pontuou não aparece para os outros (sem lanterninha).
 */
create or replace function public.friends_weekly_league(p_week_start date default null)
returns table (
  user_id uuid, name text, username text, avatar_url text, points integer,
  agua integer, verduras integer, caseira integer, mover integer, calma integer, trilha integer,
  is_me boolean
)
language sql stable security definer set search_path = public as $$
  with w as (select coalesce(p_week_start, public.current_week_start()) as ws),
  people as (
    select auth.uid() as uid
    union
    select f from public.friend_ids(auth.uid()) f
     where coalesce((select league_visible from public.user_settings where id = f), true)
       and not public.is_blocked_between(f, auth.uid())
  ),
  s as (
    select pe.uid,
           public._activity_days(pe.uid, 'agua', w.ws) as agua,
           public._activity_days(pe.uid, 'verduras', w.ws) as verduras,
           public._activity_days(pe.uid, 'caseira', w.ws) as caseira,
           public._activity_days(pe.uid, 'mover', w.ws) as mover,
           public._activity_days(pe.uid, 'calma', w.ws) as calma,
           public._activity_days(pe.uid, 'trilha', w.ws) as trilha
      from people pe, w
  )
  select s.uid, p.name, p.username, p.avatar_url,
         (s.agua + s.verduras + s.caseira + s.mover + s.calma + s.trilha)::integer,
         s.agua, s.verduras, s.caseira, s.mover, s.calma, s.trilha, s.uid = auth.uid()
    from s join public.profiles p on p.id = s.uid
   where s.uid = auth.uid() or (s.agua + s.verduras + s.caseira + s.mover + s.calma + s.trilha) > 0
   order by 5 desc, p.name;
$$;
revoke execute on function public.friends_weekly_league(date) from public, anon;
grant execute on function public.friends_weekly_league(date) to authenticated;

/** Liga e desafios: aparecer ou não para os amigos. */
create or replace function public.set_league_visible(p_visible boolean)
returns void language sql security definer set search_path = public as $$
  insert into public.user_settings (id, league_visible) values (auth.uid(), p_visible)
  on conflict (id) do update set league_visible = excluded.league_visible;
$$;
revoke execute on function public.set_league_visible(boolean) from public, anon;
grant execute on function public.set_league_visible(boolean) to authenticated;

-- Avisos dos desafios entre amigos são da categoria "social" (preferência de notificação e push).
create or replace function public.notification_category(p_type text)
returns text language sql immutable as $$
  select case
    when p_type in ('reacao', 'comentario', 'amizade_pedido', 'amizade_aceita', 'seguidor') then 'social'
    when p_type like 'dupla\_%' or p_type like 'casa\_%' or p_type like 'evento\_%' then 'social'
    when p_type like 'desafio\_amigo\_%' or p_type = 'desafio_forca' then 'social'
    when p_type in ('tema_previa', 'tema_ativo') then 'theme'
    when p_type = 'conquista' then 'achievements'
    when p_type in ('conteudo_oculto', 'conteudo_liberado', 'conta_suspensa', 'conta_reativada') then 'system'
    else 'clinical'
  end;
$$;
