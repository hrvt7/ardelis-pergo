-- Opcionális: érdeklődők mentése Supabase-be az e-mail mellé.
-- Futtasd a Supabase SQL Editorban, majd add meg a SUPABASE_URL és
-- SUPABASE_SERVICE_ROLE_KEY környezeti változókat (csak szerveroldalon!).
create table if not exists public.leads (
  id bigint generated always as identity primary key,
  ref text not null unique,
  tenant_id text not null,
  source text not null,
  customer_name text not null,
  email text not null,
  phone text not null,
  postal_code text not null,
  city text not null,
  region text not null,
  address text,
  notes text,
  config jsonb not null,
  estimate_net integer not null,
  estimate_gross integer not null,
  config_url text not null,
  page_url text,
  status text not null default 'new',
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists leads_tenant_created_idx on public.leads (tenant_id, created_at desc);

-- A táblát csak a service role írja/olvassa; a böngészőből nem érhető el.
alter table public.leads enable row level security;

-- Gyártói belső megjegyzés az érdeklődőkhöz (admin lead nézet). Meglévő táblához is futtasd:
alter table public.leads add column if not exists owner_note text;

-- Viselkedési jelek a lead-pontozáshoz (PDF, AR, megosztás, lépések, visszatérés) — a vevő hozzájárulásával érkezik. Meglévő táblához is futtasd:
alter table public.leads add column if not exists engagement jsonb;
