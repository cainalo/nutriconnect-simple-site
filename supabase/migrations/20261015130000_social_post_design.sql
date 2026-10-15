-- Estúdio de redes sociais: o post guarda o design da arte (layout, tema, emoji, chamada e a foto de
-- fundo comprimida), para o editor reabrir exatamente como estava.
alter table public.social_posts
  add column design jsonb not null default '{}'::jsonb
    check (jsonb_typeof(design) = 'object' and pg_column_size(design) < 700000);
