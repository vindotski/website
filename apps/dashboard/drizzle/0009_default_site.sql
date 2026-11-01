-- Custom migration (drizzle-kit generate --custom): what Drizzle doesn't express.

-- An install from before multiple sites: its one site becomes the default (what /api serves).
update sites set is_default = true
where id = (select id from sites order by created_at limit 1)
  and not exists (select 1 from sites where is_default);

-- Every insert names its site now; the single-site default is gone.
drop function if exists private.only_site_id();
