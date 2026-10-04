create extension if not exists btree_gist with schema extensions;

create type public.session_state as enum (
  'scheduled',
  'completed',
  'student_absent',
  'teacher_cancelled'
);

create type public.learning_understanding as enum (
  'independent',
  'assisted',
  'repeat'
);

alter table public.audit_events
  drop constraint audit_events_entity_type_check;

alter table public.audit_events
  add constraint audit_events_entity_type_check
  check (
    entity_type in (
      'teacher_profile',
      'student',
      'schedule_rule',
      'session',
      'session_note',
      'invoice',
      'payment'
    )
  );

create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  weekday smallint not null check (weekday between 1 and 7),
  local_start time without time zone not null,
  duration_minutes smallint not null check (duration_minutes between 15 and 240),
  effective_from date not null,
  effective_until date,
  timezone text not null check (
    timezone in ('Asia/Jakarta', 'Asia/Pontianak', 'Asia/Makassar', 'Asia/Jayapura')
  ),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (owner_id, id),
  check (effective_until is null or effective_until >= effective_from),
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  schedule_rule_id uuid,
  occurrence_date date,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  state public.session_state not null default 'scheduled',
  manually_rescheduled boolean not null default false,
  replacement_for uuid,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (owner_id, id),
  unique (owner_id, schedule_rule_id, occurrence_date),
  check (ends_at > starts_at),
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade,
  foreign key (owner_id, schedule_rule_id)
    references public.schedule_rules (owner_id, id),
  foreign key (owner_id, replacement_for)
    references public.sessions (owner_id, id)
);

alter table public.sessions
  add constraint sessions_no_owner_overlap
  exclude using gist (
    owner_id extensions.gist_uuid_ops with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
  where (state in ('scheduled', 'completed'));

create table public.learning_topics (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  normalized_name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, student_id, id),
  unique (owner_id, student_id, normalized_name),
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade
);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  session_id uuid not null,
  topic_id uuid not null,
  understanding public.learning_understanding not null,
  note text check (note is null or char_length(btrim(note)) <= 300),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, id),
  unique (owner_id, session_id),
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade,
  foreign key (owner_id, session_id)
    references public.sessions (owner_id, id) on delete cascade,
  foreign key (owner_id, student_id, topic_id)
    references public.learning_topics (owner_id, student_id, id)
);

create table public.session_note_revisions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  note_id uuid not null,
  topic_name text not null,
  understanding public.learning_understanding not null,
  note text,
  reason text,
  changed_by uuid not null references public.teacher_profiles (id),
  changed_at timestamptz not null default now(),
  foreign key (owner_id, note_id)
    references public.session_notes (owner_id, id) on delete cascade
);

create index schedule_rules_owner_student_active_idx
  on public.schedule_rules (owner_id, student_id, weekday)
  where active;
create index sessions_owner_start_idx
  on public.sessions (owner_id, starts_at);
create index sessions_owner_student_history_idx
  on public.sessions (owner_id, student_id, starts_at desc);
create index sessions_owner_rule_date_idx
  on public.sessions (owner_id, schedule_rule_id, occurrence_date);
create index learning_topics_owner_student_idx
  on public.learning_topics (owner_id, student_id, name);
create index session_notes_owner_student_idx
  on public.session_notes (owner_id, student_id, updated_at desc);
create index session_note_revisions_owner_note_idx
  on public.session_note_revisions (owner_id, note_id, changed_at desc);

alter table public.schedule_rules enable row level security;
alter table public.sessions enable row level security;
alter table public.learning_topics enable row level security;
alter table public.session_notes enable row level security;
alter table public.session_note_revisions enable row level security;

create policy schedule_rules_read_own on public.schedule_rules
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy sessions_read_own on public.sessions
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy learning_topics_read_own on public.learning_topics
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy session_notes_read_own on public.session_notes
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy session_note_revisions_read_own on public.session_note_revisions
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.schedule_rules, public.sessions, public.learning_topics,
  public.session_notes, public.session_note_revisions
  from public, anon, authenticated;
grant select on public.schedule_rules, public.sessions, public.learning_topics,
  public.session_notes, public.session_note_revisions to authenticated;

create function public.ensure_schedule_window(p_from date, p_to date)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_today date;
  v_inserted integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile
  where profile.id = v_owner_id;

  if v_timezone is null then
    raise exception 'Profil guru tidak ditemukan.' using errcode = 'P0002';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  if p_from is null or p_to is null
    or p_from < v_today
    or p_to < p_from
    or p_to > p_from + 60 then
    raise exception 'Rentang agenda harus dimulai hari ini dan maksimal 60 hari.' using errcode = '22023';
  end if;

  insert into public.sessions (
    owner_id, student_id, schedule_rule_id, occurrence_date, starts_at, ends_at
  )
  select
    v_owner_id,
    student.id,
    rule.id,
    dates.occurrence_date::date,
    (dates.occurrence_date::date + rule.local_start) at time zone rule.timezone,
    (
      dates.occurrence_date::date
      + rule.local_start
      + pg_catalog.make_interval(mins => rule.duration_minutes)
    ) at time zone rule.timezone
  from public.schedule_rules as rule
  join public.students as student
    on student.id = rule.student_id
    and student.owner_id = rule.owner_id
  cross join pg_catalog.generate_series(p_from, p_to, interval '1 day')
    as dates(occurrence_date)
  where rule.owner_id = v_owner_id
    and rule.active
    and rule.effective_from <= dates.occurrence_date::date
    and (rule.effective_until is null or rule.effective_until >= dates.occurrence_date::date)
    and extract(isodow from dates.occurrence_date)::smallint = rule.weekday
    and student.archived_at is null
    and student.starts_on <= dates.occurrence_date::date
    and (student.ends_on is null or student.ends_on >= dates.occurrence_date::date)
  on conflict (owner_id, schedule_rule_id, occurrence_date) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end;
$$;

create function public.create_schedule_rule(
  p_student_id uuid,
  p_weekday integer,
  p_local_start time without time zone,
  p_duration_minutes integer,
  p_effective_from date,
  p_effective_until date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_student_start date;
  v_rule_id uuid;
  v_today date;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile
  where profile.id = v_owner_id;

  select student.starts_on into v_student_start
  from public.students as student
  where student.id = p_student_id
    and student.owner_id = v_owner_id
    and student.archived_at is null;

  if v_student_start is null then
    raise exception 'Murid tidak ditemukan.' using errcode = 'P0002';
  end if;
  if p_weekday is null
    or p_duration_minutes is null
    or p_weekday not between 1 and 7
    or p_duration_minutes not between 15 and 240
    or p_local_start is null
    or p_effective_from is null
    or p_effective_from < v_student_start
    or (p_effective_until is not null and p_effective_until < p_effective_from) then
    raise exception 'Periksa kembali hari, jam, durasi, dan tanggal efektif.' using errcode = '22023';
  end if;

  insert into public.schedule_rules (
    owner_id, student_id, weekday, local_start, duration_minutes,
    effective_from, effective_until, timezone
  ) values (
    v_owner_id, p_student_id, p_weekday::smallint, p_local_start,
    p_duration_minutes::smallint, p_effective_from, p_effective_until, v_timezone
  ) returning id into v_rule_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'schedule_rule', v_rule_id, 'schedule_rule.created', v_owner_id,
    pg_catalog.jsonb_build_object(
      'weekday', p_weekday,
      'duration_minutes', p_duration_minutes,
      'effective_from', p_effective_from
    )
  );

  v_today := (now() at time zone v_timezone)::date;
  perform public.ensure_schedule_window(v_today, v_today + 60);
  return v_rule_id;
end;
$$;

create function public.end_schedule_rule(p_rule_id uuid, p_effective_until date)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_rule public.schedule_rules%rowtype;
  v_today date;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;

  select rule.* into v_rule
  from public.schedule_rules as rule
  where rule.id = p_rule_id and rule.owner_id = v_owner_id and rule.active
  for update;

  if v_rule.id is null then
    raise exception 'Jadwal rutin tidak ditemukan.' using errcode = 'P0002';
  end if;

  v_today := (now() at time zone v_rule.timezone)::date;
  if p_effective_until is null
    or p_effective_until < v_today
    or p_effective_until < v_rule.effective_from then
    raise exception 'Tanggal akhir harus hari ini atau setelahnya.' using errcode = '22023';
  end if;

  update public.schedule_rules
  set effective_until = least(coalesce(effective_until, p_effective_until), p_effective_until),
      active = p_effective_until > v_today
  where id = v_rule.id and owner_id = v_owner_id;

  with cancelled as (
    update public.sessions
    set state = 'teacher_cancelled',
        updated_at = now(),
        version = version + 1
    where owner_id = v_owner_id
      and schedule_rule_id = v_rule.id
      and state = 'scheduled'
      and not manually_rescheduled
      and occurrence_date > p_effective_until
    returning id
  )
  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  select v_owner_id, 'session', cancelled.id, 'session.teacher_cancelled', v_owner_id,
         pg_catalog.jsonb_build_object('reason', 'Jadwal rutin diakhiri')
  from cancelled;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'schedule_rule', v_rule.id, 'schedule_rule.ended', v_owner_id,
    pg_catalog.jsonb_build_object('effective_until', p_effective_until)
  );
  return true;
end;
$$;

create function public.create_adhoc_session(
  p_student_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_starts_local date;
  v_student public.students%rowtype;
  v_session_id uuid;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_starts_at is null or p_ends_at is null
    or p_ends_at <= p_starts_at
    or p_ends_at - p_starts_at not between interval '15 minutes' and interval '4 hours' then
    raise exception 'Durasi sesi harus 15 menit sampai 4 jam.' using errcode = '22023';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile where profile.id = v_owner_id;

  select student.* into v_student
  from public.students as student
  where student.id = p_student_id
    and student.owner_id = v_owner_id
    and student.archived_at is null;

  if v_student.id is null then
    raise exception 'Murid tidak ditemukan.' using errcode = 'P0002';
  end if;

  v_starts_local := (p_starts_at at time zone v_timezone)::date;
  if v_starts_local < v_student.starts_on
    or (v_student.ends_on is not null and v_starts_local > v_student.ends_on) then
    raise exception 'Tanggal sesi berada di luar masa belajar murid.' using errcode = '22023';
  end if;

  insert into public.sessions (
    owner_id, student_id, occurrence_date, starts_at, ends_at
  ) values (
    v_owner_id, p_student_id, v_starts_local, p_starts_at, p_ends_at
  ) returning id into v_session_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session', v_session_id, 'session.created', v_owner_id,
    pg_catalog.jsonb_build_object('starts_at', p_starts_at, 'ends_at', p_ends_at)
  );
  return v_session_id;
end;
$$;

create function public.reschedule_session(
  p_session_id uuid,
  p_expected_version integer,
  p_starts_at timestamptz,
  p_ends_at timestamptz
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_old public.sessions%rowtype;
  v_new_local_date date;
  v_student public.students%rowtype;
  v_version integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_starts_at is null or p_ends_at is null
    or p_ends_at <= p_starts_at
    or p_ends_at - p_starts_at not between interval '15 minutes' and interval '4 hours' then
    raise exception 'Durasi sesi harus 15 menit sampai 4 jam.' using errcode = '22023';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile where profile.id = v_owner_id;

  select session.* into v_old
  from public.sessions as session
  where session.id = p_session_id and session.owner_id = v_owner_id
  for update;
  if v_old.id is null then
    raise exception 'Sesi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_old.state <> 'scheduled' or v_old.version <> p_expected_version then
    raise exception 'Sesi berubah atau sudah diproses. Muat ulang sebelum mencoba lagi.' using errcode = '40001';
  end if;

  select student.* into v_student
  from public.students as student
  where student.id = v_old.student_id and student.owner_id = v_owner_id;
  v_new_local_date := (p_starts_at at time zone v_timezone)::date;
  if v_new_local_date < v_student.starts_on
    or (v_student.ends_on is not null and v_new_local_date > v_student.ends_on) then
    raise exception 'Tanggal baru berada di luar masa belajar murid.' using errcode = '22023';
  end if;

  update public.sessions
  set starts_at = p_starts_at,
      ends_at = p_ends_at,
      manually_rescheduled = true,
      updated_at = now(),
      version = version + 1
  where id = v_old.id and owner_id = v_owner_id
  returning version into v_version;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session', v_old.id, 'session.rescheduled', v_owner_id,
    pg_catalog.jsonb_build_object(
      'old_starts_at', v_old.starts_at,
      'old_ends_at', v_old.ends_at,
      'new_starts_at', p_starts_at,
      'new_ends_at', p_ends_at
    )
  );
  return v_version;
end;
$$;

create function public.set_session_nonbillable(
  p_session_id uuid,
  p_expected_version integer,
  p_state public.session_state,
  p_reason text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_current public.sessions%rowtype;
  v_version integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_state is null
    or p_reason is null
    or p_state not in ('student_absent', 'teacher_cancelled')
    or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Pilih izin atau batal dan isi alasannya.' using errcode = '22023';
  end if;

  select session.* into v_current
  from public.sessions as session
  where session.id = p_session_id and session.owner_id = v_owner_id
  for update;
  if v_current.id is null then
    raise exception 'Sesi tidak ditemukan.' using errcode = 'P0002';
  end if;
  if v_current.state <> 'scheduled' or v_current.version <> p_expected_version then
    raise exception 'Sesi berubah atau sudah diproses. Muat ulang sebelum mencoba lagi.' using errcode = '40001';
  end if;

  update public.sessions
  set state = p_state, updated_at = now(), version = version + 1
  where id = v_current.id and owner_id = v_owner_id
  returning version into v_version;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'session', v_current.id,
    case when p_state = 'student_absent' then 'session.student_absent' else 'session.teacher_cancelled' end,
    v_owner_id,
    pg_catalog.jsonb_build_object('reason', pg_catalog.btrim(p_reason))
  );
  return v_version;
end;
$$;

create or replace function public.archive_student(p_student_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_starts_on date;
  v_end_date date;
  v_today date;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if p_reason is null
    or pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Alasan mengarsipkan murid wajib diisi.' using errcode = '22023';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile where profile.id = v_owner_id;
  select student.starts_on into v_starts_on
  from public.students as student
  where student.id = p_student_id
    and student.owner_id = v_owner_id
    and student.archived_at is null
  for update;
  if v_starts_on is null then
    raise exception 'Murid tidak ditemukan atau sudah diarsipkan.' using errcode = 'P0002';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_end_date := greatest(v_today, v_starts_on);

  update public.students
  set archived_at = now(),
      ends_on = v_end_date,
      updated_at = now(),
      version = version + 1
  where id = p_student_id and owner_id = v_owner_id;

  update public.schedule_rules
  set effective_until = least(coalesce(effective_until, v_end_date), v_end_date),
      active = false
  where owner_id = v_owner_id and student_id = p_student_id;

  with cancelled as (
    update public.sessions
    set state = 'teacher_cancelled',
        updated_at = now(),
        version = version + 1
    where owner_id = v_owner_id
      and student_id = p_student_id
      and state = 'scheduled'
      and (starts_at at time zone v_timezone)::date > v_end_date
    returning id
  )
  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  select v_owner_id, 'session', cancelled.id, 'session.teacher_cancelled', v_owner_id,
         pg_catalog.jsonb_build_object('reason', 'Murid diarsipkan')
  from cancelled;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (
    v_owner_id, 'student', p_student_id, 'student.archived', v_owner_id,
    pg_catalog.jsonb_build_object('reason', pg_catalog.btrim(p_reason))
  );
  return true;
end;
$$;

revoke all on function public.ensure_schedule_window(date, date) from public, anon, authenticated;
revoke all on function public.create_schedule_rule(uuid, integer, time without time zone, integer, date, date) from public, anon, authenticated;
revoke all on function public.end_schedule_rule(uuid, date) from public, anon, authenticated;
revoke all on function public.create_adhoc_session(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.reschedule_session(uuid, integer, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.set_session_nonbillable(uuid, integer, public.session_state, text) from public, anon, authenticated;
revoke all on function public.archive_student(uuid, text) from public, anon, authenticated;

grant execute on function public.ensure_schedule_window(date, date) to authenticated;
grant execute on function public.create_schedule_rule(uuid, integer, time without time zone, integer, date, date) to authenticated;
grant execute on function public.end_schedule_rule(uuid, date) to authenticated;
grant execute on function public.create_adhoc_session(uuid, timestamptz, timestamptz) to authenticated;
grant execute on function public.reschedule_session(uuid, integer, timestamptz, timestamptz) to authenticated;
grant execute on function public.set_session_nonbillable(uuid, integer, public.session_state, text) to authenticated;
grant execute on function public.archive_student(uuid, text) to authenticated;
