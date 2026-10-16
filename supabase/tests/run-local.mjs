// Teste LOCAL das migrations e de supabase/tests/social_security.sql num Postgres em WebAssembly
// (PGlite), com imitações mínimas do Supabase (auth, storage, cron, net, vault, realtime).
// Não precisa de acesso ao banco real. Como rodar (fora do projeto, numa pasta temporária):
//   mkdir pg && cd pg && npm init -y && npm i @electric-sql/pglite@0.2.17
//   cp <projeto>/supabase/tests/run-local.mjs . && node run-local.mjs <projeto> [filtro]
// Variáveis opcionais: STOP_AFTER=<arquivo.sql> (para nessa migration), EXTRA_SQL_FILE=<sql>
// (roda depois), HOOK_BEFORE=<arquivo.sql> + HOOK_SQL=<sql> (dados antes de uma migration),
// CHECK_SQL=<select> (mostra o resultado e sai).
import { PGlite } from "@electric-sql/pglite";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.argv[2];
const db = new PGlite({ extensions: { pg_trgm, btree_gist } });

const prelude = `
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_admin nologin;
create schema extensions;
create schema auth;
create table auth.users (
  id uuid primary key default gen_random_uuid(), instance_id uuid, aud text, role text,
  email text, encrypted_password text, email_confirmed_at timestamptz, phone text,
  raw_app_meta_data jsonb default '{}'::jsonb, raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(),
  last_sign_in_at timestamptz, banned_until timestamptz, deleted_at timestamptz,
  is_anonymous boolean default false, is_sso_user boolean default false
);
create table auth.identities (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users on delete cascade, provider text, provider_id text, identity_data jsonb, created_at timestamptz default now());
create function auth.uid() returns uuid language sql stable as $$
  select nullif(coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                         (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')), '')::uuid
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'
$$;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
create text search dictionary extensions.unaccent (template = simple);
create function extensions.unaccent(text) returns text language sql immutable as $$ select $1 $$;
create function extensions.unaccent(regdictionary, text) returns text language sql immutable as $$ select $2 $$;
create schema storage;
create table storage.buckets (id text primary key, name text, owner uuid, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[], created_at timestamptz default now(), updated_at timestamptz default now());
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets,
  name text, owner uuid, owner_id text, metadata jsonb, path_tokens text[], version text,
  created_at timestamptz default now(), updated_at timestamptz default now(), last_accessed_at timestamptz);
alter table storage.objects enable row level security;
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
create function storage.filename(name text) returns text language sql immutable as $$
  select (string_to_array(name, '/'))[array_length(string_to_array(name, '/'), 1)]
$$;
create function storage.extension(name text) returns text language sql immutable as $$
  select reverse(split_part(reverse(name), '.', 1))
$$;
create schema cron;
create table cron.job (jobid bigserial primary key, jobname text, schedule text, command text);
create function cron.schedule(p_name text, p_schedule text, p_command text) returns bigint language sql as $$
  insert into cron.job (jobname, schedule, command) values (p_name, p_schedule, p_command) returning jobid
$$;
create function cron.unschedule(p_name text) returns boolean language sql as $$
  with d as (delete from cron.job where jobname = p_name returning 1) select true
$$;
create function cron.unschedule(p_id bigint) returns boolean language sql as $$
  with d as (delete from cron.job where jobid = p_id returning 1) select true
$$;
create schema net;
create function net.http_post(url text, body jsonb default '{}'::jsonb, params jsonb default '{}'::jsonb,
  headers jsonb default '{}'::jsonb, timeout_milliseconds integer default 5000) returns bigint
  language sql as $$ select 1::bigint $$;
create schema vault;
create table vault.secrets (id uuid primary key default gen_random_uuid(), name text unique, secret text, description text);
create view vault.decrypted_secrets as select id, name, secret, secret as decrypted_secret, description from vault.secrets;
create function vault.create_secret(new_secret text, new_name text default null, new_description text default '')
  returns uuid language sql as $$ insert into vault.secrets (name, secret, description) values (new_name, new_secret, new_description) returning id $$;
create schema realtime;
create table realtime.messages (id bigserial primary key, topic text, extension text, payload jsonb,
  event text, private boolean default false, inserted_at timestamptz default now());
alter table realtime.messages enable row level security;
create function realtime.topic() returns text language sql stable as $$ select current_setting('realtime.topic', true) $$;
create publication supabase_realtime;
grant usage on schema public, auth, storage, realtime, extensions to anon, authenticated, service_role;
grant all on all tables in schema storage, realtime to anon, authenticated, service_role;
grant select on auth.users to service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
`;

const strip = (sql) =>
  sql
    .replace(/create extension if not exists (pg_cron|pg_net|unaccent)[^;]*;/gi, "")
    .replace(
      /create extension if not exists (pg_trgm|btree_gist) with schema extensions;/gi,
      (m) => m,
    );

await db.exec(prelude);

const dir = join(root, "supabase", "migrations");
for (const file of readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && (!process.env.STOP_AFTER || f <= process.env.STOP_AFTER))
  .sort()) {
  try {
    if (process.env.HOOK_BEFORE === file) await db.exec(process.env.HOOK_SQL ?? "");
    await db.exec(strip(readFileSync(join(dir, file), "utf8")));
  } catch (err) {
    console.log(`FALHOU ${file}: ${err.message}`);
    if (err.position) console.log("posição", err.position);
    process.exit(1);
  }
}
if (process.env.EXTRA_SQL_FILE)
  await db.exec(strip(readFileSync(process.env.EXTRA_SQL_FILE, "utf8")));
console.log("Todas as migrations aplicadas.");
if (process.env.CHECK_SQL) {
  const out = await db.query(process.env.CHECK_SQL);
  console.log("CHECK:", JSON.stringify(out.rows));
  process.exit(0);
}

const tests = readFileSync(join(root, "supabase", "tests", "social_security.sql"), "utf8");
try {
  await db.exec(tests);
  console.log("Os testes não terminaram com o relatório esperado.");
} catch (err) {
  const m = /RESULTADOS:([\s\S]*)$/.exec(err.message);
  if (!m) {
    console.log("ERRO nos testes:", err.message);
    process.exit(1);
  }
  const res = JSON.parse(m[1]);
  const bad = res.filter((r) => !r.ok);
  const filter = process.argv[3];
  console.log(`${res.length} testes, ${bad.length} falharam.`);
  for (const r of bad) console.log("  ✗", r.teste, "→", r.obtido);
  if (filter)
    for (const r of res.filter((r) => r.teste.includes(filter)))
      console.log(r.ok ? "  ✓" : "  ✗", r.teste);
}
