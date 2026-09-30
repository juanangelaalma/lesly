-- Lesly core schema: tenant-scoped tables, constraints and read policies.
-- All writes go through security-definer RPCs defined in the next migration.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.billing_mode as enum ('monthly', 'per_session');
create type public.session_status as enum ('scheduled', 'completed', 'student_absent', 'teacher_cancelled');
create type public.understanding_level as enum ('independent', 'assisted', 'repeat');
create type public.invoice_item_kind as enum ('monthly', 'session', 'opening_balance', 'adjustment');
create type public.payment_status as enum ('posted', 'void');
create type public.payment_method as enum ('cash', 'transfer', 'other');
create type public.student_status as enum ('active', 'archived');

create table public.teacher_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '' check (char_length(display_name) <= 80),
  phone text check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
  timezone text not null default 'Asia/Jakarta'
    check (timezone in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')),
  report_signature text check (report_signature is null or char_length(report_signature) <= 120),
  onboarded_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  grade text check (grade is null or char_length(grade) <= 40),
  subject text check (subject is null or char_length(subject) <= 80),
  address text check (address is null or char_length(address) <= 200),
  guardian_name text check (guardian_name is null or char_length(guardian_name) <= 80),
  guardian_phone text check (guardian_phone is null or guardian_phone ~ '^\+[1-9][0-9]{7,14}$'),
  notes text check (notes is null or char_length(notes) <= 500),
  status public.student_status not null default 'active',
  archived_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);
create index students_owner_status_idx on public.students (owner_id, status, name);

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null,
  mode public.billing_mode not null,
  amount bigint not null check (amount > 0 and amount <= 100000000),
  effective_from date not null,
  created_at timestamptz not null default now(),
  foreign key (student_id, owner_id) references public.students (id, owner_id) on delete cascade,
  unique (student_id, effective_from)
);
create index billing_plans_owner_idx on public.billing_plans (owner_id, student_id, effective_from desc);

create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  active_from date not null,
  active_until date,
  created_at timestamptz not null default now(),
  foreign key (student_id, owner_id) references public.students (id, owner_id) on delete cascade,
  unique (id, owner_id),
  check (active_until is null or active_until >= active_from - 1)
);
create index schedule_rules_owner_idx on public.schedule_rules (owner_id, student_id);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null,
  rule_id uuid,
  occurrence_date date,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 480),
  status public.session_status not null default 'scheduled',
  status_reason text check (status_reason is null or char_length(status_reason) <= 200),
  rescheduled boolean not null default false,
  completed_at timestamptz,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (student_id, owner_id) references public.students (id, owner_id) on delete cascade,
  foreign key (rule_id, owner_id) references public.schedule_rules (id, owner_id) on delete set null (rule_id),
  unique (id, owner_id),
  unique (rule_id, occurrence_date)
);
create index sessions_owner_start_idx on public.sessions (owner_id, starts_at);
create index sessions_student_start_idx on public.sessions (student_id, starts_at desc);

create table public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null,
  name text not null check (char_length(name) between 1 and 120),
  normalized_name text not null,
  created_at timestamptz not null default now(),
  foreign key (student_id, owner_id) references public.students (id, owner_id) on delete cascade,
  unique (id, owner_id),
  unique (student_id, normalized_name)
);

create table public.session_notes (
  session_id uuid primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  topic_id uuid not null,
  understanding public.understanding_level not null,
  note text check (note is null or char_length(note) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_id, owner_id),
  foreign key (session_id, owner_id) references public.sessions (id, owner_id) on delete cascade,
  foreign key (topic_id, owner_id) references public.learning_topics (id, owner_id)
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null,
  period date not null check (extract(day from period) = 1),
  created_at timestamptz not null default now(),
  foreign key (student_id, owner_id) references public.students (id, owner_id) on delete cascade,
  unique (id, owner_id),
  unique (student_id, period)
);
create index invoices_owner_period_idx on public.invoices (owner_id, period desc);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null,
  kind public.invoice_item_kind not null,
  session_id uuid,
  amount bigint not null check (amount <> 0 and abs(amount) <= 100000000),
  description text not null check (char_length(description) between 1 and 160),
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) <= 200),
  created_at timestamptz not null default now(),
  foreign key (invoice_id, owner_id) references public.invoices (id, owner_id) on delete cascade,
  foreign key (session_id, owner_id) references public.sessions (id, owner_id),
  check ((kind = 'session') = (session_id is not null)),
  check (kind = 'adjustment' or amount > 0),
  check ((voided_at is null) = (void_reason is null))
);
create unique index invoice_items_one_live_charge_per_session
  on public.invoice_items (session_id) where voided_at is null and session_id is not null;
create unique index invoice_items_one_live_monthly_fee
  on public.invoice_items (invoice_id) where voided_at is null and kind = 'monthly';
create index invoice_items_invoice_idx on public.invoice_items (invoice_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  invoice_id uuid not null,
  amount bigint not null check (amount > 0 and amount <= 100000000),
  paid_on date not null,
  method public.payment_method not null default 'cash',
  note text check (note is null or char_length(note) <= 200),
  status public.payment_status not null default 'posted',
  voided_at timestamptz,
  void_reason text check (void_reason is null or char_length(void_reason) <= 200),
  created_at timestamptz not null default now(),
  foreign key (invoice_id, owner_id) references public.invoices (id, owner_id) on delete cascade,
  check ((status = 'void') = (voided_at is not null)),
  check ((status = 'void') = (void_reason is not null))
);
create index payments_invoice_idx on public.payments (invoice_id);

create table public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  reason text,
  created_at timestamptz not null default now()
);
create index audit_events_owner_entity_idx on public.audit_events (owner_id, entity_id, created_at desc);

create table public.mutation_requests (
  owner_id uuid not null references auth.users (id) on delete cascade,
  request_key uuid not null,
  operation text not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (owner_id, request_key)
);

create table public.product_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (name in ('report_whatsapp_opened', 'report_copied', 'reminder_whatsapp_opened', 'reminder_copied', 'data_exported')),
  entity_id uuid,
  created_at timestamptz not null default now()
);
create index product_events_owner_entity_idx on public.product_events (owner_id, entity_id, created_at desc);

-- Row level security: owners may read their own rows. No direct writes.
do $$
declare
  t text;
begin
  foreach t in array array[
    'students', 'billing_plans', 'schedule_rules', 'sessions', 'learning_topics',
    'session_notes', 'invoices', 'invoice_items', 'payments', 'audit_events', 'product_events'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using ((select auth.uid()) = owner_id)',
      t || '_read_own', t
    );
    execute format('revoke insert, update, delete, truncate on public.%I from anon, authenticated', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

alter table public.teacher_profiles enable row level security;
create policy teacher_profiles_read_own on public.teacher_profiles
  for select to authenticated using ((select auth.uid()) = id);
revoke insert, update, delete, truncate on public.teacher_profiles from anon, authenticated;
revoke all on public.teacher_profiles from anon;

alter table public.mutation_requests enable row level security;
revoke all on public.mutation_requests from anon, authenticated;

-- Invoice totals derived from live items and posted payments.
create view public.invoice_balances with (security_invoker = true) as
select
  i.id,
  i.owner_id,
  i.student_id,
  i.period,
  coalesce(items.total, 0)::bigint as total,
  coalesce(pay.paid, 0)::bigint as paid,
  (coalesce(items.total, 0) - coalesce(pay.paid, 0))::bigint as balance,
  case
    when coalesce(items.total, 0) = 0 then 'empty'
    when coalesce(pay.paid, 0) = 0 then 'unpaid'
    when coalesce(pay.paid, 0) < coalesce(items.total, 0) then 'partial'
    else 'paid'
  end as status
from public.invoices i
left join lateral (
  select sum(ii.amount) as total from public.invoice_items ii
  where ii.invoice_id = i.id and ii.voided_at is null
) items on true
left join lateral (
  select sum(p.amount) as paid from public.payments p
  where p.invoice_id = i.id and p.status = 'posted'
) pay on true;

revoke all on public.invoice_balances from anon;
grant select on public.invoice_balances to authenticated;

-- New auth users get an empty profile to complete during onboarding.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.teacher_profiles (id, display_name)
  values (new.id, coalesce(left(new.raw_user_meta_data ->> 'display_name', 80), ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
