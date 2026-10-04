create type public.invoice_lifecycle as enum ('active', 'void');
create type public.invoice_item_kind as enum (
  'monthly',
  'session',
  'opening_balance',
  'adjustment'
);
create type public.invoice_item_state as enum ('active', 'void');
create type public.payment_method as enum ('cash', 'bank_transfer');
create type public.payment_state as enum ('posted', 'void');

alter table public.billing_plans
  add constraint billing_plans_owner_student_id_key unique (owner_id, student_id, id);
alter table public.sessions
  add constraint sessions_owner_student_id_key unique (owner_id, student_id, id);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  period_start date not null check (extract(day from period_start) = 1),
  mode_snapshot public.billing_mode not null,
  due_date date not null,
  invoice_number text not null,
  lifecycle public.invoice_lifecycle not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (owner_id, id),
  unique (owner_id, student_id, id),
  unique (owner_id, student_id, period_start),
  unique (owner_id, invoice_number),
  check (due_date >= period_start),
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  invoice_id uuid not null,
  student_id uuid not null,
  session_id uuid,
  plan_id uuid,
  kind public.invoice_item_kind not null,
  amount_rupiah bigint not null check (amount_rupiah between -100000000 and 100000000),
  description text not null check (char_length(btrim(description)) between 1 and 120),
  reason text,
  state public.invoice_item_state not null default 'active',
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  check (amount_rupiah <> 0),
  check (
    (kind in ('monthly', 'session') and amount_rupiah > 0)
    or kind in ('opening_balance', 'adjustment')
  ),
  check (
    kind not in ('opening_balance', 'adjustment')
    or char_length(btrim(coalesce(reason, ''))) between 1 and 300
  ),
  check (
    (kind = 'session' and session_id is not null)
    or (kind <> 'session' and session_id is null)
  ),
  foreign key (owner_id, invoice_id)
    references public.invoices (owner_id, id) on delete cascade,
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade,
  foreign key (owner_id, student_id, session_id)
    references public.sessions (owner_id, student_id, id),
  foreign key (owner_id, student_id, plan_id)
    references public.billing_plans (owner_id, student_id, id)
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  invoice_id uuid not null,
  amount_rupiah bigint not null check (amount_rupiah between 1 and 100000000),
  received_on date not null,
  method public.payment_method not null,
  state public.payment_state not null default 'posted',
  void_reason text,
  voided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, id),
  check (
    (state = 'posted' and void_reason is null and voided_at is null)
    or (
      state = 'void'
      and char_length(btrim(coalesce(void_reason, ''))) between 1 and 300
      and voided_at is not null
    )
  ),
  foreign key (owner_id, invoice_id)
    references public.invoices (owner_id, id) on delete cascade
);

create unique index invoice_items_one_monthly_active_idx
  on public.invoice_items (owner_id, invoice_id)
  where kind = 'monthly' and state = 'active';
create unique index invoice_items_one_session_charge_idx
  on public.invoice_items (owner_id, session_id)
  where kind = 'session' and state = 'active';
create unique index invoice_items_one_opening_balance_idx
  on public.invoice_items (owner_id, invoice_id)
  where kind = 'opening_balance' and state = 'active';
create index invoices_owner_period_idx
  on public.invoices (owner_id, period_start desc, student_id);
create index invoices_owner_student_idx
  on public.invoices (owner_id, student_id, period_start desc);
create index invoice_items_owner_invoice_idx
  on public.invoice_items (owner_id, invoice_id, state);
create index payments_owner_invoice_idx
  on public.payments (owner_id, invoice_id, state, received_on desc);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;

create policy invoices_read_own on public.invoices
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy invoice_items_read_own on public.invoice_items
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy payments_read_own on public.payments
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.invoices, public.invoice_items, public.payments
  from public, anon, authenticated;
grant select on public.invoices, public.invoice_items, public.payments to authenticated;

create function public.ensure_invoice_for_student(
  p_owner_id uuid,
  p_student_id uuid,
  p_period_start date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student public.students%rowtype;
  v_plan public.billing_plans%rowtype;
  v_period_end date;
  v_invoice_id uuid;
  v_invoice public.invoices%rowtype;
  v_monthly_item_id uuid;
begin
  if p_period_start is null or extract(day from p_period_start) <> 1 then
    raise exception 'Periode tagihan harus dimulai pada tanggal 1.' using errcode = '22023';
  end if;

  v_period_end := (p_period_start + interval '1 month' - interval '1 day')::date;
  select student.* into v_student
  from public.students as student
  where student.id = p_student_id and student.owner_id = p_owner_id;

  if v_student.id is null
    or v_student.starts_on > v_period_end
    or (v_student.ends_on is not null and v_student.ends_on < p_period_start) then
    return null;
  end if;

  select plan.* into v_plan
  from public.billing_plans as plan
  where plan.owner_id = p_owner_id
    and plan.student_id = p_student_id
    and plan.effective_month <= p_period_start
  order by plan.effective_month desc
  limit 1;

  if v_plan.id is null then
    return null;
  end if;

  insert into public.invoices (
    owner_id, student_id, period_start, mode_snapshot, due_date, invoice_number
  ) values (
    p_owner_id,
    p_student_id,
    p_period_start,
    v_plan.mode,
    p_period_start + (v_plan.due_day - 1),
    'TL-' || pg_catalog.to_char(p_period_start, 'YYYYMM') || '-'
      || pg_catalog.substr(gen_random_uuid()::text, 1, 8)
  )
  on conflict (owner_id, student_id, period_start) do nothing
  returning id into v_invoice_id;

  if v_invoice_id is not null then
    insert into public.audit_events (
      owner_id, entity_type, entity_id, action, actor_id, safe_diff
    ) values (
      p_owner_id, 'invoice', v_invoice_id, 'invoice.created', p_owner_id,
      pg_catalog.jsonb_build_object(
        'student_id', p_student_id,
        'period_start', p_period_start,
        'mode', v_plan.mode,
        'due_date', p_period_start + (v_plan.due_day - 1)
      )
    );
  else
    select invoice.id into v_invoice_id
    from public.invoices as invoice
    where invoice.owner_id = p_owner_id
      and invoice.student_id = p_student_id
      and invoice.period_start = p_period_start;
  end if;

  select invoice.* into v_invoice
  from public.invoices as invoice
  where invoice.id = v_invoice_id and invoice.owner_id = p_owner_id
  for update;

  if v_invoice.lifecycle = 'void' then
    raise exception 'Tagihan periode ini telah dibatalkan.' using errcode = '23514';
  end if;

  if v_invoice.mode_snapshot = 'monthly' then
    insert into public.invoice_items (
      owner_id, invoice_id, student_id, plan_id, kind, amount_rupiah, description
    ) values (
      p_owner_id, v_invoice.id, p_student_id, v_plan.id,
      'monthly', v_plan.rate_rupiah, 'Biaya les bulanan'
    )
    on conflict (owner_id, invoice_id)
      where kind = 'monthly' and state = 'active'
      do nothing
    returning id into v_monthly_item_id;

    if v_monthly_item_id is not null then
      insert into public.audit_events (
        owner_id, entity_type, entity_id, action, actor_id, safe_diff
      ) values (
        p_owner_id, 'invoice', v_invoice.id, 'invoice.item_created', p_owner_id,
        pg_catalog.jsonb_build_object(
          'item_id', v_monthly_item_id,
          'kind', 'monthly',
          'amount_rupiah', v_plan.rate_rupiah,
          'plan_id', v_plan.id
        )
      );
    end if;
  end if;

  return v_invoice.id;
end;
$$;

create function public.ensure_invoices(p_period_from date, p_period_to date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_period date;
  v_student_id uuid;
  v_count integer := 0;
  v_created uuid;
  v_period_count integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_period_from is null or p_period_to is null
    or extract(day from p_period_from) <> 1
    or extract(day from p_period_to) <> 1
    or p_period_to < p_period_from then
    raise exception 'Pilih rentang periode bulanan yang valid.' using errcode = '22023';
  end if;

  v_period_count :=
    (extract(year from p_period_to)::integer * 12 + extract(month from p_period_to)::integer)
    - (extract(year from p_period_from)::integer * 12 + extract(month from p_period_from)::integer);
  if v_period_count > 11 then
    raise exception 'Pembuatan tagihan dibatasi maksimal 12 bulan.' using errcode = '22023';
  end if;

  for v_period in
    select dates.period::date
    from pg_catalog.generate_series(p_period_from, p_period_to, interval '1 month')
      as dates(period)
  loop
    for v_student_id in
      select student.id
      from public.students as student
      where student.owner_id = v_owner_id
        and student.starts_on <= (v_period + interval '1 month' - interval '1 day')::date
        and (student.ends_on is null or student.ends_on >= v_period)
    loop
      v_created := public.ensure_invoice_for_student(v_owner_id, v_student_id, v_period);
      if v_created is not null then
        v_count := v_count + 1;
      end if;
    end loop;
  end loop;

  return v_count;
end;
$$;

create function public.complete_session(
  p_session_id uuid,
  p_expected_version integer,
  p_request_key uuid,
  p_topic_name text,
  p_understanding public.learning_understanding,
  p_note text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_session public.sessions%rowtype;
  v_student public.students%rowtype;
  v_topic_id uuid;
  v_note_id uuid;
  v_invoice_item_id uuid;
  v_note public.session_notes%rowtype;
  v_plan public.billing_plans%rowtype;
  v_invoice_id uuid;
  v_period date;
  v_hash text;
  v_old_hash text;
  v_response jsonb;
  v_completed_at timestamptz := now();
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_request_key is null
    or p_topic_name is null
    or pg_catalog.char_length(pg_catalog.btrim(p_topic_name)) not between 1 and 120
    or (p_note is not null and pg_catalog.char_length(pg_catalog.btrim(p_note)) > 300)
    or p_understanding is null then
    raise exception 'Isi materi, pemahaman, dan catatan dengan benar.' using errcode = '22023';
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.jsonb_build_object(
        'session_id', p_session_id,
        'expected_version', p_expected_version,
        'topic_name', pg_catalog.btrim(p_topic_name),
        'understanding', p_understanding,
        'note', nullif(pg_catalog.btrim(coalesce(p_note, '')), '')
      )::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.mutation_requests (owner_id, operation, request_key, payload_hash)
  values (v_owner_id, 'complete_session', p_request_key, v_hash)
  on conflict (owner_id, operation, request_key) do nothing;

  select request.payload_hash, request.response
  into v_old_hash, v_response
  from public.mutation_requests as request
  where request.owner_id = v_owner_id
    and request.operation = 'complete_session'
    and request.request_key = p_request_key
  for update;

  if v_old_hash <> v_hash then
    raise exception 'Request key sudah digunakan dengan data berbeda.' using errcode = '22023';
  end if;
  if v_response is not null then
    return (v_response ->> 'session_id')::uuid;
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile where profile.id = v_owner_id;

  select session.* into v_session
  from public.sessions as session
  where session.id = p_session_id and session.owner_id = v_owner_id
  for update;
  if v_session.id is null then
    raise exception 'Sesi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_session.state <> 'scheduled' or v_session.version <> p_expected_version then
    raise exception 'Sesi berubah atau sudah dicatat. Muat ulang sebelum mencoba lagi.' using errcode = '40001';
  end if;
  if v_session.starts_at > v_completed_at then
    raise exception 'Sesi yang akan datang belum dapat diselesaikan.' using errcode = '22023';
  end if;

  select student.* into v_student
  from public.students as student
  where student.id = v_session.student_id and student.owner_id = v_owner_id;
  if v_student.id is null
    or v_student.starts_on > (v_session.starts_at at time zone v_timezone)::date
    or (
      v_student.ends_on is not null
      and v_student.ends_on < (v_session.starts_at at time zone v_timezone)::date
    ) then
    raise exception 'Sesi berada di luar masa belajar murid.' using errcode = '22023';
  end if;

  insert into public.learning_topics (owner_id, student_id, name, normalized_name)
  values (
    v_owner_id,
    v_student.id,
    pg_catalog.btrim(p_topic_name),
    pg_catalog.lower(pg_catalog.btrim(p_topic_name))
  )
  on conflict (owner_id, student_id, normalized_name)
  do update set archived_at = null
  returning id into v_topic_id;

  select note.* into v_note
  from public.session_notes as note
  where note.owner_id = v_owner_id and note.session_id = v_session.id
  for update;

  if v_note.id is null then
    insert into public.session_notes (
      owner_id, student_id, session_id, topic_id, understanding, note
    ) values (
      v_owner_id, v_student.id, v_session.id, v_topic_id, p_understanding,
      nullif(pg_catalog.btrim(coalesce(p_note, '')), '')
    ) returning id into v_note_id;
  else
    insert into public.session_note_revisions (
      owner_id, note_id, topic_name, understanding, note, reason, changed_by
    )
    select
      v_owner_id, v_note.id, topic.name, v_note.understanding, v_note.note,
      'Catatan diperbarui saat sesi diselesaikan kembali', v_owner_id
    from public.learning_topics as topic
    where topic.id = v_note.topic_id and topic.owner_id = v_owner_id;

    update public.session_notes
    set topic_id = v_topic_id,
        understanding = p_understanding,
        note = nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
        updated_at = now(),
        version = version + 1
    where id = v_note.id and owner_id = v_owner_id
    returning id into v_note_id;
  end if;

  v_period := pg_catalog.date_trunc(
    'month', v_session.starts_at at time zone v_timezone
  )::date;

  select plan.* into v_plan
  from public.billing_plans as plan
  where plan.owner_id = v_owner_id
    and plan.student_id = v_student.id
    and plan.effective_month <= v_period
  order by plan.effective_month desc
  limit 1;
  if v_plan.id is null then
    raise exception 'Tarif sesi belum tersedia untuk periode ini.' using errcode = '23514';
  end if;

  v_invoice_id := public.ensure_invoice_for_student(v_owner_id, v_student.id, v_period);
  if v_invoice_id is null then
    raise exception 'Tagihan sesi tidak dapat dibuat untuk periode ini.' using errcode = '23514';
  end if;

  if v_plan.mode = 'per_session' then
    insert into public.invoice_items (
      owner_id, invoice_id, student_id, session_id, plan_id,
      kind, amount_rupiah, description
    ) values (
      v_owner_id, v_invoice_id, v_student.id, v_session.id, v_plan.id,
      'session', v_plan.rate_rupiah, 'Biaya sesi belajar'
    )
    on conflict (owner_id, session_id)
      where kind = 'session' and state = 'active'
      do nothing
    returning id into v_invoice_item_id;

    if v_invoice_item_id is not null then
      insert into public.audit_events (
        owner_id, entity_type, entity_id, action, actor_id, safe_diff
      ) values (
        v_owner_id, 'invoice', v_invoice_id, 'invoice.item_created', v_owner_id,
        pg_catalog.jsonb_build_object(
          'item_id', v_invoice_item_id,
          'kind', 'session',
          'amount_rupiah', v_plan.rate_rupiah,
          'session_id', v_session.id,
          'plan_id', v_plan.id
        )
      );
    end if;
  end if;

  update public.sessions
  set state = 'completed',
      completed_at = v_completed_at,
      updated_at = now(),
      version = version + 1
  where id = v_session.id and owner_id = v_owner_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session', v_session.id, 'session.completed', v_owner_id,
    pg_catalog.jsonb_build_object('version', v_session.version + 1, 'invoice_id', v_invoice_id)
  );
  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session_note', v_note_id, 'session_note.created', v_owner_id,
    pg_catalog.jsonb_build_object('understanding', p_understanding)
  );

  update public.mutation_requests
  set response = pg_catalog.jsonb_build_object('session_id', v_session.id),
      completed_at = now()
  where owner_id = v_owner_id
    and operation = 'complete_session'
    and request_key = p_request_key;

  return v_session.id;
end;
$$;

create function public.update_session_note(
  p_note_id uuid,
  p_expected_version integer,
  p_topic_name text,
  p_understanding public.learning_understanding,
  p_note text,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_current public.session_notes%rowtype;
  v_session public.sessions%rowtype;
  v_topic_id uuid;
  v_version integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_topic_name is null
    or p_reason is null
    or pg_catalog.char_length(pg_catalog.btrim(p_topic_name)) not between 1 and 120
    or (p_note is not null and pg_catalog.char_length(pg_catalog.btrim(p_note)) > 300)
    or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Periksa materi, catatan, dan alasan koreksi.' using errcode = '22023';
  end if;

  select note.* into v_current
  from public.session_notes as note
  where note.id = p_note_id and note.owner_id = v_owner_id
  for update;
  if v_current.id is null or v_current.version <> p_expected_version then
    raise exception 'Catatan berubah atau tidak ditemukan. Muat ulang sebelum mencoba lagi.' using errcode = '40001';
  end if;

  select session.* into v_session
  from public.sessions as session
  where session.id = v_current.session_id and session.owner_id = v_owner_id
  for update;
  if v_session.state <> 'completed' then
    raise exception 'Catatan sesi ini tidak dapat diubah.' using errcode = '23514';
  end if;

  insert into public.learning_topics (owner_id, student_id, name, normalized_name)
  values (
    v_owner_id,
    v_current.student_id,
    pg_catalog.btrim(p_topic_name),
    pg_catalog.lower(pg_catalog.btrim(p_topic_name))
  )
  on conflict (owner_id, student_id, normalized_name)
  do update set archived_at = null
  returning id into v_topic_id;

  insert into public.session_note_revisions (
    owner_id, note_id, topic_name, understanding, note, reason, changed_by
  )
  select
    v_owner_id, v_current.id, topic.name, v_current.understanding, v_current.note,
    pg_catalog.btrim(p_reason), v_owner_id
  from public.learning_topics as topic
  where topic.id = v_current.topic_id and topic.owner_id = v_owner_id;

  update public.session_notes
  set topic_id = v_topic_id,
      understanding = p_understanding,
      note = nullif(pg_catalog.btrim(coalesce(p_note, '')), ''),
      updated_at = now(),
      version = version + 1
  where id = v_current.id and owner_id = v_owner_id
  returning version into v_version;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session_note', v_current.id, 'session_note.updated', v_owner_id,
    pg_catalog.jsonb_build_object('version', v_version, 'reason', pg_catalog.btrim(p_reason))
  );
  return v_version;
end;
$$;

create function public.reopen_session(
  p_session_id uuid,
  p_expected_version integer,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_session public.sessions%rowtype;
  v_invoice_id uuid;
  v_item_id uuid;
  v_total_after bigint;
  v_paid bigint;
  v_version integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_reason is null
    or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Alasan membuka kembali sesi wajib diisi.' using errcode = '22023';
  end if;

  select session.* into v_session
  from public.sessions as session
  where session.id = p_session_id and session.owner_id = v_owner_id
  for update;
  if v_session.id is null then
    raise exception 'Sesi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_session.state <> 'completed' or v_session.version <> p_expected_version then
    raise exception 'Sesi berubah atau belum selesai. Muat ulang sebelum mencoba lagi.' using errcode = '40001';
  end if;

  select invoice.id, item.id
  into v_invoice_id, v_item_id
  from public.invoice_items as item
  join public.invoices as invoice
    on invoice.id = item.invoice_id and invoice.owner_id = item.owner_id
  where item.owner_id = v_owner_id
    and item.session_id = v_session.id
    and item.kind = 'session'
    and item.state = 'active'
  for update of invoice;

  if v_item_id is not null then
    select coalesce(pg_catalog.sum(item.amount_rupiah), 0) - (
      select item_to_void.amount_rupiah
      from public.invoice_items as item_to_void
      where item_to_void.id = v_item_id and item_to_void.owner_id = v_owner_id
    )
    into v_total_after
    from public.invoice_items as item
    where item.owner_id = v_owner_id
      and item.invoice_id = v_invoice_id
      and item.state = 'active';

    select coalesce(pg_catalog.sum(payment.amount_rupiah), 0) into v_paid
    from public.payments as payment
    where payment.owner_id = v_owner_id
      and payment.invoice_id = v_invoice_id
      and payment.state = 'posted';

    if v_total_after < 0 or v_total_after < v_paid then
      raise exception 'Tagihan tidak dapat dikurangi di bawah jumlah yang sudah dicatat sebagai pembayaran.' using errcode = '23514';
    end if;

    update public.invoice_items
    set state = 'void', voided_at = now()
    where id = v_item_id and owner_id = v_owner_id;

    update public.invoices
    set updated_at = now(), version = version + 1
    where id = v_invoice_id and owner_id = v_owner_id;
  end if;

  update public.sessions
  set state = 'scheduled',
      completed_at = null,
      updated_at = now(),
      version = version + 1
  where id = v_session.id and owner_id = v_owner_id
  returning version into v_version;

  insert into public.session_note_revisions (
    owner_id, note_id, topic_name, understanding, note, reason, changed_by
  )
  select
    v_owner_id, note.id, topic.name, note.understanding, note.note,
    pg_catalog.btrim(p_reason), v_owner_id
  from public.session_notes as note
  join public.learning_topics as topic
    on topic.id = note.topic_id and topic.owner_id = note.owner_id
  where note.owner_id = v_owner_id and note.session_id = v_session.id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session', v_session.id, 'session.reopened', v_owner_id,
    pg_catalog.jsonb_build_object('version', v_version, 'reason', pg_catalog.btrim(p_reason))
  );
  return v_version;
end;
$$;

create function public.record_payment(
  p_invoice_id uuid,
  p_amount_rupiah bigint,
  p_received_on date,
  p_method public.payment_method,
  p_request_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_invoice public.invoices%rowtype;
  v_total bigint;
  v_paid bigint;
  v_payment_id uuid;
  v_hash text;
  v_old_hash text;
  v_response jsonb;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_amount_rupiah is null or p_amount_rupiah not between 1 and 100000000
    or p_received_on is null or p_request_key is null or p_method is null then
    raise exception 'Periksa nominal, tanggal, dan metode pembayaran.' using errcode = '22023';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile where profile.id = v_owner_id;
  v_today := (now() at time zone v_timezone)::date;
  if p_received_on > v_today then
    raise exception 'Tanggal pembayaran tidak boleh di masa depan.' using errcode = '22023';
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.jsonb_build_object(
        'invoice_id', p_invoice_id,
        'amount_rupiah', p_amount_rupiah,
        'received_on', p_received_on,
        'method', p_method
      )::text,
      'sha256'
    ),
    'hex'
  );
  insert into public.mutation_requests (owner_id, operation, request_key, payload_hash)
  values (v_owner_id, 'record_payment', p_request_key, v_hash)
  on conflict (owner_id, operation, request_key) do nothing;

  select request.payload_hash, request.response
  into v_old_hash, v_response
  from public.mutation_requests as request
  where request.owner_id = v_owner_id
    and request.operation = 'record_payment'
    and request.request_key = p_request_key
  for update;
  if v_old_hash <> v_hash then
    raise exception 'Request key sudah digunakan dengan data berbeda.' using errcode = '22023';
  end if;
  if v_response is not null then
    return (v_response ->> 'payment_id')::uuid;
  end if;

  select invoice.* into v_invoice
  from public.invoices as invoice
  where invoice.id = p_invoice_id
    and invoice.owner_id = v_owner_id
    and invoice.lifecycle = 'active'
  for update;
  if v_invoice.id is null then
    raise exception 'Tagihan tidak ditemukan atau sudah dibatalkan.' using errcode = 'P0002';
  end if;

  select coalesce(pg_catalog.sum(item.amount_rupiah), 0) into v_total
  from public.invoice_items as item
  where item.owner_id = v_owner_id
    and item.invoice_id = v_invoice.id
    and item.state = 'active';

  select coalesce(pg_catalog.sum(payment.amount_rupiah), 0) into v_paid
  from public.payments as payment
  where payment.owner_id = v_owner_id
    and payment.invoice_id = v_invoice.id
    and payment.state = 'posted';

  if p_amount_rupiah > v_total - v_paid then
    raise exception 'Nominal melebihi sisa tagihan.' using errcode = '23514';
  end if;

  insert into public.payments (
    owner_id, invoice_id, amount_rupiah, received_on, method
  ) values (
    v_owner_id, v_invoice.id, p_amount_rupiah, p_received_on, p_method
  ) returning id into v_payment_id;

  update public.invoices
  set updated_at = now(), version = version + 1
  where id = v_invoice.id and owner_id = v_owner_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'payment', v_payment_id, 'payment.recorded', v_owner_id,
    pg_catalog.jsonb_build_object('invoice_id', v_invoice.id, 'amount_rupiah', p_amount_rupiah)
  );

  update public.mutation_requests
  set response = pg_catalog.jsonb_build_object('payment_id', v_payment_id),
      completed_at = now()
  where owner_id = v_owner_id
    and operation = 'record_payment'
    and request_key = p_request_key;

  return v_payment_id;
end;
$$;

create function public.void_payment(
  p_payment_id uuid,
  p_reason text,
  p_request_key uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_invoice_id uuid;
  v_hash text;
  v_old_hash text;
  v_response jsonb;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_request_key is null
    or p_reason is null
    or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Alasan pembatalan pembayaran wajib diisi.' using errcode = '22023';
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.jsonb_build_object(
        'payment_id', p_payment_id,
        'reason', pg_catalog.btrim(p_reason)
      )::text,
      'sha256'
    ),
    'hex'
  );
  insert into public.mutation_requests (owner_id, operation, request_key, payload_hash)
  values (v_owner_id, 'void_payment', p_request_key, v_hash)
  on conflict (owner_id, operation, request_key) do nothing;

  select request.payload_hash, request.response
  into v_old_hash, v_response
  from public.mutation_requests as request
  where request.owner_id = v_owner_id
    and request.operation = 'void_payment'
    and request.request_key = p_request_key
  for update;
  if v_old_hash <> v_hash then
    raise exception 'Request key sudah digunakan dengan data berbeda.' using errcode = '22023';
  end if;
  if v_response is not null then
    return true;
  end if;

  select invoice.id into v_invoice_id
  from public.invoices as invoice
  join public.payments as payment
    on payment.invoice_id = invoice.id and payment.owner_id = invoice.owner_id
  where payment.id = p_payment_id
    and payment.owner_id = v_owner_id
  for update of invoice;
  if v_invoice_id is null then
    raise exception 'Pembayaran tidak ditemukan.' using errcode = 'P0002';
  end if;

  select payment.* into v_payment
  from public.payments as payment
  where payment.id = p_payment_id and payment.owner_id = v_owner_id
  for update;
  if v_payment.state <> 'posted' then
    raise exception 'Pembayaran sudah dibatalkan.' using errcode = '23514';
  end if;

  update public.payments
  set state = 'void',
      void_reason = pg_catalog.btrim(p_reason),
      voided_at = now()
  where id = v_payment.id and owner_id = v_owner_id;
  update public.invoices
  set updated_at = now(), version = version + 1
  where id = v_invoice_id and owner_id = v_owner_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'payment', v_payment.id, 'payment.voided', v_owner_id,
    pg_catalog.jsonb_build_object(
      'invoice_id', v_invoice_id,
      'amount_rupiah', v_payment.amount_rupiah,
      'reason', pg_catalog.btrim(p_reason)
    )
  );

  update public.mutation_requests
  set response = pg_catalog.jsonb_build_object('voided', true),
      completed_at = now()
  where owner_id = v_owner_id
    and operation = 'void_payment'
    and request_key = p_request_key;

  return true;
end;
$$;

create function public.add_invoice_adjustment(
  p_invoice_id uuid,
  p_kind public.invoice_item_kind,
  p_amount_signed bigint,
  p_description text,
  p_reason text,
  p_request_key uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_invoice public.invoices%rowtype;
  v_total bigint;
  v_paid bigint;
  v_item_id uuid;
  v_hash text;
  v_old_hash text;
  v_response jsonb;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_request_key is null
    or p_description is null
    or p_reason is null
    or p_kind not in ('adjustment', 'opening_balance')
    or p_amount_signed is null
    or p_amount_signed not between -100000000 and 100000000
    or p_amount_signed = 0
    or (p_kind = 'opening_balance' and p_amount_signed < 1)
    or pg_catalog.char_length(pg_catalog.btrim(p_description)) not between 1 and 120
    or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Periksa jenis, nominal, keterangan, dan alasan penyesuaian.' using errcode = '22023';
  end if;

  v_hash := pg_catalog.encode(
    extensions.digest(
      pg_catalog.jsonb_build_object(
        'invoice_id', p_invoice_id,
        'kind', p_kind,
        'amount', p_amount_signed,
        'description', pg_catalog.btrim(p_description),
        'reason', pg_catalog.btrim(p_reason)
      )::text,
      'sha256'
    ),
    'hex'
  );
  insert into public.mutation_requests (owner_id, operation, request_key, payload_hash)
  values (v_owner_id, 'add_invoice_adjustment', p_request_key, v_hash)
  on conflict (owner_id, operation, request_key) do nothing;

  select request.payload_hash, request.response
  into v_old_hash, v_response
  from public.mutation_requests as request
  where request.owner_id = v_owner_id
    and request.operation = 'add_invoice_adjustment'
    and request.request_key = p_request_key
  for update;
  if v_old_hash <> v_hash then
    raise exception 'Request key sudah digunakan dengan data berbeda.' using errcode = '22023';
  end if;
  if v_response is not null then
    return (v_response ->> 'item_id')::uuid;
  end if;

  select invoice.* into v_invoice
  from public.invoices as invoice
  where invoice.id = p_invoice_id
    and invoice.owner_id = v_owner_id
    and invoice.lifecycle = 'active'
  for update;
  if v_invoice.id is null then
    raise exception 'Tagihan tidak ditemukan atau sudah dibatalkan.' using errcode = 'P0002';
  end if;

  if p_kind = 'opening_balance' and exists (
    select 1 from public.invoice_items as item
    where item.owner_id = v_owner_id
      and item.invoice_id = v_invoice.id
      and item.kind = 'opening_balance'
      and item.state = 'active'
  ) then
    raise exception 'Saldo awal untuk tagihan ini sudah dicatat.' using errcode = '23505';
  end if;

  select coalesce(pg_catalog.sum(item.amount_rupiah), 0) into v_total
  from public.invoice_items as item
  where item.owner_id = v_owner_id
    and item.invoice_id = v_invoice.id
    and item.state = 'active';
  select coalesce(pg_catalog.sum(payment.amount_rupiah), 0) into v_paid
  from public.payments as payment
  where payment.owner_id = v_owner_id
    and payment.invoice_id = v_invoice.id
    and payment.state = 'posted';

  if v_total + p_amount_signed < 0 or v_total + p_amount_signed < v_paid then
    raise exception 'Penyesuaian tidak boleh membuat total di bawah pembayaran yang tercatat.' using errcode = '23514';
  end if;

  insert into public.invoice_items (
    owner_id, invoice_id, student_id, kind, amount_rupiah, description, reason
  ) values (
    v_owner_id, v_invoice.id, v_invoice.student_id, p_kind, p_amount_signed,
    pg_catalog.btrim(p_description), pg_catalog.btrim(p_reason)
  ) returning id into v_item_id;

  update public.invoices
  set updated_at = now(), version = version + 1
  where id = v_invoice.id and owner_id = v_owner_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'invoice', v_invoice.id, 'invoice.adjusted', v_owner_id,
    pg_catalog.jsonb_build_object(
      'item_id', v_item_id,
      'amount_rupiah', p_amount_signed,
      'kind', p_kind,
      'reason', pg_catalog.btrim(p_reason)
    )
  );

  update public.mutation_requests
  set response = pg_catalog.jsonb_build_object('item_id', v_item_id),
      completed_at = now()
  where owner_id = v_owner_id
    and operation = 'add_invoice_adjustment'
    and request_key = p_request_key;

  return v_item_id;
end;
$$;

revoke all on function public.ensure_invoice_for_student(uuid, uuid, date) from public, anon, authenticated;
revoke all on function public.ensure_invoices(date, date) from public, anon, authenticated;
revoke all on function public.complete_session(uuid, integer, uuid, text, public.learning_understanding, text) from public, anon, authenticated;
revoke all on function public.update_session_note(uuid, integer, text, public.learning_understanding, text, text) from public, anon, authenticated;
revoke all on function public.reopen_session(uuid, integer, text) from public, anon, authenticated;
revoke all on function public.record_payment(uuid, bigint, date, public.payment_method, uuid) from public, anon, authenticated;
revoke all on function public.void_payment(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.add_invoice_adjustment(uuid, public.invoice_item_kind, bigint, text, text, uuid) from public, anon, authenticated;

grant execute on function public.ensure_invoices(date, date) to authenticated;
grant execute on function public.complete_session(uuid, integer, uuid, text, public.learning_understanding, text) to authenticated;
grant execute on function public.update_session_note(uuid, integer, text, public.learning_understanding, text, text) to authenticated;
grant execute on function public.reopen_session(uuid, integer, text) to authenticated;
grant execute on function public.record_payment(uuid, bigint, date, public.payment_method, uuid) to authenticated;
grant execute on function public.void_payment(uuid, text, uuid) to authenticated;
grant execute on function public.add_invoice_adjustment(uuid, public.invoice_item_kind, bigint, text, text, uuid) to authenticated;
