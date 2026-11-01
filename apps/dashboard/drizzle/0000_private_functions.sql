-- Custom migration (drizzle-kit generate --custom): helpers the baseline's tables use.

-- Internal helpers, apart from the app's tables.
create schema if not exists private;
--> statement-breakpoint

-- The community edition serves one site: this is its id, the default for every table that
-- belongs to a site (so raw SQL and scripts needn't name it). With any other number of sites it
-- raises instead of guessing; a multi-site edition passes site_id explicitly.
create or replace function private.only_site_id()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  found uuid;
  n int;
begin
  select count(*), min(id::text)::uuid into n, found from public.sites;
  if n <> 1 then
    raise exception 'Expected exactly one site, found %; pass site_id explicitly', n
      using errcode = 'P0001';
  end if;
  return found;
end;
$$;
