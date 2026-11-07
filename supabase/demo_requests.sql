-- B2B demókérések (nyitóoldal → /api/demo-request). Csak a szerver (service role) írja/olvassa.
create table if not exists public.demo_requests (
  id bigint generated always as identity primary key,
  ref text not null unique,
  created_at timestamptz not null default now(),
  name text not null,
  company text not null,
  email text not null,
  phone text,
  website text,
  product text not null,
  plan text not null,
  message text,
  consent_at timestamptz,
  consent_version text
);
alter table public.demo_requests enable row level security;

-- Meglévő táblához (ha már létrehoztad): a hozzájárulás időpontja és a tájékoztató verziója.
alter table public.demo_requests add column if not exists consent_at timestamptz;
alter table public.demo_requests add column if not exists consent_version text;
