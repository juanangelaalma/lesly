-- Domain mutations. Every function runs as security definer with an empty
-- search_path, resolves the caller via auth.uid() and never trusts owner input.
-- Errors are raised as 'CODE: message' so the app can map them to ActionResult.

create function private.fail(p_code text, p_message text) returns void
language plpgsql set search_path = '' as $$
begin
  raise exception using errcode = 'P0001', message = p_code || ': ' || p_message;
end;
$$;

create function private.require_uid() returns uuid
language plpgsql stable set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    perform private.fail('UNAUTHENTICATED', 'Silakan masuk kembali.');
  end if;
  return v_uid;
end;
$$;

create function private.owner_tz(p_owner uuid) returns text
language sql stable set search_path = '' as $$
  select coalesce((select timezone from public.teacher_profiles where id = p_owner), 'Asia/Jakarta');
$$;

create function private.audit(
  p_owner uuid, p_entity_type text, p_entity_id uuid, p_action text,
  p_before jsonb, p_after jsonb, p_reason text default null
) returns void
language sql set search_path = '' as $$
  insert into public.audit_events (owner_id, entity_type, entity_id, action, before_data, after_data, reason)
  values (p_owner, p_entity_type, p_entity_id, p_action, p_before, p_after, p_reason);
$$;

create function private.idem_get(p_owner uuid, p_key uuid, p_operation text) returns jsonb
language plpgsql set search_path = '' as $$
declare
  v_row public.mutation_requests;
begin
  if p_key is null then
    perform private.fail('VALIDATION', 'Kunci permintaan wajib ada.');
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text || p_key::text, 0));
  select * into v_row from public.mutation_requests where owner_id = p_owner and request_key = p_key;
  if not found then
    return null;
  end if;
  if v_row.operation <> p_operation then
    perform private.fail('CONFLICT', 'Kunci permintaan sudah dipakai untuk aksi lain.');
  end if;
  return v_row.result;
end;
$$;

create function private.idem_put(p_owner uuid, p_key uuid, p_operation text, p_result jsonb) returns jsonb
language sql set search_path = '' as $$
  insert into public.mutation_requests (owner_id, request_key, operation, result)
  values (p_owner, p_key, p_operation, p_result);
  select p_result;
$$;

create function private.clean_text(p_value text, p_max integer, p_label text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  v text := nullif(btrim(p_value), '');
begin
  if v is not null and char_length(v) > p_max then
    perform private.fail('VALIDATION', p_label || ' maksimal ' || p_max || ' karakter.');
  end if;
  return v;
end;
$$;

create function private.check_version(p_actual integer, p_expected integer) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_expected is null or p_actual <> p_expected then
    perform private.fail('CONFLICT', 'Data sudah berubah di tempat lain. Muat ulang lalu coba lagi.');
  end if;
end;
$$;

create function private.plan_on(p_student uuid, p_day date) returns public.billing_plans
language sql stable set search_path = '' as $$
  select bp.* from public.billing_plans bp
  where bp.student_id = p_student and bp.effective_from <= p_day
  order by bp.effective_from desc limit 1;
$$;

-- Plan used for a monthly invoice: the plan in force on the 1st, otherwise the
-- first plan that starts within the month (student joined mid-month).
create function private.plan_for_period(p_student uuid, p_period date) returns public.billing_plans
language sql stable set search_path = '' as $$
  select bp.* from public.billing_plans bp
  where bp.student_id = p_student
    and bp.effective_from < (p_period + interval '1 month')::date
  order by (bp.effective_from <= p_period) desc,
           case when bp.effective_from <= p_period then bp.effective_from end desc,
           bp.effective_from asc
  limit 1;
$$;

create function private.ensure_invoice(p_owner uuid, p_student uuid, p_period date) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.invoices (owner_id, student_id, period)
  values (p_owner, p_student, p_period)
  on conflict (student_id, period) do nothing;
  select id into v_id from public.invoices
  where student_id = p_student and period = p_period and owner_id = p_owner
  for update;
  return v_id;
end;
$$;

create function private.invoice_totals(p_invoice uuid, out total bigint, out paid bigint)
language sql stable set search_path = '' as $$
  select
    coalesce((select sum(amount) from public.invoice_items where invoice_id = p_invoice and voided_at is null), 0)::bigint,
    coalesce((select sum(amount) from public.payments where invoice_id = p_invoice and status = 'posted'), 0)::bigint;
$$;

create function private.lock_invoice(p_owner uuid, p_invoice uuid) returns public.invoices
language plpgsql set search_path = '' as $$
declare
  v_row public.invoices;
begin
  select * into v_row from public.invoices where id = p_invoice and owner_id = p_owner for update;
  if not found then
    perform private.fail('NOT_FOUND', 'Tagihan tidak ditemukan.');
  end if;
  return v_row;
end;
$$;

create function private.upsert_topic(p_owner uuid, p_student uuid, p_name text) returns uuid
language plpgsql set search_path = '' as $$
declare
  v_name text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_id uuid;
begin
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    perform private.fail('VALIDATION', 'Materi wajib diisi, 1 sampai 120 karakter.');
  end if;
  insert into public.learning_topics (owner_id, student_id, name, normalized_name)
  values (p_owner, p_student, v_name, lower(v_name))
  on conflict (student_id, normalized_name) do update set name = excluded.name
  returning id into v_id;
  return v_id;
end;
$$;

create function private.assert_no_overlap(p_owner uuid, p_starts_at timestamptz, p_duration integer, p_exclude uuid)
returns void
language plpgsql stable set search_path = '' as $$
declare
  v_other record;
begin
  select s.starts_at, st.name into v_other
  from public.sessions s join public.students st on st.id = s.student_id
  where s.owner_id = p_owner
    and s.status in ('scheduled', 'completed')
    and (p_exclude is null or s.id <> p_exclude)
    and tstzrange(s.starts_at, s.starts_at + make_interval(mins => s.duration_minutes))
        && tstzrange(p_starts_at, p_starts_at + make_interval(mins => p_duration))
  limit 1;
  if found then
    perform private.fail('SCHEDULE_OVERLAP', 'Bentrok dengan sesi ' || v_other.name || '.');
  end if;
end;
$$;

create function private.materialize_sessions(p_owner uuid, p_from date, p_to date, p_rule uuid)
returns integer
language plpgsql set search_path = '' as $$
declare
  v_tz text := private.owner_tz(p_owner);
  v_count integer;
begin
  insert into public.sessions (owner_id, student_id, rule_id, occurrence_date, starts_at, duration_minutes)
  select r.owner_id, r.student_id, r.id, d::date,
         (d::date + r.start_time) at time zone v_tz, r.duration_minutes
  from public.schedule_rules r
  join public.students st on st.id = r.student_id and st.status = 'active'
  cross join lateral generate_series(
    greatest(p_from, r.active_from)::timestamp,
    least(p_to, coalesce(r.active_until, p_to))::timestamp,
    interval '1 day'
  ) d
  where r.owner_id = p_owner
    and (p_rule is null or r.id = p_rule)
    and extract(isodow from d)::smallint = r.weekday
  on conflict (rule_id, occurrence_date) do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create function private.today(p_owner uuid) returns date
language sql stable set search_path = '' as $$
  select (now() at time zone private.owner_tz(p_owner))::date;
$$;

create function private.validate_plan(p_mode public.billing_mode, p_amount bigint) returns void
language plpgsql immutable set search_path = '' as $$
begin
  if p_mode is null then
    perform private.fail('VALIDATION', 'Pilih model pembayaran.');
  end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100000000 then
    perform private.fail('VALIDATION', 'Tarif harus lebih dari Rp0.');
  end if;
end;
$$;

-- Profile -------------------------------------------------------------------

create function public.update_teacher_profile(
  p_display_name text, p_phone text, p_timezone text, p_report_signature text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_name text := private.clean_text(p_display_name, 80, 'Nama');
  v_before public.teacher_profiles;
  v_after public.teacher_profiles;
begin
  if v_name is null then
    perform private.fail('VALIDATION', 'Nama wajib diisi.');
  end if;
  select * into v_before from public.teacher_profiles where id = v_uid for update;
  if not found then
    insert into public.teacher_profiles (id) values (v_uid) returning * into v_before;
  end if;
  update public.teacher_profiles set
    display_name = v_name,
    phone = nullif(btrim(p_phone), ''),
    timezone = coalesce(nullif(p_timezone, ''), 'Asia/Jakarta'),
    report_signature = private.clean_text(p_report_signature, 120, 'Tanda tangan laporan'),
    onboarded_at = coalesce(onboarded_at, now()),
    version = version + 1,
    updated_at = now()
  where id = v_uid
  returning * into v_after;
  perform private.audit(v_uid, 'teacher_profile', v_uid, 'update', to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('version', v_after.version);
end;
$$;

-- Students ------------------------------------------------------------------

create function public.create_student(
  p_request_key uuid, p_name text, p_grade text, p_subject text, p_address text,
  p_guardian_name text, p_guardian_phone text, p_notes text,
  p_billing_mode public.billing_mode, p_amount bigint, p_effective_from date
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_cached jsonb := private.idem_get(v_uid, p_request_key, 'create_student');
  v_student public.students;
begin
  if v_cached is not null then return v_cached; end if;
  if private.clean_text(p_name, 80, 'Nama murid') is null then
    perform private.fail('VALIDATION', 'Nama murid wajib diisi.');
  end if;
  perform private.validate_plan(p_billing_mode, p_amount);

  insert into public.students (owner_id, name, grade, subject, address, guardian_name, guardian_phone, notes)
  values (
    v_uid, btrim(p_name),
    private.clean_text(p_grade, 40, 'Kelas'),
    private.clean_text(p_subject, 80, 'Mata pelajaran'),
    private.clean_text(p_address, 200, 'Alamat'),
    private.clean_text(p_guardian_name, 80, 'Nama wali'),
    nullif(btrim(p_guardian_phone), ''),
    private.clean_text(p_notes, 500, 'Catatan')
  ) returning * into v_student;

  insert into public.billing_plans (owner_id, student_id, mode, amount, effective_from)
  values (v_uid, v_student.id, p_billing_mode, p_amount,
          coalesce(p_effective_from, date_trunc('month', private.today(v_uid))::date));

  perform private.audit(v_uid, 'student', v_student.id, 'create', null, to_jsonb(v_student));
  return private.idem_put(v_uid, p_request_key, 'create_student', jsonb_build_object('studentId', v_student.id));
end;
$$;

create function public.update_student(
  p_student_id uuid, p_expected_version integer, p_name text, p_grade text, p_subject text,
  p_address text, p_guardian_name text, p_guardian_phone text, p_notes text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.students;
  v_after public.students;
begin
  select * into v_before from public.students where id = p_student_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Murid tidak ditemukan.'); end if;
  perform private.check_version(v_before.version, p_expected_version);
  if private.clean_text(p_name, 80, 'Nama murid') is null then
    perform private.fail('VALIDATION', 'Nama murid wajib diisi.');
  end if;
  update public.students set
    name = btrim(p_name),
    grade = private.clean_text(p_grade, 40, 'Kelas'),
    subject = private.clean_text(p_subject, 80, 'Mata pelajaran'),
    address = private.clean_text(p_address, 200, 'Alamat'),
    guardian_name = private.clean_text(p_guardian_name, 80, 'Nama wali'),
    guardian_phone = nullif(btrim(p_guardian_phone), ''),
    notes = private.clean_text(p_notes, 500, 'Catatan'),
    version = version + 1,
    updated_at = now()
  where id = p_student_id
  returning * into v_after;
  perform private.audit(v_uid, 'student', p_student_id, 'update', to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('version', v_after.version);
end;
$$;

create function public.set_student_status(
  p_student_id uuid, p_expected_version integer, p_status public.student_status
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.students;
  v_after public.students;
  v_today date := private.today(v_uid);
begin
  select * into v_before from public.students where id = p_student_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Murid tidak ditemukan.'); end if;
  perform private.check_version(v_before.version, p_expected_version);
  if v_before.status = p_status then
    return jsonb_build_object('version', v_before.version);
  end if;

  update public.students set
    status = p_status,
    archived_at = case when p_status = 'archived' then now() end,
    version = version + 1,
    updated_at = now()
  where id = p_student_id
  returning * into v_after;

  if p_status = 'archived' then
    update public.schedule_rules set active_until = greatest(active_from - 1, v_today)
    where student_id = p_student_id and (active_until is null or active_until > v_today);
    delete from public.sessions
    where student_id = p_student_id and status = 'scheduled' and starts_at > now();
  end if;

  perform private.audit(v_uid, 'student', p_student_id, p_status::text, to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('version', v_after.version);
end;
$$;

create function public.set_billing_plan(
  p_student_id uuid, p_mode public.billing_mode, p_amount bigint, p_effective_from date
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.billing_plans;
  v_after public.billing_plans;
begin
  perform 1 from public.students where id = p_student_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Murid tidak ditemukan.'); end if;
  perform private.validate_plan(p_mode, p_amount);
  if p_effective_from is null then
    perform private.fail('VALIDATION', 'Tanggal mulai berlaku wajib diisi.');
  end if;
  select * into v_before from public.billing_plans where student_id = p_student_id and effective_from = p_effective_from;
  insert into public.billing_plans (owner_id, student_id, mode, amount, effective_from)
  values (v_uid, p_student_id, p_mode, p_amount, p_effective_from)
  on conflict (student_id, effective_from) do update set mode = excluded.mode, amount = excluded.amount
  returning * into v_after;
  perform private.audit(v_uid, 'billing_plan', v_after.id, case when v_before.id is null then 'create' else 'update' end,
                        to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('planId', v_after.id);
end;
$$;

-- Schedules -----------------------------------------------------------------

create function public.add_schedule_rule(
  p_student_id uuid, p_weekday smallint, p_start_time time, p_duration_minutes integer, p_active_from date
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_rule public.schedule_rules;
  v_from date;
  v_created integer;
begin
  perform 1 from public.students where id = p_student_id and owner_id = v_uid and status = 'active';
  if not found then perform private.fail('NOT_FOUND', 'Murid aktif tidak ditemukan.'); end if;
  if p_weekday is null or p_weekday not between 1 and 7 then
    perform private.fail('VALIDATION', 'Pilih hari.');
  end if;
  if p_start_time is null then perform private.fail('VALIDATION', 'Jam mulai wajib diisi.'); end if;
  if p_duration_minutes is null or p_duration_minutes not between 15 and 480 then
    perform private.fail('VALIDATION', 'Durasi 15 sampai 480 menit.');
  end if;
  v_from := coalesce(p_active_from, private.today(v_uid));
  insert into public.schedule_rules (owner_id, student_id, weekday, start_time, duration_minutes, active_from)
  values (v_uid, p_student_id, p_weekday, p_start_time, p_duration_minutes, v_from)
  returning * into v_rule;
  v_created := private.materialize_sessions(v_uid, greatest(v_from, private.today(v_uid)), private.today(v_uid) + 56, v_rule.id);
  perform private.audit(v_uid, 'schedule_rule', v_rule.id, 'create', null, to_jsonb(v_rule));
  return jsonb_build_object('ruleId', v_rule.id, 'sessionsCreated', v_created);
end;
$$;

create function public.end_schedule_rule(p_rule_id uuid, p_until date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.schedule_rules;
  v_after public.schedule_rules;
  v_until date;
  v_removed integer;
begin
  select * into v_before from public.schedule_rules where id = p_rule_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Jadwal tidak ditemukan.'); end if;
  v_until := greatest(coalesce(p_until, private.today(v_uid)), v_before.active_from - 1);
  update public.schedule_rules set active_until = v_until where id = p_rule_id returning * into v_after;
  delete from public.sessions
  where rule_id = p_rule_id and status = 'scheduled' and not rescheduled and occurrence_date > v_until;
  get diagnostics v_removed = row_count;
  perform private.audit(v_uid, 'schedule_rule', p_rule_id, 'end', to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('sessionsRemoved', v_removed);
end;
$$;

create function public.ensure_schedule_window(p_from date, p_to date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 92 then
    perform private.fail('VALIDATION', 'Rentang jadwal tidak valid.');
  end if;
  return jsonb_build_object('sessionsCreated', private.materialize_sessions(v_uid, p_from, p_to, null));
end;
$$;

-- Sessions ------------------------------------------------------------------

create function public.create_session(
  p_request_key uuid, p_student_id uuid, p_starts_at timestamptz, p_duration_minutes integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_cached jsonb := private.idem_get(v_uid, p_request_key, 'create_session');
  v_session public.sessions;
begin
  if v_cached is not null then return v_cached; end if;
  perform 1 from public.students where id = p_student_id and owner_id = v_uid and status = 'active';
  if not found then perform private.fail('NOT_FOUND', 'Murid aktif tidak ditemukan.'); end if;
  if p_starts_at is null then perform private.fail('VALIDATION', 'Waktu mulai wajib diisi.'); end if;
  if p_duration_minutes is null or p_duration_minutes not between 15 and 480 then
    perform private.fail('VALIDATION', 'Durasi 15 sampai 480 menit.');
  end if;
  perform private.assert_no_overlap(v_uid, p_starts_at, p_duration_minutes, null);
  insert into public.sessions (owner_id, student_id, starts_at, duration_minutes)
  values (v_uid, p_student_id, p_starts_at, p_duration_minutes)
  returning * into v_session;
  perform private.audit(v_uid, 'session', v_session.id, 'create', null, to_jsonb(v_session));
  return private.idem_put(v_uid, p_request_key, 'create_session', jsonb_build_object('sessionId', v_session.id));
end;
$$;

create function public.reschedule_session(
  p_session_id uuid, p_expected_version integer, p_starts_at timestamptz, p_duration_minutes integer
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.sessions;
  v_after public.sessions;
begin
  select * into v_before from public.sessions where id = p_session_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Sesi tidak ditemukan.'); end if;
  perform private.check_version(v_before.version, p_expected_version);
  if v_before.status <> 'scheduled' then
    perform private.fail('CONFLICT', 'Hanya sesi terjadwal yang bisa dipindah.');
  end if;
  if p_starts_at is null then perform private.fail('VALIDATION', 'Waktu mulai wajib diisi.'); end if;
  if p_duration_minutes is null or p_duration_minutes not between 15 and 480 then
    perform private.fail('VALIDATION', 'Durasi 15 sampai 480 menit.');
  end if;
  perform private.assert_no_overlap(v_uid, p_starts_at, p_duration_minutes, p_session_id);
  update public.sessions set
    starts_at = p_starts_at,
    duration_minutes = p_duration_minutes,
    rescheduled = true,
    version = version + 1,
    updated_at = now()
  where id = p_session_id
  returning * into v_after;
  perform private.audit(v_uid, 'session', p_session_id, 'reschedule', to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('version', v_after.version);
end;
$$;

create function public.set_session_status(
  p_session_id uuid, p_expected_version integer, p_status public.session_status, p_reason text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.sessions;
  v_after public.sessions;
begin
  if p_status not in ('student_absent', 'teacher_cancelled') then
    perform private.fail('VALIDATION', 'Status tidak valid.');
  end if;
  select * into v_before from public.sessions where id = p_session_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Sesi tidak ditemukan.'); end if;
  perform private.check_version(v_before.version, p_expected_version);
  if v_before.status <> 'scheduled' then
    perform private.fail('CONFLICT', 'Sesi ini sudah tidak berstatus terjadwal.');
  end if;
  update public.sessions set
    status = p_status,
    status_reason = private.clean_text(p_reason, 200, 'Alasan'),
    version = version + 1,
    updated_at = now()
  where id = p_session_id
  returning * into v_after;
  perform private.audit(v_uid, 'session', p_session_id, p_status::text, to_jsonb(v_before), to_jsonb(v_after), v_after.status_reason);
  return jsonb_build_object('version', v_after.version);
end;
$$;

create function public.complete_session(
  p_request_key uuid, p_session_id uuid, p_expected_version integer, p_topic_name text,
  p_understanding public.understanding_level, p_note text, p_actual_starts_at timestamptz default null
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_cached jsonb := private.idem_get(v_uid, p_request_key, 'complete_session');
  v_before public.sessions;
  v_after public.sessions;
  v_topic uuid;
  v_note text;
  v_start timestamptz;
  v_day date;
  v_plan public.billing_plans;
  v_invoice uuid;
  v_charge bigint := 0;
begin
  if v_cached is not null then return v_cached; end if;
  select * into v_before from public.sessions where id = p_session_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Sesi tidak ditemukan.'); end if;
  perform private.check_version(v_before.version, p_expected_version);
  if v_before.status <> 'scheduled' then
    perform private.fail('CONFLICT', 'Sesi ini sudah tidak berstatus terjadwal.');
  end if;
  if p_understanding is null then
    perform private.fail('VALIDATION', 'Pilih tingkat pemahaman.');
  end if;
  v_note := private.clean_text(p_note, 300, 'Catatan');
  v_start := coalesce(p_actual_starts_at, v_before.starts_at);
  if v_start > now() then
    perform private.fail('VALIDATION', 'Sesi belum dimulai. Ubah jam ke waktu sebenarnya jika sesi dimajukan.');
  end if;

  v_topic := private.upsert_topic(v_uid, v_before.student_id, p_topic_name);
  delete from public.session_notes where session_id = p_session_id;
  insert into public.session_notes (session_id, owner_id, topic_id, understanding, note)
  values (p_session_id, v_uid, v_topic, p_understanding, v_note);

  update public.sessions set
    status = 'completed',
    starts_at = v_start,
    status_reason = null,
    completed_at = now(),
    version = version + 1,
    updated_at = now()
  where id = p_session_id
  returning * into v_after;

  v_day := (v_start at time zone private.owner_tz(v_uid))::date;
  v_plan := private.plan_on(v_before.student_id, v_day);
  if v_plan.mode = 'per_session' then
    v_invoice := private.ensure_invoice(v_uid, v_before.student_id, date_trunc('month', v_day)::date);
    insert into public.invoice_items (owner_id, invoice_id, kind, session_id, amount, description)
    values (v_uid, v_invoice, 'session', p_session_id, v_plan.amount, 'Sesi ' || to_char(v_day, 'DD/MM/YYYY'));
    v_charge := v_plan.amount;
  end if;

  perform private.audit(v_uid, 'session', p_session_id, 'complete', to_jsonb(v_before), to_jsonb(v_after));
  return private.idem_put(v_uid, p_request_key, 'complete_session', jsonb_build_object(
    'sessionId', p_session_id, 'version', v_after.version, 'chargedAmount', v_charge, 'invoiceId', v_invoice
  ));
end;
$$;

create function public.update_session_note(
  p_session_id uuid, p_expected_version integer, p_topic_name text,
  p_understanding public.understanding_level, p_note text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_session public.sessions;
  v_before public.session_notes;
  v_after public.session_notes;
  v_topic uuid;
begin
  select * into v_session from public.sessions where id = p_session_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Sesi tidak ditemukan.'); end if;
  perform private.check_version(v_session.version, p_expected_version);
  if v_session.status <> 'completed' then
    perform private.fail('CONFLICT', 'Catatan hanya untuk sesi yang selesai.');
  end if;
  if p_understanding is null then perform private.fail('VALIDATION', 'Pilih tingkat pemahaman.'); end if;
  v_topic := private.upsert_topic(v_uid, v_session.student_id, p_topic_name);
  select * into v_before from public.session_notes where session_id = p_session_id;
  update public.session_notes set
    topic_id = v_topic,
    understanding = p_understanding,
    note = private.clean_text(p_note, 300, 'Catatan'),
    updated_at = now()
  where session_id = p_session_id
  returning * into v_after;
  update public.sessions set version = version + 1, updated_at = now() where id = p_session_id;
  perform private.audit(v_uid, 'session_note', p_session_id, 'update', to_jsonb(v_before), to_jsonb(v_after));
  return jsonb_build_object('version', v_session.version + 1);
end;
$$;

create function public.reopen_session(p_session_id uuid, p_expected_version integer, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.sessions;
  v_after public.sessions;
  v_item public.invoice_items;
  v_totals record;
  v_reason text := private.clean_text(p_reason, 200, 'Alasan');
  v_note public.session_notes;
begin
  if v_reason is null or char_length(v_reason) < 3 then
    perform private.fail('VALIDATION', 'Tulis alasan koreksi minimal 3 karakter.');
  end if;
  select * into v_before from public.sessions where id = p_session_id and owner_id = v_uid for update;
  if not found then perform private.fail('NOT_FOUND', 'Sesi tidak ditemukan.'); end if;
  perform private.check_version(v_before.version, p_expected_version);
  if v_before.status = 'scheduled' then
    perform private.fail('CONFLICT', 'Sesi sudah berstatus terjadwal.');
  end if;

  select * into v_item from public.invoice_items where session_id = p_session_id and voided_at is null;
  if v_item.id is not null then
    perform private.lock_invoice(v_uid, v_item.invoice_id);
    v_totals := private.invoice_totals(v_item.invoice_id);
    if v_totals.total - v_item.amount < v_totals.paid then
      perform private.fail('CONFLICT', 'Pembayaran untuk tagihan ini melebihi total baru. Batalkan pencatatan pembayaran dulu.');
    end if;
    update public.invoice_items set voided_at = now(), void_reason = v_reason where id = v_item.id;
  end if;

  select * into v_note from public.session_notes where session_id = p_session_id;
  delete from public.session_notes where session_id = p_session_id;
  update public.sessions set
    status = 'scheduled',
    status_reason = null,
    completed_at = null,
    version = version + 1,
    updated_at = now()
  where id = p_session_id
  returning * into v_after;
  perform private.audit(v_uid, 'session', p_session_id, 'reopen',
    to_jsonb(v_before) || jsonb_build_object('note', to_jsonb(v_note)), to_jsonb(v_after), v_reason);
  return jsonb_build_object('version', v_after.version);
end;
$$;

-- Billing -------------------------------------------------------------------

create function public.ensure_invoices(p_period date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_period date;
  v_student record;
  v_plan public.billing_plans;
  v_invoice uuid;
  v_fees integer := 0;
begin
  if p_period is null then perform private.fail('VALIDATION', 'Periode wajib diisi.'); end if;
  v_period := date_trunc('month', p_period)::date;
  for v_student in
    select id, name from public.students where owner_id = v_uid and status = 'active' order by id
  loop
    v_plan := private.plan_for_period(v_student.id, v_period);
    continue when v_plan.id is null;
    v_invoice := private.ensure_invoice(v_uid, v_student.id, v_period);
    if v_plan.mode = 'monthly'
       and not exists (select 1 from public.invoice_items where invoice_id = v_invoice and kind = 'monthly') then
      insert into public.invoice_items (owner_id, invoice_id, kind, amount, description)
      values (v_uid, v_invoice, 'monthly', v_plan.amount, 'Biaya les bulan ' || to_char(v_period, 'MM/YYYY'));
      v_fees := v_fees + 1;
    end if;
  end loop;
  return jsonb_build_object('monthlyFeesCreated', v_fees);
end;
$$;

create function public.record_payment(
  p_request_key uuid, p_invoice_id uuid, p_amount bigint, p_paid_on date,
  p_method public.payment_method, p_note text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_cached jsonb := private.idem_get(v_uid, p_request_key, 'record_payment');
  v_totals record;
  v_payment public.payments;
begin
  if v_cached is not null then return v_cached; end if;
  perform private.lock_invoice(v_uid, p_invoice_id);
  if p_amount is null or p_amount <= 0 then
    perform private.fail('VALIDATION', 'Nominal pembayaran harus lebih dari Rp0.');
  end if;
  if p_paid_on is null then perform private.fail('VALIDATION', 'Tanggal bayar wajib diisi.'); end if;
  if p_paid_on > private.today(v_uid) then
    perform private.fail('VALIDATION', 'Tanggal bayar tidak boleh di masa depan.');
  end if;
  v_totals := private.invoice_totals(p_invoice_id);
  if p_amount > v_totals.total - v_totals.paid then
    perform private.fail('PAYMENT_EXCEEDS_BALANCE', 'Nominal melebihi sisa tagihan.');
  end if;
  insert into public.payments (owner_id, invoice_id, amount, paid_on, method, note)
  values (v_uid, p_invoice_id, p_amount, p_paid_on, coalesce(p_method, 'cash'), private.clean_text(p_note, 200, 'Catatan'))
  returning * into v_payment;
  perform private.audit(v_uid, 'payment', v_payment.id, 'create', null, to_jsonb(v_payment));
  return private.idem_put(v_uid, p_request_key, 'record_payment', jsonb_build_object(
    'paymentId', v_payment.id, 'balance', v_totals.total - v_totals.paid - p_amount
  ));
end;
$$;

create function public.void_payment(p_payment_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.payments;
  v_after public.payments;
  v_reason text := private.clean_text(p_reason, 200, 'Alasan');
begin
  if v_reason is null or char_length(v_reason) < 3 then
    perform private.fail('VALIDATION', 'Tulis alasan pembatalan minimal 3 karakter.');
  end if;
  select * into v_before from public.payments where id = p_payment_id and owner_id = v_uid;
  if not found then perform private.fail('NOT_FOUND', 'Pembayaran tidak ditemukan.'); end if;
  perform private.lock_invoice(v_uid, v_before.invoice_id);
  select * into v_before from public.payments where id = p_payment_id for update;
  if v_before.status <> 'posted' then
    perform private.fail('CONFLICT', 'Pembayaran ini sudah dibatalkan.');
  end if;
  update public.payments set status = 'void', voided_at = now(), void_reason = v_reason
  where id = p_payment_id returning * into v_after;
  perform private.audit(v_uid, 'payment', p_payment_id, 'void', to_jsonb(v_before), to_jsonb(v_after), v_reason);
  return jsonb_build_object('paymentId', p_payment_id);
end;
$$;

create function public.add_invoice_item(
  p_request_key uuid, p_invoice_id uuid, p_kind public.invoice_item_kind, p_amount bigint, p_description text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_cached jsonb := private.idem_get(v_uid, p_request_key, 'add_invoice_item');
  v_totals record;
  v_item public.invoice_items;
  v_description text := private.clean_text(p_description, 160, 'Keterangan');
begin
  if v_cached is not null then return v_cached; end if;
  perform private.lock_invoice(v_uid, p_invoice_id);
  if p_kind not in ('adjustment', 'opening_balance') then
    perform private.fail('VALIDATION', 'Jenis item tidak valid.');
  end if;
  if p_amount is null or p_amount = 0 or (p_kind = 'opening_balance' and p_amount < 0) then
    perform private.fail('VALIDATION', 'Nominal tidak valid.');
  end if;
  if v_description is null then perform private.fail('VALIDATION', 'Keterangan wajib diisi.'); end if;
  v_totals := private.invoice_totals(p_invoice_id);
  if v_totals.total + p_amount < v_totals.paid then
    perform private.fail('CONFLICT', 'Total tagihan tidak boleh lebih kecil dari pembayaran yang sudah dicatat.');
  end if;
  if v_totals.total + p_amount < 0 then
    perform private.fail('VALIDATION', 'Total tagihan tidak boleh negatif.');
  end if;
  insert into public.invoice_items (owner_id, invoice_id, kind, amount, description)
  values (v_uid, p_invoice_id, p_kind, p_amount, v_description)
  returning * into v_item;
  perform private.audit(v_uid, 'invoice_item', v_item.id, 'create', null, to_jsonb(v_item));
  return private.idem_put(v_uid, p_request_key, 'add_invoice_item', jsonb_build_object('itemId', v_item.id));
end;
$$;

create function public.void_invoice_item(p_item_id uuid, p_reason text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
  v_before public.invoice_items;
  v_after public.invoice_items;
  v_totals record;
  v_reason text := private.clean_text(p_reason, 200, 'Alasan');
begin
  if v_reason is null or char_length(v_reason) < 3 then
    perform private.fail('VALIDATION', 'Tulis alasan minimal 3 karakter.');
  end if;
  select * into v_before from public.invoice_items where id = p_item_id and owner_id = v_uid;
  if not found then perform private.fail('NOT_FOUND', 'Item tagihan tidak ditemukan.'); end if;
  if v_before.kind = 'session' then
    perform private.fail('CONFLICT', 'Biaya sesi dikoreksi dengan membuka ulang sesinya.');
  end if;
  perform private.lock_invoice(v_uid, v_before.invoice_id);
  select * into v_before from public.invoice_items where id = p_item_id for update;
  if v_before.voided_at is not null then
    perform private.fail('CONFLICT', 'Item ini sudah dibatalkan.');
  end if;
  v_totals := private.invoice_totals(v_before.invoice_id);
  if v_totals.total - v_before.amount < v_totals.paid then
    perform private.fail('CONFLICT', 'Total tagihan tidak boleh lebih kecil dari pembayaran yang sudah dicatat.');
  end if;
  if v_totals.total - v_before.amount < 0 then
    perform private.fail('VALIDATION', 'Total tagihan tidak boleh negatif.');
  end if;
  update public.invoice_items set voided_at = now(), void_reason = v_reason
  where id = p_item_id returning * into v_after;
  perform private.audit(v_uid, 'invoice_item', p_item_id, 'void', to_jsonb(v_before), to_jsonb(v_after), v_reason);
  return jsonb_build_object('itemId', p_item_id);
end;
$$;

create function public.log_product_event(p_name text, p_entity_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := private.require_uid();
begin
  insert into public.product_events (owner_id, name, entity_id) values (v_uid, p_name, p_entity_id);
end;
$$;

-- Execution grants: only signed-in users may call public RPCs; private helpers
-- are reachable only from inside the security-definer functions above.
revoke execute on all functions in schema private from public, anon, authenticated;
revoke execute on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
