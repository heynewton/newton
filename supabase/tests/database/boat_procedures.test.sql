-- Boat procedures and their search chunks follow the boat and owner/co-owner roles (#21).
-- Run with `npm run db:test`.

begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

\ir setup/tenancy.psql

create function pg_temp.unit(i integer) returns extensions.vector language sql as $$
  select array_agg(case when g = i then 1 else 0 end order by g)::real[]::extensions.vector
  from generate_series(1, 1024) g
$$;
grant execute on function pg_temp.unit(integer) to authenticated, anon;

create function pg_temp.update_boat_procedure(target_id uuid, new_content text)
returns integer language plpgsql as $$
declare
  affected integer;
begin
  update public.boat_procedures set content = new_content where id = target_id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;
grant execute on function pg_temp.update_boat_procedure(uuid, text) to authenticated, anon;

create function pg_temp.delete_boat_procedure(target_id uuid)
returns integer language plpgsql as $$
declare
  affected integer;
begin
  delete from public.boat_procedures where id = target_id;
  get diagnostics affected = row_count;
  return affected;
end;
$$;
grant execute on function pg_temp.delete_boat_procedure(uuid) to authenticated, anon;

insert into public.documents (id, boat_id, storage_path, type, source, filename)
values
  ('60000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001/engine-manual.pdf', 'manual', 'upload', 'engine-manual.pdf');

insert into public.document_chunks
  (boat_id, document_id, page, chunk_index, content, embedding, embedding_model)
values
  ('10000000-0000-0000-0000-000000000001',
   '60000000-0000-0000-0000-000000000001', 7, 0, 'Kestrel: engine manual', pg_temp.unit(4), 'test-model');

insert into public.boat_procedures (id, boat_id, title, content) values
  ('80000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   'Kestrel mooring', 'Approach from downwind and pick up the line.'),
  ('80000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   'Petrel mooring', 'Approach from up-current and pick up the line.');

insert into public.procedure_chunks
  (id, boat_id, procedure_id, chunk_index, content, embedding, embedding_model)
values
  ('90000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
   '80000000-0000-0000-0000-000000000001', 0, 'Kestrel: downwind', pg_temp.unit(1), 'test-model'),
  ('90000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002',
   '80000000-0000-0000-0000-000000000002', 0, 'Petrel: up-current', pg_temp.unit(2), 'test-model');

select throws_ok(
  $$ insert into public.boat_procedures (boat_id, title, content)
     values ('10000000-0000-0000-0000-000000000001', '   ', 'Text') $$,
  '23514', null, 'a procedure title cannot be blank'
);
select throws_ok(
  $$ insert into public.boat_procedures (boat_id, title, content)
     values ('10000000-0000-0000-0000-000000000001', 'Empty', '   ') $$,
  '23514', null, 'a procedure cannot be blank'
);

select pg_temp.sign_in_as('ada@example.test');
select results_eq(
  $$ select title from public.boat_procedures order by title $$,
  $$ values ('Kestrel mooring'), ('Petrel mooring') $$,
  'a member can read procedures on each of their boats'
);
select results_eq(
  $$ select source_type, procedure_title, content from public.search_document_chunks(pg_temp.unit(1), 'test-model', 1) $$,
  $$ values ('procedure', 'Kestrel mooring', 'Kestrel: downwind') $$,
  'search returns procedure name and content for its closest match'
);
select is(
  (select count(*)::integer from public.search_document_chunks(
    pg_temp.unit(1), 'test-model', 10, '10000000-0000-0000-0000-000000000001'
  )),
  2,
  'search returns the boat''s procedure and manual chunks together'
);
select lives_ok(
  $$ insert into public.boat_procedures (boat_id, title, content)
     values ('10000000-0000-0000-0000-000000000001', 'Owner addition', 'Owner text') $$,
  'an owner can add a procedure'
);
select lives_ok(
  $$ select public.save_boat_procedure(
       '10000000-0000-0000-0000-000000000001',
       null,
       'Indexed procedure',
       'Check the anchor light.',
       jsonb_build_array(jsonb_build_object(
         'chunk_index', 0,
         'content', 'Indexed procedure: Check the anchor light.',
         'embedding', pg_temp.unit(3)::text,
         'embedding_model', 'test-model'
       ))
     ) $$,
  'saving a procedure and its search chunks succeeds together'
);
select is(
  (select count(*)::integer from public.procedure_chunks c
   join public.boat_procedures p on p.id = c.procedure_id
   where p.title = 'Indexed procedure'),
  1,
  'saving a procedure also stores its search chunk'
);
select lives_ok(
  $$ update public.boat_procedures set title = 'Owner edit'
     where id = '80000000-0000-0000-0000-000000000001' $$,
  'an owner can edit a procedure'
);
select throws_ok(
  $$ insert into public.boat_procedures (boat_id, title, content)
     values ('10000000-0000-0000-0000-000000000002', 'Wrong boat', 'No') $$,
  '42501', null, 'a read-only member cannot write procedures on another boat'
);

select pg_temp.sign_in_as('ben@example.test');
select lives_ok(
  $$ insert into public.boat_procedures (boat_id, title, content)
     values ('10000000-0000-0000-0000-000000000001', 'Co-owner addition', 'Co-owner text') $$,
  'a co-owner can add a procedure'
);

select pg_temp.sign_in_as('cleo@example.test');
select is_empty(
  $$ select * from public.boat_procedures where boat_id = '10000000-0000-0000-0000-000000000002' $$,
  'crew cannot read another boat''s procedures'
);
select is_empty(
  $$ select * from public.search_document_chunks(pg_temp.unit(2), 'test-model', 10)
     where boat_id <> '10000000-0000-0000-0000-000000000001' $$,
  'search never leaks another boat''s procedures'
);
select is(
  (select count(*)::integer from public.search_document_chunks(pg_temp.unit(1), 'test-model', 10)),
  3,
  'crew can search procedure and manual chunks on their boat'
);
select throws_ok(
  $$ insert into public.boat_procedures (boat_id, title, content)
     values ('10000000-0000-0000-0000-000000000001', 'Crew addition', 'Not allowed') $$,
  '42501', null, 'crew cannot add procedures'
);
select throws_ok(
  $$ insert into public.procedure_chunks (boat_id, procedure_id, chunk_index, content, embedding, embedding_model)
     values ('10000000-0000-0000-0000-000000000001', '80000000-0000-0000-0000-000000000001',
             1, 'Crew chunk', pg_temp.unit(3), 'test-model') $$,
  '42501', null, 'crew cannot add procedure search chunks'
);
select is(
  pg_temp.update_boat_procedure('80000000-0000-0000-0000-000000000001', 'Crew edit'),
  0,
  'crew cannot edit procedures'
);
select is(
  pg_temp.delete_boat_procedure('80000000-0000-0000-0000-000000000001'),
  0,
  'crew cannot delete procedures'
);

select pg_temp.sign_in_as('ada@example.test');
select is(
  pg_temp.update_boat_procedure('80000000-0000-0000-0000-000000000002', 'Read-only edit'),
  0,
  'read-only members cannot edit procedures'
);
select is(
  pg_temp.delete_boat_procedure('80000000-0000-0000-0000-000000000002'),
  0,
  'read-only members cannot delete procedures'
);

select pg_temp.sign_in_as('dev@example.test');
select is_empty(
  $$ select * from public.search_document_chunks(pg_temp.unit(1), 'test-model', 10) $$,
  'a person on no boat cannot search any procedure'
);

reset role;
select is(
  (select count(*)::integer from public.boat_procedures where title = 'Petrel mooring'),
  1,
  'the read-only member could not change another boat''s procedure'
);
select pg_temp.sign_in_as('ada@example.test');
select lives_ok(
  $$ delete from public.boat_procedures where id = '80000000-0000-0000-0000-000000000001' $$,
  'an owner can delete a procedure'
);
reset role;
select is(
  (select count(*)::integer from public.procedure_chunks
   where procedure_id = '80000000-0000-0000-0000-000000000001'),
  0,
  'deleting a procedure removes its search chunks'
);

select * from finish();
rollback;
