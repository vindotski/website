-- Search index over the site's MDX content. Derived from the repo and rebuilt
-- by scripts/embed; never edited by hand

-- Extensions
create extension if not exists vector with schema extensions;
create extension if not exists moddatetime with schema extensions;

-- Table: one row per chunk
create table documents (
  id            text primary key,              -- type/slug#heading-id, #heading-id:2 for later parts, or #tldr
  type          text not null,                 -- key from CONTENT_TYPES (validated in code)
  slug          text not null,
  title         text not null,
  heading       text,                          -- null for the tldr chunk
  tags          text[] not null default '{}',
  published_at  date,                          -- null = draft
  content       text not null,
  content_hash  text not null,                 -- of every stored field and the model
  embedding     extensions.vector(384) not null, -- gte-small, normalized
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Keep updated_at current on every update (including upserts)
create trigger documents_updated_at
  before update on documents
  for each row execute procedure extensions.moddatetime (updated_at);

-- Indexes. Embeddings are normalized, so inner product ranks like cosine and
-- is cheaper
create index documents_embedding_idx on documents
  using hnsw (embedding extensions.vector_ip_ops);
create index documents_type_slug_idx on documents (type, slug);

-- RLS on, no policies: only the service role (server-side) can read/write.
-- The baseline grants anon and authenticated table and routine privileges in
-- public by default, so take them back explicitly
alter table documents enable row level security;
revoke all on table documents from anon, authenticated;

-- Search. Only rows published by today (UTC, like isPublished in the app)
create or replace function match_documents(
  query_embedding extensions.vector(384),
  match_count     int     default 5,
  filter_types    text[]  default null,
  filter_tags     text[]  default null
)
returns table (
  id text, type text, slug text, title text, heading text,
  content text, published_at date, similarity float
)
language sql stable
set search_path = public, extensions
as $$
  -- <#> is the negative inner product, so ascending = most similar first
  select id, type, slug, title, heading, content, published_at,
         -(embedding <#> query_embedding) as similarity
  from documents
  where published_at is not null
    and published_at <= current_date
    and (filter_types is null or type = any(filter_types))
    and (filter_tags  is null or tags @> filter_tags)
  order by embedding <#> query_embedding
  limit match_count;
$$;

revoke execute on function match_documents(extensions.vector, int, text[], text[])
  from public, anon, authenticated;
grant execute on function match_documents(extensions.vector, int, text[], text[])
  to service_role;
