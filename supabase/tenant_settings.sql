-- Gyártói admin: a gyártó által szerkesztett beállítások (felülírások a kódban lévő alap-tenantra).
-- Futtasd a Supabase SQL Editorban. Csak a service role írja/olvassa (szerveroldalon).
create table if not exists public.tenant_settings (
  tenant_id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.tenant_settings enable row level security;
