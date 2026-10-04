create extension if not exists pgcrypto with schema extensions;

create type public.billing_mode as enum ('monthly', 'per_session');

create table public.teacher_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0)
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  grade text check (grade is null or char_length(btrim(grade)) <= 50),
  guardian_name text check (guardian_name is null or char_length(btrim(guardian_name)) <= 80),
  guardian_phone_e164 text check (
    guardian_phone_e164 is null or guardian_phone_e164 ~ '^\+[1-9][0-9]{7,14}$'
  ),
  address_hint text check (address_hint is null or char_length(btrim(address_hint)) <= 120),
  starts_on date not null,
  ends_on date,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1 check (version > 0),
  unique (owner_id, id),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  student_id uuid not null,
  effective_month date not null check (extract(day from effective_month) = 1),
  mode public.billing_mode not null,
  rate_rupiah bigint not null check (rate_rupiah between 1 and 100000000),
  due_day smallint not null default 5 check (due_day between 1 and 28),
  created_at timestamptz not null default now(),
  foreign key (owner_id, student_id)
    references public.students (owner_id, id) on delete cascade,
  unique (owner_id, student_id, effective_month)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('teacher_profile', 'student')),
  entity_id uuid not null,
  action text not null check (char_length(action) between 1 and 80),
  actor_id uuid not null references public.teacher_profiles (id),
  occurred_at timestamptz not null default now(),
  safe_diff jsonb not null default '{}'::jsonb check (jsonb_typeof(safe_diff) = 'object')
);

create table public.mutation_requests (
  owner_id uuid not null references public.teacher_profiles (id) on delete cascade,
  operation text not null check (char_length(operation) between 1 and 80),
  request_key uuid not null,
  payload_hash text not null check (char_length(payload_hash) = 64),
  response jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (owner_id, operation, request_key)
);

create index students_owner_active_name_idx
  on public.students (owner_id, name) where archived_at is null;
create index billing_plans_owner_student_month_idx
  on public.billing_plans (owner_id, student_id, effective_month desc);
create index audit_events_owner_entity_time_idx
  on public.audit_events (owner_id, entity_type, entity_id, occurred_at desc);

alter table public.teacher_profiles enable row level security;
alter table public.students enable row level security;
alter table public.billing_plans enable row level security;
alter table public.audit_events enable row level security;
alter table public.mutation_requests enable row level security;

create policy teacher_profiles_read_own on public.teacher_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy students_read_own on public.students
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy billing_plans_read_own on public.billing_plans
  for select to authenticated using ((select auth.uid()) = owner_id);
create policy audit_events_read_own on public.audit_events
  for select to authenticated using ((select auth.uid()) = owner_id);

revoke all on public.teacher_profiles, public.students, public.billing_plans, public.audit_events
  from anon, authenticated;
revoke all on public.mutation_requests from public, anon, authenticated;
grant select on public.teacher_profiles, public.students, public.billing_plans, public.audit_events
  to authenticated;

create function public.create_teacher_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.teacher_profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.create_teacher_profile_for_auth_user() from public, anon, authenticated;
create trigger on_auth_user_created_create_teacher_profile
  after insert on auth.users
  for each row execute function public.create_teacher_profile_for_auth_user();

insert into public.teacher_profiles (id, display_name)
select users.id, coalesce(nullif(pg_catalog.btrim(users.raw_user_meta_data ->> 'full_name'), ''), '')
from auth.users as users
on conflict (id) do nothing;

create function public.save_teacher_profile(p_display_name text, p_timezone text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_version integer;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;

  if pg_catalog.char_length(pg_catalog.btrim(p_display_name)) not between 1 and 80 then
    raise exception 'Nama guru harus berisi 1 sampai 80 karakter.' using errcode = '22023';
  end if;

  if p_timezone not in ('Asia/Jakarta', 'Asia/Pontianak', 'Asia/Makassar', 'Asia/Jayapura') then
    raise exception 'Zona waktu tidak didukung.' using errcode = '22023';
  end if;

  update public.teacher_profiles
  set display_name = pg_catalog.btrim(p_display_name),
      timezone = p_timezone,
      updated_at = now(),
      version = version + 1
  where id = v_owner_id
  returning version into v_version;

  if v_version is null then
    raise exception 'Profil guru tidak ditemukan.' using errcode = 'P0002';
  end if;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (v_owner_id, 'teacher_profile', v_owner_id, 'profile.updated', v_owner_id,
          pg_catalog.jsonb_build_object('version', v_version));

  return v_version;
end;
$$;

create function public.save_student(
  p_student_id uuid,
  p_expected_version integer,
  p_request_key uuid,
  p_name text,
  p_grade text,
  p_guardian_name text,
  p_guardian_phone_e164 text,
  p_address_hint text,
  p_starts_on date,
  p_effective_month date,
  p_billing_mode public.billing_mode,
  p_rate_rupiah bigint,
  p_due_day integer
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_student_id uuid;
  v_old_version integer;
  v_is_new boolean := p_student_id is null;
  v_payload_hash text;
  v_existing_hash text;
  v_existing_response jsonb;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;

  if pg_catalog.char_length(pg_catalog.btrim(p_name)) not between 1 and 80 then
    raise exception 'Nama murid harus berisi 1 sampai 80 karakter.' using errcode = '22023';
  end if;
  if p_grade is not null and pg_catalog.char_length(pg_catalog.btrim(p_grade)) > 50 then
    raise exception 'Kelas maksimal 50 karakter.' using errcode = '22023';
  end if;
  if p_guardian_name is not null and pg_catalog.char_length(pg_catalog.btrim(p_guardian_name)) > 80 then
    raise exception 'Nama orang tua maksimal 80 karakter.' using errcode = '22023';
  end if;
  if p_address_hint is not null and pg_catalog.char_length(pg_catalog.btrim(p_address_hint)) > 120 then
    raise exception 'Alamat singkat maksimal 120 karakter.' using errcode = '22023';
  end if;
  if p_guardian_phone_e164 is not null and p_guardian_phone_e164 !~ '^\+[1-9][0-9]{7,14}$' then
    raise exception 'Nomor WhatsApp tidak valid.' using errcode = '22023';
  end if;

  if p_request_key is null then
    raise exception 'Request key wajib diisi.' using errcode = '22023';
  end if;

  v_payload_hash := pg_catalog.encode(
    extensions.digest(
      p_request_key::text || ':' || pg_catalog.jsonb_build_object(
        'student_id', p_student_id,
        'expected_version', p_expected_version,
        'name', pg_catalog.btrim(p_name),
        'grade', p_grade,
        'guardian_name', p_guardian_name,
        'guardian_phone_e164', p_guardian_phone_e164,
        'address_hint', p_address_hint,
        'starts_on', p_starts_on,
        'effective_month', p_effective_month,
        'billing_mode', p_billing_mode,
        'rate_rupiah', p_rate_rupiah,
        'due_day', p_due_day
      )::text,
      'sha256'
    ),
    'hex'
  );

  insert into public.mutation_requests (owner_id, operation, request_key, payload_hash)
  values (v_owner_id, 'save_student', p_request_key, v_payload_hash)
  on conflict (owner_id, operation, request_key) do nothing;

  select requests.payload_hash, requests.response
    into v_existing_hash, v_existing_response
  from public.mutation_requests as requests
  where requests.owner_id = v_owner_id
    and requests.operation = 'save_student'
    and requests.request_key = p_request_key
  for update;

  if v_existing_hash <> v_payload_hash then
    raise exception 'Request key sudah dipakai dengan data berbeda.' using errcode = '22023';
  end if;

  if v_existing_response is not null then
    return (v_existing_response ->> 'student_id')::uuid;
  end if;

  if v_is_new then
    if p_expected_version is not null then
      raise exception 'Versi murid baru tidak valid.' using errcode = '22023';
    end if;
    if p_effective_month is null or p_billing_mode is null or p_rate_rupiah is null or p_due_day is null then
      raise exception 'Tarif awal murid wajib diisi.' using errcode = '22023';
    end if;
    if extract(day from p_effective_month) <> 1
      or p_rate_rupiah not between 1 and 100000000
      or p_due_day not between 1 and 28 then
      raise exception 'Periksa kembali bulan efektif, tarif, dan tanggal jatuh tempo.' using errcode = '22023';
    end if;

    insert into public.students (
      owner_id, name, grade, guardian_name, guardian_phone_e164, address_hint, starts_on
    ) values (
      v_owner_id, pg_catalog.btrim(p_name),
      nullif(pg_catalog.btrim(coalesce(p_grade, '')), ''),
      nullif(pg_catalog.btrim(coalesce(p_guardian_name, '')), ''),
      p_guardian_phone_e164,
      nullif(pg_catalog.btrim(coalesce(p_address_hint, '')), ''),
      p_starts_on
    ) returning id into v_student_id;

    insert into public.billing_plans (
      owner_id, student_id, effective_month, mode, rate_rupiah, due_day
    ) values (
      v_owner_id, v_student_id, p_effective_month, p_billing_mode, p_rate_rupiah, p_due_day
    );

    insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
    values (v_owner_id, 'student', v_student_id, 'student.created', v_owner_id,
            pg_catalog.jsonb_build_object('version', 1, 'has_guardian_phone', p_guardian_phone_e164 is not null));
  else
    select students.id, students.version
      into v_student_id, v_old_version
    from public.students as students
    where students.id = p_student_id
      and students.owner_id = v_owner_id
      and students.archived_at is null
    for update;

    if v_student_id is null then
      raise exception 'Murid tidak ditemukan.' using errcode = 'P0002';
    end if;
    if p_expected_version is null or v_old_version <> p_expected_version then
      raise exception 'Data murid berubah. Muat ulang sebelum menyimpan.' using errcode = '40001';
    end if;

    update public.students
    set name = pg_catalog.btrim(p_name),
        grade = nullif(pg_catalog.btrim(coalesce(p_grade, '')), ''),
        guardian_name = nullif(pg_catalog.btrim(coalesce(p_guardian_name, '')), ''),
        guardian_phone_e164 = p_guardian_phone_e164,
        address_hint = nullif(pg_catalog.btrim(coalesce(p_address_hint, '')), ''),
        starts_on = p_starts_on,
        updated_at = now(),
        version = version + 1
    where id = v_student_id and owner_id = v_owner_id;

    if p_effective_month is not null or p_billing_mode is not null or p_rate_rupiah is not null or p_due_day is not null then
      if p_effective_month is null or p_billing_mode is null or p_rate_rupiah is null or p_due_day is null then
        raise exception 'Tarif baru harus diisi lengkap.' using errcode = '22023';
      end if;
      if extract(day from p_effective_month) <> 1
        or p_rate_rupiah not between 1 and 100000000
        or p_due_day not between 1 and 28 then
        raise exception 'Periksa kembali bulan efektif, tarif, dan tanggal jatuh tempo.' using errcode = '22023';
      end if;
      if exists (
        select 1 from public.billing_plans as plans
        where plans.owner_id = v_owner_id
          and plans.student_id = v_student_id
          and plans.effective_month = p_effective_month
      ) then
        raise exception 'Tarif untuk bulan tersebut sudah ada. Pilih bulan efektif berikutnya.' using errcode = '23505';
      end if;

      insert into public.billing_plans (owner_id, student_id, effective_month, mode, rate_rupiah, due_day)
      values (v_owner_id, v_student_id, p_effective_month, p_billing_mode, p_rate_rupiah, p_due_day);
    end if;

    insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
    values (v_owner_id, 'student', v_student_id, 'student.updated', v_owner_id,
            pg_catalog.jsonb_build_object('version', v_old_version + 1));
  end if;

  update public.mutation_requests
  set response = pg_catalog.jsonb_build_object('student_id', v_student_id),
      completed_at = now()
  where owner_id = v_owner_id
    and operation = 'save_student'
    and request_key = p_request_key;

  return v_student_id;
end;
$$;

create function public.archive_student(p_student_id uuid, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_timezone text;
  v_ends_on date;
  v_today date;
begin
  if v_owner_id is null then
    raise exception 'Unauthenticated' using errcode = '28000';
  end if;
  if pg_catalog.char_length(pg_catalog.btrim(p_reason)) not between 1 and 300 then
    raise exception 'Alasan mengarsipkan murid wajib diisi.' using errcode = '22023';
  end if;

  select profile.timezone into v_timezone
  from public.teacher_profiles as profile where profile.id = v_owner_id;
  select students.starts_on into v_ends_on
  from public.students as students
  where students.id = p_student_id and students.owner_id = v_owner_id and students.archived_at is null
  for update;
  if v_ends_on is null then
    raise exception 'Murid tidak ditemukan atau sudah diarsipkan.' using errcode = 'P0002';
  end if;

  v_today := (now() at time zone v_timezone)::date;
  v_ends_on := greatest(v_today, v_ends_on);
  update public.students
  set archived_at = now(), ends_on = v_ends_on, updated_at = now(), version = version + 1
  where id = p_student_id and owner_id = v_owner_id;

  insert into public.audit_events (owner_id, entity_type, entity_id, action, actor_id, safe_diff)
  values (v_owner_id, 'student', p_student_id, 'student.archived', v_owner_id,
          pg_catalog.jsonb_build_object('reason', pg_catalog.btrim(p_reason)));
  return true;
end;
$$;

revoke all on function public.save_teacher_profile(text, text) from public, anon, authenticated;
revoke all on function public.save_student(uuid, integer, uuid, text, text, text, text, text, date, date, public.billing_mode, bigint, integer)
  from public, anon, authenticated;
revoke all on function public.archive_student(uuid, text) from public, anon, authenticated;
grant execute on function public.save_teacher_profile(text, text) to authenticated;
grant execute on function public.save_student(uuid, integer, uuid, text, text, text, text, text, date, date, public.billing_mode, bigint, integer)
  to authenticated;
grant execute on function public.archive_student(uuid, text) to authenticated;
