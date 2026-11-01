-- Custom migration (drizzle-kit generate --custom): what Drizzle doesn't express.

-- Keep updated_at correct for every writer (dashboard, SQL, scripts).
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
--> statement-breakpoint
create trigger sites_set_updated_at
  before update on public.sites
  for each row execute procedure private.set_updated_at();
--> statement-breakpoint
create trigger entries_set_updated_at
  before update on public.entries
  for each row execute procedure private.set_updated_at();
--> statement-breakpoint
-- Every site starts with its root folder (path ''); everything else sits below it.
create or replace function private.create_site_root()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  insert into public.entries (site_id, kind, slug, path) values (new.id, 'folder', '', '');
  return new;
end;
$$;
--> statement-breakpoint
create trigger sites_create_root
  after insert on public.sites
  for each row execute procedure private.create_site_root();
