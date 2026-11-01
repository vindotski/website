-- Search moved to Spotcraft (apps/dashboard), so the search index and its
-- function go, with the extensions only they used. Supabase keeps the login

drop function if exists match_documents(extensions.vector, int, text[], text[]);
drop table if exists documents;

drop extension if exists vector;
drop extension if exists moddatetime;
