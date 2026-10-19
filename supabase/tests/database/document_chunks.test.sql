-- Row-level security and search for document chunks (#13). Run with `npm run db:test`.
--
-- The people and boats come from setup/tenancy.psql:
--   Ada:  owner of Kestrel, read-only on Petrel
--   Ben:  owner of Petrel, co-owner of Kestrel
--   Cleo: crew on Kestrel
--   Dev:  on no boat

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Setup, as the database owner -------------------------------------------------------------

\ir setup/tenancy.psql

-- A vector of 1024 zeros with a 1 at position `i`: easy to reason about, since a chunk's own
-- vector is the closest to itself and all the others are equally far.
create function pg_temp.unit(i integer) returns extensions.vector language sql as $$
  select array_agg(case when g = i then 1 else 0 end order by g)::real[]::extensions.vector
  from generate_series(1, 1024) g
$$;
grant execute on function pg_temp.unit(integer) to authenticated, anon;

-- A manual on each boat, and chunks: two on Kestrel's, one on Petrel's.
insert into public.documents (id, boat_id, storage_path, type, source, filename) values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/engine-manual.pdf', 'manual', 'email', 'engine-manual.pdf'),
  ('60000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002/winch-manual.pdf', 'manual', 'upload', 'winch-manual.pdf');

insert into public.document_chunks
  (id, boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
values
  ('70000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001', 41, 0, 'Kestrel: oil capacity', pg_temp.unit(1), 'test-model'),
  ('70000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001', 42, 1, 'Kestrel: impeller', pg_temp.unit(2), 'test-model'),
  ('70000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002',
   '60000000-0000-0000-0000-000000000002', 7, 0, 'Petrel: winch service', pg_temp.unit(3), 'test-model');

select has_extension('extensions', 'vector', 'pgvector is installed');

select throws_ok(
  $$ insert into public.document_chunks (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000002',
             1, 5, 'wrong boat', pg_temp.unit(4), 'test-model') $$,
  '23503',
  null,
  'a chunk''s boat must be its document''s boat'
);

select throws_ok(
  $$ insert into public.document_chunks (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
             0, 5, 'page zero', pg_temp.unit(4), 'test-model') $$,
  '23514',
  null,
  'pages start at 1'
);

-- Not signed in ----------------------------------------------------------------------------

set local role anon;

select throws_ok(
  'select count(*) from public.document_chunks',
  '42501',
  null,
  'anonymous requests can''t read chunks'
);

select throws_ok(
  $$ select * from public.search_document_chunks(pg_temp.unit(1), 'test-model') $$,
  '42501',
  null,
  'anonymous requests can''t search'
);

-- Ada: owner of Kestrel, read-only on Petrel -----------------------------------------------

select pg_temp.sign_in_as('ada@example.test');

select results_eq(
  'select content from public.document_chunks order by content',
  $$ values ('Kestrel: impeller'), ('Kestrel: oil capacity'), ('Petrel: winch service') $$,
  'a member sees the chunks of each of their boats'
);

select results_eq(
  $$ select content, page, filename from public.search_document_chunks(pg_temp.unit(2), 'test-model', 1) $$,
  $$ values ('Kestrel: impeller', 42, 'engine-manual.pdf') $$,
  'search returns the closest chunk first, with its page and document'
);

select is(
  (select count(*)::integer from public.search_document_chunks(pg_temp.unit(2), 'test-model', 2)),
  2,
  'search returns at most match_count chunks'
);

select results_eq(
  $$ select content from public.search_document_chunks(pg_temp.unit(3), 'test-model', 5,
       '10000000-0000-0000-0000-000000000001') order by content $$,
  $$ values ('Kestrel: impeller'), ('Kestrel: oil capacity') $$,
  'search can be kept to one of the caller''s boats'
);

select is_empty(
  $$ select * from public.search_document_chunks(pg_temp.unit(1), 'another-model') $$,
  'search only compares with chunks from the same model'
);

select lives_ok(
  $$ insert into public.document_chunks (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000001',
             43, 2, 'Kestrel: lay-up', pg_temp.unit(5), 'test-model') $$,
  'an owner can add chunks to their boat'
);

select throws_ok(
  $$ insert into public.document_chunks (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002',
             8, 1, 'read-only write', pg_temp.unit(6), 'test-model') $$,
  '42501',
  null,
  'a read-only member can''t add chunks'
);

delete from public.document_chunks where boat_id = '10000000-0000-0000-0000-000000000002';

select throws_ok(
  $$ update public.document_chunks set content = 'changed' $$,
  '42501',
  null,
  'chunks can''t be edited, only replaced'
);

-- Cleo: crew on Kestrel only -------------------------------------------------------------

select pg_temp.sign_in_as('cleo@example.test');

select is_empty(
  $$ select * from public.document_chunks where boat_id = '10000000-0000-0000-0000-000000000002' $$,
  'a person doesn''t see chunks of a boat they''re not on'
);

-- The cross-boat leak test: Petrel's own vector, so Petrel's chunk would be the best match if
-- search could see it.
select is_empty(
  $$ select * from public.search_document_chunks(pg_temp.unit(3), 'test-model', 50)
     where boat_id <> '10000000-0000-0000-0000-000000000001' $$,
  'search never returns chunks of another boat, even the closest match'
);

select results_eq(
  $$ select count(*)::integer from public.search_document_chunks(pg_temp.unit(3), 'test-model', 50) $$,
  $$ values (3) $$,
  'search still returns the caller''s own boat''s chunks'
);

select is_empty(
  $$ select * from public.search_document_chunks(pg_temp.unit(3), 'test-model', 5,
       '10000000-0000-0000-0000-000000000002') $$,
  'asking for another boat by ID returns nothing'
);

select throws_ok(
  $$ insert into public.document_chunks (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002',
             9, 2, 'not my boat', pg_temp.unit(7), 'test-model') $$,
  '42501',
  null,
  'a person can''t add chunks to a boat they''re not on'
);

delete from public.document_chunks where boat_id = '10000000-0000-0000-0000-000000000002';

select lives_ok(
  $$ delete from public.document_chunks where content = 'Kestrel: lay-up' $$,
  'crew can remove chunks when re-indexing'
);

-- Dev: on no boat ------------------------------------------------------------------------

select pg_temp.sign_in_as('dev@example.test');

select is_empty(
  $$ select * from public.search_document_chunks(pg_temp.unit(1), 'test-model', 50) $$,
  'a person on no boat finds nothing'
);

-- As the database owner again ------------------------------------------------------------

reset role;

select is(
  (select count(*)::integer from public.document_chunks
   where boat_id = '10000000-0000-0000-0000-000000000002'),
  1,
  'neither a read-only member nor an outsider could remove another boat''s chunks'
);

select is(
  (select count(*)::integer from public.document_chunks where content = 'Kestrel: lay-up'),
  0,
  'the crew member''s removal went through'
);

-- The indexing job runs as the service role.
set local role service_role;

select lives_ok(
  $$ insert into public.document_chunks (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000002', '60000000-0000-0000-0000-000000000002',
             8, 1, 'Petrel: winch grease', pg_temp.unit(8), 'test-model') $$,
  'the indexing job can add chunks'
);

reset role;

delete from public.documents where id = '60000000-0000-0000-0000-000000000002';

select is(
  (select count(*)::integer from public.document_chunks
   where document_id = '60000000-0000-0000-0000-000000000002'),
  0,
  'deleting a document deletes its chunks'
);

select * from finish();
rollback;
