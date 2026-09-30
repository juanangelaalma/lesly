begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'a@test.dev', '{"display_name":"Bu Ani"}'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'b@test.dev', '{}');

select is((select display_name from public.teacher_profiles where id = '11111111-1111-1111-1111-111111111111'),
  'Bu Ani', 'signup trigger creates a teacher profile');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

select pg_temp.act_as('11111111-1111-1111-1111-111111111111');

-- Monthly student with two absences stays at the fixed monthly fee.
create temp table ids (k text primary key, v uuid) on commit drop;
grant all on ids to authenticated;
insert into ids select 'monthly', (public.create_student(
  gen_random_uuid(), 'Raka', 'SD 5', 'Matematika', null, 'Ibu Sari', '+6281234567890', null,
  'monthly', 400000, date '2026-09-01') ->> 'studentId')::uuid;
insert into ids select 'per', (public.create_student(
  gen_random_uuid(), 'Nadia', 'SMP 1', 'IPA', null, null, null, null,
  'per_session', 75000, date '2026-09-01') ->> 'studentId')::uuid;

insert into ids select 'm1', (public.create_session(gen_random_uuid(), (select v from ids where k = 'monthly'),
  timestamptz '2026-09-01 15:00+07', 90) ->> 'sessionId')::uuid;
insert into ids select 'm2', (public.create_session(gen_random_uuid(), (select v from ids where k = 'monthly'),
  timestamptz '2026-09-03 15:00+07', 90) ->> 'sessionId')::uuid;
select public.set_session_status((select v from ids where k = 'm1'), 1, 'student_absent', 'Sakit');
select public.set_session_status((select v from ids where k = 'm2'), 1, 'teacher_cancelled', null);
select public.ensure_invoices(date '2026-09-15');
select public.ensure_invoices(date '2026-09-20');

select is((select total from public.invoice_balances where student_id = (select v from ids where k = 'monthly')),
  400000::bigint, 'monthly fee is fixed despite absences, ensure_invoices idempotent');
select is((select status from public.invoice_balances where student_id = (select v from ids where k = 'monthly')),
  'unpaid', 'monthly invoice starts unpaid');

-- Partial payment.
insert into ids select 'minv', id from public.invoices where student_id = (select v from ids where k = 'monthly');
insert into ids values ('payKey', gen_random_uuid());
select is((public.record_payment((select v from ids where k = 'payKey'), (select v from ids where k = 'minv'),
  150000, date '2026-09-10', 'transfer', null) ->> 'balance')::bigint, 250000::bigint, 'partial payment returns remaining balance');
select is((public.record_payment((select v from ids where k = 'payKey'), (select v from ids where k = 'minv'),
  150000, date '2026-09-10', 'transfer', null) ->> 'balance')::bigint, 250000::bigint, 'replayed payment request returns the cached result');
select is((select count(*) from public.payments where invoice_id = (select v from ids where k = 'minv')), 1::bigint,
  'replayed payment request does not duplicate the payment');
select is((select status from public.invoice_balances where id = (select v from ids where k = 'minv')), 'partial', 'status partial');
select throws_like(
  format('select public.record_payment(%L, %L, 250001, date ''2026-09-10'', ''cash'', null)', gen_random_uuid(), (select v from ids where k = 'minv')),
  'PAYMENT_EXCEEDS_BALANCE:%', 'overpayment is rejected');
select throws_like(
  format('select public.record_payment(%L, %L, 0, date ''2026-09-10'', ''cash'', null)', gen_random_uuid(), (select v from ids where k = 'minv')),
  'VALIDATION:%', 'zero payment is rejected');

-- Void payment keeps the row and restores the balance.
select throws_like(
  format('select public.void_payment(%L, %L)', (select id from public.payments where invoice_id = (select v from ids where k = 'minv')), ''),
  'VALIDATION:%', 'void requires a reason');
select public.void_payment((select id from public.payments where invoice_id = (select v from ids where k = 'minv')), 'Salah input');
select is((select balance from public.invoice_balances where id = (select v from ids where k = 'minv')), 400000::bigint,
  'voided payment no longer counts');
select is((select count(*) from public.payments where invoice_id = (select v from ids where k = 'minv') and status = 'void'), 1::bigint,
  'voided payment row is preserved');

-- Per-session student: only completed sessions are charged, once.
insert into ids select 'p1', (public.create_session(gen_random_uuid(), (select v from ids where k = 'per'),
  timestamptz '2026-09-02 10:00+07', 60) ->> 'sessionId')::uuid;
insert into ids select 'p2', (public.create_session(gen_random_uuid(), (select v from ids where k = 'per'),
  timestamptz '2026-09-04 10:00+07', 60) ->> 'sessionId')::uuid;
insert into ids values ('doneKey', gen_random_uuid());
select public.complete_session((select v from ids where k = 'doneKey'), (select v from ids where k = 'p1'), 1,
  'Pecahan', 'assisted', 'Perlu latihan soal cerita');
select public.complete_session((select v from ids where k = 'doneKey'), (select v from ids where k = 'p1'), 1,
  'Pecahan', 'assisted', 'Perlu latihan soal cerita');
select public.set_session_status((select v from ids where k = 'p2'), 1, 'student_absent', null);
select public.ensure_invoices(date '2026-09-01');
insert into ids select 'pinv', id from public.invoices where student_id = (select v from ids where k = 'per');
select is((select total from public.invoice_balances where id = (select v from ids where k = 'pinv')), 75000::bigint,
  'per-session charges only the completed session, repeated completion is idempotent');
select throws_like(
  format('select public.complete_session(%L, %L, 2, ''Pecahan'', ''assisted'', null)', gen_random_uuid(), (select v from ids where k = 'p1')),
  'CONFLICT:%', 'completing an already completed session conflicts');

-- Reschedule keeps identity and creates no charge.
insert into ids select 'p3', (public.create_session(gen_random_uuid(), (select v from ids where k = 'per'),
  timestamptz '2026-09-05 10:00+07', 60) ->> 'sessionId')::uuid;
select public.reschedule_session((select v from ids where k = 'p3'), 1, timestamptz '2026-09-06 10:00+07', 60);
select is((select count(*) from public.sessions where student_id = (select v from ids where k = 'per')), 3::bigint,
  'reschedule keeps the same session row');
select throws_like(
  format('select public.create_session(%L, %L, ''2026-09-06 10:30+07'', 60)', gen_random_uuid(), (select v from ids where k = 'monthly')),
  'SCHEDULE_OVERLAP:%', 'overlapping sessions are rejected');
select throws_like(
  format('select public.complete_session(%L, %L, 1, ''x'', ''independent'', null)', gen_random_uuid(),
    (public.create_session(gen_random_uuid(), (select v from ids where k = 'per'), now() + interval '2 days', 60) ->> 'sessionId')),
  'VALIDATION:%', 'future session cannot be completed');

-- Reopen cannot push total below payments.
select public.record_payment(gen_random_uuid(), (select v from ids where k = 'pinv'), 75000, date '2026-09-05', 'cash', null);
select throws_like(
  format('select public.reopen_session(%L, 2, ''Salah murid'')', (select v from ids where k = 'p1')),
  'CONFLICT:%', 'reopen cannot make the balance negative');
select throws_like(
  format('select public.add_invoice_item(%L, %L, ''adjustment'', -10000, ''Diskon'')', gen_random_uuid(), (select v from ids where k = 'pinv')),
  'CONFLICT:%', 'negative adjustment cannot go below payments');

-- Stale version.
select throws_like(
  format('select public.update_student(%L, 99, ''Raka'', null, null, null, null, null, null)', (select v from ids where k = 'monthly')),
  'CONFLICT:%', 'stale version is rejected');

-- Direct writes are blocked; reads are isolated per owner.
select throws_like(
  format('insert into public.payments (owner_id, invoice_id, amount, paid_on) values (%L, %L, 1, current_date)',
    '11111111-1111-1111-1111-111111111111', (select v from ids where k = 'minv')),
  '%permission denied%', 'direct table writes are denied');

select pg_temp.act_as('22222222-2222-2222-2222-222222222222');
select is((select count(*) from public.students), 0::bigint, 'other tutor cannot read students');
select is((select count(*) from public.invoice_balances), 0::bigint, 'other tutor cannot read invoices');
select throws_like(
  format('select public.record_payment(%L, %L, 1000, current_date, ''cash'', null)', gen_random_uuid(), (select v from ids where k = 'pinv')),
  'NOT_FOUND:%', 'other tutor cannot pay into foreign invoice');

select * from finish();
rollback;
