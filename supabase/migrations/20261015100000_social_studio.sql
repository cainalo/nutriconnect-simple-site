-- Estúdio de redes sociais (S1): no painel do admin, a equipe cadastra os perfis do NutriConnect
-- (Instagram, TikTok, Facebook, LinkedIn, YouTube...), a IA analisa o que foi colado/enviado (bio,
-- legendas, números, prints), sugere ideias e ações de engajamento, cria modelos e organiza o
-- calendário. As tendências vêm do que está em alta DENTRO da rede (só conteúdo público), do tema
-- da semana e do calendário de saúde. Hoje só administradores usam; o acesso passa por
-- social_studio_allowed() para virar recurso dos profissionais no futuro sem refazer as tabelas.

/** Quem pode usar o estúdio. Hoje: administração da plataforma. */
create or replace function public.social_studio_allowed(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_platform_admin(p_user);
$$;
revoke execute on function public.social_studio_allowed(uuid) from public, anon;
grant execute on function public.social_studio_allowed(uuid) to authenticated;

create table public.social_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  network text not null check (network in ('instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'x', 'outro')),
  handle text not null check (length(btrim(handle)) between 1 and 80),
  url text check (url is null or url ~ '^https?://\S+$'),
  -- Bio, público, objetivo da conta (colado pela equipe).
  notes text not null default '' check (length(notes) <= 3000),
  -- Legendas recentes coladas (uma por bloco).
  sample_posts text not null default '' check (length(sample_posts) <= 8000),
  -- { followers, posts_per_week, avg_likes, avg_comments, avg_reach }
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  -- Diagnóstico da IA.
  analysis jsonb check (analysis is null or jsonb_typeof(analysis) = 'object'),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger social_profiles_updated_at before update on public.social_profiles
  for each row execute function public.set_updated_at();

create table public.social_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  profile_id uuid references public.social_profiles (id) on delete set null,
  network text not null default 'instagram'
    check (network in ('instagram', 'tiktok', 'facebook', 'linkedin', 'youtube', 'x', 'outro')),
  format text not null default 'post'
    check (format in ('post', 'carrossel', 'reels', 'story', 'video', 'texto')),
  title text not null check (length(btrim(title)) between 1 and 160),
  hook text not null default '' check (length(hook) <= 300),
  caption text not null default '' check (length(caption) <= 5000),
  -- Carrossel: [{ "title": "...", "text": "..." }]
  slides jsonb not null default '[]'::jsonb check (jsonb_typeof(slides) = 'array'),
  -- Roteiro de Reels/vídeo/story.
  script text not null default '' check (length(script) <= 5000),
  hashtags text[] not null default '{}' check (cardinality(hashtags) <= 30),
  cta text not null default '' check (length(cta) <= 300),
  visual_idea text not null default '' check (length(visual_idea) <= 1000),
  pillar text not null default '' check (length(pillar) <= 80),
  status text not null default 'ideia'
    check (status in ('ideia', 'rascunho', 'aprovado', 'agendado', 'publicado')),
  scheduled_for date,
  is_template boolean not null default false,
  source text not null default 'manual' check (source in ('ia', 'manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index social_posts_owner_idx on public.social_posts (owner_id, scheduled_for);
create trigger social_posts_updated_at before update on public.social_posts
  for each row execute function public.set_updated_at();

-- Hoje a equipe de administração trabalha junta (todos veem tudo); quando o estúdio for para os
-- profissionais, cada um verá só o próprio (owner_id = auth.uid()).
alter table public.social_profiles enable row level security;
create policy "social_profiles: estúdio" on public.social_profiles
  for all to authenticated
  using (public.social_studio_allowed() and (owner_id = auth.uid() or public.is_platform_admin()))
  with check (public.social_studio_allowed() and (owner_id = auth.uid() or public.is_platform_admin()));

alter table public.social_posts enable row level security;
create policy "social_posts: estúdio" on public.social_posts
  for all to authenticated
  using (public.social_studio_allowed() and (owner_id = auth.uid() or public.is_platform_admin()))
  with check (public.social_studio_allowed() and (owner_id = auth.uid() or public.is_platform_admin()));

create or replace function public.social_limits()
returns trigger language plpgsql set search_path = public as $$
begin
  if tg_table_name = 'social_profiles'
     and (select count(*) from public.social_profiles where owner_id = new.owner_id) >= 30 then
    raise exception 'Limite de 30 perfis.';
  end if;
  if tg_table_name = 'social_posts'
     and (select count(*) from public.social_posts where owner_id = new.owner_id) >= 2000 then
    raise exception 'Limite de 2.000 posts no estúdio.';
  end if;
  return new;
end;
$$;
create trigger social_profiles_limit before insert on public.social_profiles
  for each row execute function public.social_limits();
create trigger social_posts_limit before insert on public.social_posts
  for each row execute function public.social_limits();

-- ---------------------------------------------------------------------------
-- Tendências internas: o que está em alta no NutriConnect (só publicações públicas, fora de
-- comunidades e não ocultas), o tema da semana e os desafios mais procurados. Sem dados pessoais.
-- ---------------------------------------------------------------------------
create or replace function public.social_trends(p_days integer default 14)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 14), 1), 90));
begin
  if not public.social_studio_allowed() then
    raise exception 'Sem acesso ao estúdio de redes sociais.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'top_posts', coalesce((
      select jsonb_agg(t) from (
        select p.type::text as type, left(coalesce(p.title, p.body), 140) as title, p.tags,
               (select count(*) from public.post_reactions r where r.post_id = p.id) as reactions,
               (select count(*) from public.comments c where c.post_id = p.id and not c.hidden) as comments
          from public.posts p
         where p.publish_at > since and p.publish_at <= now()
           and not p.hidden and p.community_id is null and p.audience = 'publico'
         order by (select count(*) from public.post_reactions r where r.post_id = p.id)
                  + 2 * (select count(*) from public.comments c where c.post_id = p.id and not c.hidden) desc,
                  p.publish_at desc
         limit 12) t), '[]'::jsonb),
    'top_tags', coalesce((
      select jsonb_agg(jsonb_build_object('tag', tag, 'n', n)) from (
        select lower(tag) as tag, count(*) as n
          from public.posts p, unnest(p.tags) as tag
         where p.publish_at > since and not p.hidden and p.community_id is null and p.audience = 'publico'
         group by lower(tag) order by count(*) desc limit 15) t), '[]'::jsonb),
    'post_types', coalesce((
      select jsonb_object_agg(type, n) from (
        select p.type::text as type, count(*) as n from public.posts p
         where p.publish_at > since and not p.hidden and p.community_id is null and p.audience = 'publico'
         group by p.type) t), '{}'::jsonb),
    'theme', (
      select jsonb_build_object('title', w.title, 'subtitle', w.subtitle)
        from public.weekly_themes w where w.status = 'ativo' order by w.week_start desc limit 1),
    'challenges', coalesce((
      select jsonb_agg(t) from (
        select c.title, (select count(*) from public.challenge_participants cp where cp.challenge_id = c.id) as people
          from public.challenges c
         order by (select count(*) from public.challenge_participants cp where cp.challenge_id = c.id) desc
         limit 5) t), '[]'::jsonb)
  );
end;
$$;
revoke execute on function public.social_trends(integer) from public, anon;
grant execute on function public.social_trends(integer) to authenticated;

-- Cota própria de IA do estúdio (a Edge Function ai-chat também precisa conhecer "social").
alter table public.ai_usage drop constraint if exists ai_usage_kind_check;
alter table public.ai_usage add constraint ai_usage_kind_check
  check (kind in ('nina', 'summary', 'moderation', 'label', 'diary', 'fridge', 'menu', 'lunchbox', 'social'));
