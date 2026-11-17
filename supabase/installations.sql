-- Digitális ikerpéldány („Telepítések”): minden felszerelt termék befagyasztott rekordja, a tulajdonosi
-- hibabejelentések és egy csak hozzáfűzhető esemény-napló. Futtasd a leads.sql után.
-- Minden tábla csak szerveroldalról (service role) érhető el; a böngésző (anon/authenticated) semmit nem lát.
-- A tenant-elkülönítést a szerver minden lekérdezésben a tenant_id szűrővel biztosítja (server/installations.ts).

create table if not exists public.installations (
  id bigint generated always as identity primary key,
  tenant_id text not null,
  lead_id bigint references public.leads (id) on delete set null,
  lead_ref text,
  -- A tulajdonosi link (/t/:token) titkos azonosítója: 32 bájt kriptográfiai véletlen, base64url (43 karakter).
  public_token text not null unique check (public_token ~ '^[A-Za-z0-9_-]{43}$'),
  -- Befagyasztott pillanatkép: konfiguráció, megosztási kód, komponenslista, az akkori ár és megjelenítési adatok.
  -- Utólag nem módosul (árlista- vagy termékregiszter-változás nem hat rá); a snapshot_hash ezt ellenőrizhetővé teszi.
  config_snapshot jsonb not null,
  snapshot_hash text not null,
  schema_version integer not null check (schema_version > 0),
  product_type text not null check (product_type in ('pergola', 'veranda', 'conservatory')),
  installed_at date not null,
  -- Garancia komponenscsoportonként (hónap): {"structure":60,"electronics":24,"led":24,"other":24}
  warranty jsonb not null,
  status text not null default 'active' check (status in ('active', 'archived')),
  internal_note text check (char_length(internal_note) <= 2000),
  created_at timestamptz not null default now()
);
create index if not exists installations_tenant_created_idx on public.installations (tenant_id, created_at desc);
create index if not exists installations_lead_idx on public.installations (lead_id);
-- Egy leadhez legfeljebb egy telepítés (dupla kattintás ellen).
create unique index if not exists installations_tenant_lead_uniq on public.installations (tenant_id, lead_id) where lead_id is not null;
alter table public.installations enable row level security;

create table if not exists public.service_requests (
  id bigint generated always as identity primary key,
  installation_id bigint not null references public.installations (id) on delete cascade,
  tenant_id text not null,
  -- Csak a telepítés zárt komponenslistájából (a szerver ellenőrzi).
  component_key text not null check (char_length(component_key) between 1 and 60),
  description text not null check (char_length(description) between 1 and 2000),
  -- A privát „service-photos” bucket objektumútjai; legfeljebb 4 kép, EXIF nélkül.
  photo_paths text[] not null default '{}' check (cardinality(photo_paths) <= 4),
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  consent_at timestamptz not null,
  consent_version text not null,
  -- B-lépés (még nem használt): vision-modell javaslata a zárt komponenslistából; sosem végleges.
  ai_suggestion jsonb,
  created_at timestamptz not null default now()
);
create index if not exists service_requests_tenant_created_idx on public.service_requests (tenant_id, created_at desc);
create index if not exists service_requests_installation_idx on public.service_requests (installation_id);
alter table public.service_requests enable row level security;

-- Csak hozzáfűzhető napló: létrehozás, hibabejelentés, státuszváltás, bővítési kérés – ki és mikor.
create table if not exists public.installation_events (
  id bigint generated always as identity primary key,
  installation_id bigint not null references public.installations (id) on delete cascade,
  tenant_id text not null,
  kind text not null check (kind in ('created', 'service_request', 'status_change', 'expansion_request', 'service_update')),
  actor text not null check (actor in ('manufacturer', 'owner', 'system')),
  detail jsonb,
  created_at timestamptz not null default now()
);
create index if not exists installation_events_installation_idx on public.installation_events (installation_id, created_at);
alter table public.installation_events enable row level security;

-- A napló sorai nem módosíthatók (a telepítés törlésekor kaszkádolva törlődnek: adatvédelmi törlés).
create or replace function public.installation_events_append_only() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'installation_events is append-only';
end;
$$;
drop trigger if exists installation_events_no_update on public.installation_events;
create trigger installation_events_no_update before update on public.installation_events
  for each row execute function public.installation_events_append_only();
revoke execute on function public.installation_events_append_only() from public, anon, authenticated;

-- B-lépés: komponens → cikkszám leképezés (tenantonként szerkeszthető, opcionális). Pontos alkatrészt csak ebből lehet mondani.
create table if not exists public.component_part_numbers (
  id bigint generated always as identity primary key,
  tenant_id text not null,
  component_key text not null check (char_length(component_key) between 1 and 60),
  part_number text not null check (char_length(part_number) between 1 and 80),
  label text check (char_length(label) <= 200),
  created_at timestamptz not null default now(),
  unique (tenant_id, component_key)
);
alter table public.component_part_numbers enable row level security;

-- Bővítési kérés: az új lead az eredeti telepítésre hivatkozik.
alter table public.leads add column if not exists installation_id bigint references public.installations (id) on delete set null;
create index if not exists leads_installation_idx on public.leads (installation_id);

-- Hozzáférés: csak a szerver (service role).
revoke all on public.installations, public.service_requests, public.installation_events, public.component_part_numbers from anon, authenticated;
grant select, insert, update, delete on public.installations, public.service_requests, public.component_part_numbers to service_role;
grant select, insert, delete on public.installation_events to service_role;
revoke update on public.installation_events from service_role;

-- Privát tárhely a hibabejelentések fotóinak (JPEG, legfeljebb 4 MB; megjelenítés csak rövid lejáratú aláírt linkkel).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('service-photos', 'service-photos', false, 4194304, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 4194304, allowed_mime_types = array['image/jpeg'];

-- 4.99: szervizjegy-munkalap (felelős, határidő, diagnózis, javítás, alkatrész, munkaidő, garancia, költség, eredmény)
-- és a lezárás ideje a megoldási idő méréséhez. Csak bővítés: a meglévő sorok mezői üresek maradnak.
alter table public.service_requests
  add column if not exists assignee text check (char_length(assignee) <= 80),
  add column if not exists due_date date,
  add column if not exists diagnosis text check (char_length(diagnosis) <= 2000),
  add column if not exists work_done text check (char_length(work_done) <= 2000),
  add column if not exists parts_used text check (char_length(parts_used) <= 500),
  add column if not exists labor_minutes integer check (labor_minutes between 0 and 10000),
  add column if not exists warranty_case boolean,
  add column if not exists cost_net integer check (cost_net between 0 and 100000000),
  add column if not exists outcome text check (outcome in ('fixed', 'temporary', 'not_fixed', 'no_fault')),
  add column if not exists closed_at timestamptz,
  add column if not exists updated_at timestamptz;
create index if not exists service_requests_tenant_open_due_idx on public.service_requests (tenant_id, due_date) where status <> 'closed';
-- A naplóba a munkalap módosítása is bekerül (csak a mezők neve).
alter table public.installation_events drop constraint if exists installation_events_kind_check;
alter table public.installation_events add constraint installation_events_kind_check check (kind in ('created', 'service_request', 'status_change', 'expansion_request', 'service_update'));
