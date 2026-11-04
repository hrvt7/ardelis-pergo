-- Konverziómérés: névtelen, napi összesített számlálók (nincs süti, nincs azonosító, nincs IP-tárolás).
-- Futtasd a Supabase SQL Editorban. Csak a service role írja/olvassa (szerveroldalon).
create table if not exists public.tenant_events (
  tenant_id text not null,
  day date not null default current_date,
  name text not null,
  count integer not null default 0,
  primary key (tenant_id, day, name)
);

alter table public.tenant_events enable row level security;

-- Atomikus növelés: egy esemény = +1 az adott nap számlálóján.
create or replace function public.track_event(p_tenant text, p_name text) returns void
language sql as $$
  insert into public.tenant_events (tenant_id, day, name, count) values (p_tenant, current_date, p_name, 1)
  on conflict (tenant_id, day, name) do update set count = public.tenant_events.count + 1;
$$;
