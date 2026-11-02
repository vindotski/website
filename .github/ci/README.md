# CI fixtures

`spotcraft-content/` is sample content for the `website` job in [`../workflows/ci.yml`](../workflows/ci.yml). The job starts a throwaway Spotcraft, imports that folder as the `vinski` site, and builds the site against it.

- **The `_config.json` files, `site.yaml` and `spotcraft.yaml` are copies of the real export,** so the fields and their rules match production.
- **The documents are made up.** The real export can't be committed: its scheduled posts would be published early in a public repository.

**Keep it in step:** when a folder's fields change in Spotcraft, run `pnpm cms:export` and copy the changed `_config.json` files into `spotcraft-content/`; if a required field was added, add it to the sample documents too. A sample that no longer fits fails the import or the site's build, so CI says so.

Only Spotcraft's own files may be in `spotcraft-content/`: the import rejects anything else, this README included.
