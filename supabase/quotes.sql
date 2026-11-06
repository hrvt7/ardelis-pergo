-- Számozott online ajánlatok (verziózással, e-aláírással, foglalóval).
-- Futtasd a Supabase SQL Editorban a leads.sql után. Csak szerveroldalról (service role) érhető el.
create table if not exists public.quotes (
  id bigint generated always as identity primary key,
  tenant_id text not null,
  number text not null,                 -- pl. ARDELI-2026-0007
  version integer not null default 1,   -- ugyanazon számon belül: 1, 2, 3…
  token text not null unique,           -- a vevő linkjében szereplő titkos azonosító
  lead_ref text not null,
  status text not null default 'sent',  -- sent | accepted | declined | superseded | withdrawn
  customer_name text not null,
  customer_email text not null,
  customer_phone text,
  customer_address text,
  config jsonb not null,
  price jsonb not null,                 -- az ajánlat pillanatnyi árképe (nem változik utólag)
  total_net integer not null,
  total_gross integer not null,
  discount_net integer not null default 0,
  deposit_percent integer not null default 30,
  deposit_gross integer not null,
  valid_until timestamptz not null,
  note text,
  payment_info text,
  terms text,
  doc_hash text not null,               -- az ajánlat tartalmának SHA-256 ujjlenyomata
  view_count integer not null default 0,
  first_viewed_at timestamptz,
  last_viewed_at timestamptz,
  accepted_at timestamptz,
  signer_name text,
  signer_ip text,
  signer_agent text,
  declined_at timestamptz,
  decline_reason text,
  created_at timestamptz not null default now(),
  unique (tenant_id, number, version)
);

create index if not exists quotes_tenant_created_idx on public.quotes (tenant_id, created_at desc);
create index if not exists quotes_lead_idx on public.quotes (tenant_id, lead_ref);

alter table public.quotes enable row level security;
