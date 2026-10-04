create extension if not exists pgcrypto with schema extensions;
create extension if not exists btree_gist with schema extensions;

create table public.teacher_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  timezone text not null default 'Asia/Jakarta',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (timezone in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura'))
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) between 1 and 100),
  grade text check (grade is null or length(grade) <= 40),
  guardian_name text check (guardian_name is null or length(guardian_name) <= 100),
  guardian_phone_e164 text,
  address_hint text,
  starts_on date not null,
  ends_on date,
  archived_at timestamptz,
  photo_consent_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  version integer not null default 1,
  unique (owner_id, id),
  check (ends_on is null or ends_on >= starts_on)
);

create table public.billing_plans (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null, effective_month date not null, mode text not null check (mode in ('monthly','per_session')),
  rate_rupiah bigint not null check (rate_rupiah between 1 and 100000000), due_day smallint not null default 5 check (due_day between 1 and 28),
  created_at timestamptz not null default now(), unique(owner_id, student_id, effective_month),
  foreign key(owner_id, student_id) references public.students(owner_id, id) on delete cascade,
  check (extract(day from effective_month) = 1)
);

create table public.schedule_rules (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null, weekday smallint not null check (weekday between 1 and 7), local_start time not null,
  duration_minutes smallint not null check (duration_minutes between 15 and 240), effective_from date not null,
  effective_until date, timezone text not null default 'Asia/Jakarta', active boolean not null default true,
  created_at timestamptz not null default now(), unique(owner_id,id),
  foreign key(owner_id, student_id) references public.students(owner_id,id) on delete cascade,
  check(effective_until is null or effective_until >= effective_from)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null, schedule_rule_id uuid, occurrence_date date, starts_at timestamptz not null, ends_at timestamptz not null,
  state text not null default 'scheduled' check(state in ('scheduled','completed','student_absent','teacher_cancelled')),
  rescheduled_manually boolean not null default false, completed_at timestamptz, version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,id),
  foreign key(owner_id,student_id) references public.students(owner_id,id) on delete cascade,
  foreign key(owner_id,schedule_rule_id) references public.schedule_rules(owner_id,id),
  check(ends_at > starts_at)
);
create unique index sessions_occurrence_unique on public.sessions(schedule_rule_id, occurrence_date) where schedule_rule_id is not null;
create index sessions_owner_start_idx on public.sessions(owner_id, starts_at);
alter table public.sessions add constraint sessions_no_overlap exclude using gist (owner_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (state in ('scheduled','completed'));

create table public.learning_topics (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null, name text not null check(length(btrim(name)) between 1 and 120), normalized_name text not null,
  archived_at timestamptz, unique(owner_id, student_id, normalized_name), unique(owner_id,id),
  foreign key(owner_id,student_id) references public.students(owner_id,id) on delete cascade
);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null unique, topic_id uuid not null, understanding text not null check(understanding in ('independent','assisted','repeat')),
  note text check(note is null or length(note) <= 300), version integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(owner_id,id),
  foreign key(owner_id,session_id) references public.sessions(owner_id,id) on delete cascade,
  foreign key(owner_id,topic_id) references public.learning_topics(owner_id,id)
);

create table public.session_note_revisions (
  id bigint generated always as identity primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null, topic_id uuid not null, understanding text not null check(understanding in ('independent','assisted','repeat')),
  note text check(note is null or length(note) <= 300), reason text not null, actor_id uuid not null references auth.users(id),
  version integer not null, changed_at timestamptz not null default now(),
  foreign key(owner_id,session_id) references public.sessions(owner_id,id) on delete cascade,
  foreign key(owner_id,topic_id) references public.learning_topics(owner_id,id)
);

create table public.session_media (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null, object_path text not null unique, byte_size integer not null check(byte_size between 1 and 5242880),
  state text not null default 'pending' check(state in ('pending','ready','deleted')),
  created_at timestamptz not null default now(), unique(owner_id,id),
  foreign key(owner_id,session_id) references public.sessions(owner_id,id) on delete cascade,
  check(object_path = owner_id::text || '/' || session_id::text || '/' || id::text || '.jpg')
);
create unique index one_active_session_media on public.session_media(session_id) where state in ('pending','ready');

create table public.invoices (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null, period_start date not null, mode_snapshot text not null check(mode_snapshot in ('monthly','per_session')),
  due_date date not null, invoice_number text not null, lifecycle text not null default 'active' check(lifecycle in ('active','void')),
  created_at timestamptz not null default now(), unique(owner_id, student_id, period_start), unique(owner_id, invoice_number), unique(owner_id,id),
  foreign key(owner_id,student_id) references public.students(owner_id,id) on delete cascade,
  check(extract(day from period_start)=1)
);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null, session_id uuid, kind text not null check(kind in ('monthly','session','opening_balance','adjustment')),
  amount_rupiah bigint not null, description text not null, reason text, state text not null default 'active' check(state in ('active','void')),
  created_at timestamptz not null default now(),
  foreign key(owner_id,invoice_id) references public.invoices(owner_id,id) on delete cascade,
  foreign key(owner_id,session_id) references public.sessions(owner_id,id),
  check(kind <> 'adjustment' or length(btrim(coalesce(reason,''))) > 0)
);
create unique index one_session_charge on public.invoice_items(session_id) where kind='session' and state='active';
create unique index one_monthly_charge on public.invoice_items(invoice_id) where kind='monthly' and state='active';

create table public.payments (
  id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null, amount_rupiah bigint not null check(amount_rupiah between 1 and 100000000), received_on date not null,
  method text not null check(method in ('cash','transfer')), state text not null default 'posted' check(state in ('posted','void')),
  void_reason text, voided_at timestamptz, created_at timestamptz not null default now(),
  foreign key(owner_id,invoice_id) references public.invoices(owner_id,id) on delete cascade,
  check(state <> 'void' or (length(btrim(coalesce(void_reason,''))) > 0 and voided_at is not null))
);

create table public.audit_events (
  id bigint generated always as identity primary key, owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null, entity_id uuid not null, action text not null, actor_id uuid not null references auth.users(id),
  occurred_at timestamptz not null default now(), safe_diff jsonb not null default '{}'::jsonb
);
create table public.mutation_requests (
  owner_id uuid not null references auth.users(id) on delete cascade, operation text not null, request_key uuid not null,
  payload_hash text not null, response jsonb, completed_at timestamptz, primary key(owner_id,operation,request_key)
);

create view public.invoice_balances with (security_invoker = true) as
select i.id, i.owner_id, i.student_id, i.period_start, i.due_date, i.invoice_number,
       (select coalesce(sum(ii.amount_rupiah),0)::bigint from public.invoice_items ii where ii.invoice_id=i.id and ii.owner_id=i.owner_id and ii.state='active') as total_rupiah,
       (select coalesce(sum(p.amount_rupiah),0)::bigint from public.payments p where p.invoice_id=i.id and p.owner_id=i.owner_id and p.state='posted') as paid_rupiah,
       ((select coalesce(sum(ii.amount_rupiah),0) from public.invoice_items ii where ii.invoice_id=i.id and ii.owner_id=i.owner_id and ii.state='active')
        - (select coalesce(sum(p.amount_rupiah),0) from public.payments p where p.invoice_id=i.id and p.owner_id=i.owner_id and p.state='posted'))::bigint as balance_rupiah
from public.invoices i;

alter table public.teacher_profiles enable row level security;
alter table public.students enable row level security;
alter table public.billing_plans enable row level security;
alter table public.schedule_rules enable row level security;
alter table public.sessions enable row level security;
alter table public.learning_topics enable row level security;
alter table public.session_notes enable row level security;
alter table public.session_note_revisions enable row level security;
alter table public.session_media enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
alter table public.payments enable row level security;
alter table public.audit_events enable row level security;
alter table public.mutation_requests enable row level security;

do $$ declare t text; begin
  foreach t in array array['students','billing_plans','schedule_rules','sessions','learning_topics','session_notes','session_note_revisions','session_media','invoices','invoice_items','payments','audit_events'] loop
    execute format('create policy read_own on public.%I for select to authenticated using ((select auth.uid()) = owner_id)', t);
  end loop;
end $$;
create policy profile_read_self on public.teacher_profiles for select to authenticated using (id = (select auth.uid()));
create policy profile_insert_self on public.teacher_profiles for insert to authenticated with check (id = (select auth.uid()));
create policy profile_update_self on public.teacher_profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

grant select on public.teacher_profiles, public.students, public.billing_plans, public.schedule_rules, public.sessions, public.learning_topics, public.session_notes, public.session_note_revisions, public.session_media, public.invoices, public.invoice_items, public.payments, public.audit_events to authenticated;
grant select on public.invoice_balances to authenticated;
grant insert, update on public.teacher_profiles to authenticated;
revoke insert, update, delete on public.students, public.billing_plans, public.schedule_rules, public.sessions, public.learning_topics, public.session_notes, public.session_note_revisions, public.session_media, public.invoices, public.invoice_items, public.payments, public.audit_events, public.mutation_requests from anon, authenticated;

create or replace function public.set_student_photo_consent(p_student_id uuid,p_consent_date date)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_timezone text;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select timezone into v_timezone from public.teacher_profiles where id=v_owner;
  v_timezone := coalesce(v_timezone,'Asia/Jakarta');
  if p_consent_date is null or p_consent_date > (now() at time zone v_timezone)::date then raise exception 'VALIDATION' using errcode='22023'; end if;
  update public.students set photo_consent_at=p_consent_date,updated_at=now(),version=version+1
    where id=p_student_id and owner_id=v_owner and archived_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'student',p_student_id,'photo_consent_recorded',v_owner,jsonb_build_object('consent_date',p_consent_date));
  return p_student_id;
end $$;
revoke all on function public.set_student_photo_consent(uuid,date) from public, anon;
grant execute on function public.set_student_photo_consent(uuid,date) to authenticated;

create or replace function public.withdraw_student_photo_consent(p_student_id uuid)
returns table(media_id uuid,object_path text) language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  update public.students set photo_consent_at=null,updated_at=now(),version=version+1
    where id=p_student_id and owner_id=v_owner;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'student',p_student_id,'photo_consent_withdrawn',v_owner,'{}'::jsonb);
  return query update public.session_media m set state='deleted'
    from public.sessions s where s.id=m.session_id and s.owner_id=v_owner and s.student_id=p_student_id and m.owner_id=v_owner
      returning m.id,m.object_path;
end $$;
revoke all on function public.withdraw_student_photo_consent(uuid) from public, anon;
grant execute on function public.withdraw_student_photo_consent(uuid) to authenticated;

create or replace function public.reserve_session_media(p_session_id uuid,p_byte_size integer)
returns table(media_id uuid,object_path text) language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_student uuid; v_media uuid := gen_random_uuid(); v_path text;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_byte_size not between 1 and 5242880 then raise exception 'VALIDATION' using errcode='22023'; end if;
  select s.student_id into v_student from public.sessions s join public.students st on st.id=s.student_id and st.owner_id=s.owner_id
    where s.id=p_session_id and s.owner_id=v_owner and s.state='completed' and st.photo_consent_at is not null for update of st;
  if not found then raise exception 'PHOTO_CONSENT_REQUIRED' using errcode='22023'; end if;
  perform 1 from public.sessions where id=p_session_id and owner_id=v_owner and state='completed' for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  v_path := v_owner::text || '/' || p_session_id::text || '/' || v_media::text || '.jpg';
  return query insert into public.session_media as media(id,owner_id,session_id,object_path,byte_size,state)
    values(v_media,v_owner,p_session_id,v_path,p_byte_size,'pending') returning media.id,media.object_path;
end $$;
revoke all on function public.reserve_session_media(uuid,integer) from public, anon;
grant execute on function public.reserve_session_media(uuid,integer) to authenticated;

create or replace function public.finalize_session_media(p_media_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_session uuid;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  update public.session_media m set state='ready' from public.sessions s join public.students st on st.id=s.student_id and st.owner_id=s.owner_id
    where m.id=p_media_id and m.owner_id=v_owner and m.state='pending' and s.id=m.session_id and s.owner_id=v_owner and s.state='completed' and st.photo_consent_at is not null
    returning m.session_id into v_session;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  return p_media_id;
end $$;
revoke all on function public.finalize_session_media(uuid) from public, anon;
grant execute on function public.finalize_session_media(uuid) to authenticated;

create or replace function public.remove_session_media(p_media_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_path text;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  update public.session_media set state='deleted' where id=p_media_id and owner_id=v_owner returning object_path into v_path;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  return v_path;
end $$;
revoke all on function public.remove_session_media(uuid) from public, anon;
grant execute on function public.remove_session_media(uuid) to authenticated;

create or replace function public.purge_session_media(p_media_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  delete from public.session_media where id=p_media_id and owner_id=v_owner and state='deleted';
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  return p_media_id;
end $$;
revoke all on function public.purge_session_media(uuid) from public, anon;
grant execute on function public.purge_session_media(uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
  values('session-photos','session-photos',false,5242880,array['image/jpeg'])
  on conflict(id) do update set public=false,file_size_limit=5242880,allowed_mime_types=array['image/jpeg'];
create policy session_photos_read_own on storage.objects for select to authenticated
  using(bucket_id='session-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy session_photos_upload_own on storage.objects for insert to authenticated
  with check(bucket_id='session-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy session_photos_update_own on storage.objects for update to authenticated
  using(bucket_id='session-photos' and (storage.foldername(name))[1]=(select auth.uid())::text)
  with check(bucket_id='session-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy session_photos_delete_own on storage.objects for delete to authenticated
  using(bucket_id='session-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create or replace function public.create_student(
  p_name text, p_grade text, p_guardian_name text, p_guardian_phone text,
  p_mode text, p_rate_rupiah bigint, p_starts_on date, p_due_day smallint,
  p_weekday smallint, p_local_start time, p_duration_minutes smallint, p_timezone text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_student uuid := gen_random_uuid(); v_rule uuid; v_day date; v_start timestamptz;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_timezone not in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura') then raise exception 'VALIDATION' using errcode='22023'; end if;
  if length(btrim(p_name)) not between 1 and 100 or p_mode not in ('monthly','per_session') or p_rate_rupiah not between 1 and 100000000 or p_due_day not between 1 and 28 then raise exception 'VALIDATION' using errcode='22023'; end if;
  if p_weekday is not null and (p_weekday not between 1 and 7 or p_local_start is null or p_duration_minutes not between 15 and 240) then raise exception 'VALIDATION' using errcode='22023'; end if;
  insert into public.students(id,owner_id,name,grade,guardian_name,guardian_phone_e164,starts_on)
    values(v_student,v_owner,btrim(p_name),nullif(btrim(p_grade),''),nullif(btrim(p_guardian_name),''),nullif(btrim(p_guardian_phone),''),p_starts_on);
  insert into public.billing_plans(owner_id,student_id,effective_month,mode,rate_rupiah,due_day)
    values(v_owner,v_student,date_trunc('month',p_starts_on)::date,p_mode,p_rate_rupiah,p_due_day);
  if p_weekday is not null then
    insert into public.schedule_rules(owner_id,student_id,weekday,local_start,duration_minutes,effective_from,timezone)
      values(v_owner,v_student,p_weekday,p_local_start,p_duration_minutes,p_starts_on,p_timezone) returning id into v_rule;
    for v_day in select d::date from generate_series(p_starts_on, p_starts_on + 59, interval '1 day') d loop
      if extract(isodow from v_day)::int = p_weekday then
        v_start := (v_day + p_local_start) at time zone p_timezone;
        insert into public.sessions(owner_id,student_id,schedule_rule_id,occurrence_date,starts_at,ends_at)
          values(v_owner,v_student,v_rule,v_day,v_start,v_start + make_interval(mins => p_duration_minutes));
      end if;
    end loop;
  end if;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'student',v_student,'created',v_owner,jsonb_build_object('name',btrim(p_name),'billing_mode',p_mode));
  return v_student;
end $$;
revoke all on function public.create_student(text,text,text,text,text,bigint,date,smallint,smallint,time,smallint,text) from public, anon;
grant execute on function public.create_student(text,text,text,text,text,bigint,date,smallint,smallint,time,smallint,text) to authenticated;

create or replace function public.complete_session(
  p_session_id uuid, p_expected_version integer, p_topic_name text, p_understanding text, p_note text
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_session public.sessions%rowtype; v_student public.students%rowtype;
  v_topic uuid; v_note_id uuid; v_plan public.billing_plans%rowtype; v_invoice uuid; v_local date; v_timezone text;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if length(btrim(p_topic_name)) not between 1 and 120 or p_understanding not in ('independent','assisted','repeat') or length(coalesce(p_note,'')) > 300 then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_session from public.sessions where id=p_session_id and owner_id=v_owner for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_session.version <> p_expected_version or v_session.state <> 'scheduled' then raise exception 'CONFLICT' using errcode='40001'; end if;
  if v_session.starts_at > now() then raise exception 'SESSION_IN_FUTURE' using errcode='22023'; end if;
  select * into v_student from public.students where id=v_session.student_id and owner_id=v_owner;
  select timezone into v_timezone from public.teacher_profiles where id=v_owner;
  v_timezone := coalesce(v_timezone,'Asia/Jakarta');
  v_local := (v_session.starts_at at time zone v_timezone)::date;
  insert into public.learning_topics(owner_id,student_id,name,normalized_name)
    values(v_owner,v_session.student_id,btrim(p_topic_name),lower(btrim(p_topic_name)))
    on conflict(owner_id,student_id,normalized_name) do update set name=excluded.name returning id into v_topic;
  update public.sessions set state='completed',completed_at=now(),version=version+1,updated_at=now() where id=p_session_id;
  insert into public.session_notes(owner_id,session_id,topic_id,understanding,note)
    values(v_owner,p_session_id,v_topic,p_understanding,nullif(btrim(p_note),'')) returning id into v_note_id;
  select * into v_plan from public.billing_plans where owner_id=v_owner and student_id=v_session.student_id and effective_month<=date_trunc('month',v_local)::date order by effective_month desc limit 1;
  if v_plan.mode='per_session' then
    insert into public.invoices(owner_id,student_id,period_start,mode_snapshot,due_date,invoice_number)
      values(v_owner,v_session.student_id,date_trunc('month',v_local)::date,'per_session',date_trunc('month',v_local)::date + (v_plan.due_day - 1),
        'TL-' || to_char(v_local,'YYYYMM') || '-' || upper(substr(replace(v_session.student_id::text,'-',''),1,8)))
      on conflict(owner_id,student_id,period_start) do update set mode_snapshot=excluded.mode_snapshot returning id into v_invoice;
    insert into public.invoice_items(owner_id,invoice_id,session_id,kind,amount_rupiah,description)
      values(v_owner,v_invoice,p_session_id,'session',v_plan.rate_rupiah,'Sesi ' || to_char(v_local,'DD Mon YYYY'));
  elsif v_plan.mode='monthly' then
    insert into public.invoices(owner_id,student_id,period_start,mode_snapshot,due_date,invoice_number)
      values(v_owner,v_session.student_id,date_trunc('month',v_local)::date,'monthly',date_trunc('month',v_local)::date + (v_plan.due_day - 1),
        'TL-' || to_char(v_local,'YYYYMM') || '-' || upper(substr(replace(v_session.student_id::text,'-',''),1,8)))
      on conflict(owner_id,student_id,period_start) do update set mode_snapshot=excluded.mode_snapshot returning id into v_invoice;
    insert into public.invoice_items(owner_id,invoice_id,kind,amount_rupiah,description)
      values(v_owner,v_invoice,'monthly',v_plan.rate_rupiah,'Biaya les bulanan ' || to_char(v_local,'MM/YYYY')) on conflict do nothing;
  end if;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'session',p_session_id,'completed',v_owner,jsonb_build_object('note_id',v_note_id,'topic_id',v_topic));
  return v_note_id;
end $$;
revoke all on function public.complete_session(uuid,integer,text,text,text) from public, anon;
grant execute on function public.complete_session(uuid,integer,text,text,text) to authenticated;

create or replace function public.record_payment(p_invoice_id uuid,p_amount_rupiah bigint,p_received_on date,p_method text,p_request_key uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_total bigint; v_paid bigint; v_payment uuid; v_payload_hash text; v_request public.mutation_requests%rowtype; v_timezone text;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  select timezone into v_timezone from public.teacher_profiles where id=v_owner;
  v_timezone := coalesce(v_timezone,'Asia/Jakarta');
  if p_request_key is null or p_amount_rupiah <= 0 or p_amount_rupiah > 100000000 or p_received_on > (now() at time zone v_timezone)::date or p_method not in ('cash','transfer') then raise exception 'VALIDATION' using errcode='22023'; end if;
  v_payload_hash := md5(concat_ws('|',p_invoice_id::text,p_amount_rupiah::text,p_received_on::text,p_method));
  insert into public.mutation_requests(owner_id,operation,request_key,payload_hash)
    values(v_owner,'record_payment',p_request_key,v_payload_hash) on conflict(owner_id,operation,request_key) do nothing;
  select * into v_request from public.mutation_requests where owner_id=v_owner and operation='record_payment' and request_key=p_request_key for update;
  if v_request.payload_hash <> v_payload_hash then raise exception 'IDEMPOTENCY_CONFLICT' using errcode='40001'; end if;
  if v_request.completed_at is not null then return (v_request.response->>'payment_id')::uuid; end if;
  perform 1 from public.invoices where id=p_invoice_id and owner_id=v_owner and lifecycle='active' for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  select coalesce(sum(amount_rupiah),0) into v_total from public.invoice_items where invoice_id=p_invoice_id and owner_id=v_owner and state='active';
  select coalesce(sum(amount_rupiah),0) into v_paid from public.payments where invoice_id=p_invoice_id and owner_id=v_owner and state='posted';
  if p_amount_rupiah > v_total-v_paid then raise exception 'PAYMENT_EXCEEDS_BALANCE' using errcode='22023'; end if;
  insert into public.payments(owner_id,invoice_id,amount_rupiah,received_on,method) values(v_owner,p_invoice_id,p_amount_rupiah,p_received_on,p_method) returning id into v_payment;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff) values(v_owner,'payment',v_payment,'recorded',v_owner,jsonb_build_object('amount_rupiah',p_amount_rupiah,'invoice_id',p_invoice_id));
  update public.mutation_requests set response=jsonb_build_object('payment_id',v_payment),completed_at=now() where owner_id=v_owner and operation='record_payment' and request_key=p_request_key;
  return v_payment;
end $$;
revoke all on function public.record_payment(uuid,bigint,date,text,uuid) from public, anon;
grant execute on function public.record_payment(uuid,bigint,date,text,uuid) to authenticated;

create or replace function public.ensure_invoices(p_period_start date,p_timezone text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_count integer := 0; v_student record; v_invoice uuid; v_plan public.billing_plans%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_timezone not in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura') or extract(day from p_period_start) <> 1
    or p_period_start <> date_trunc('month', now() at time zone p_timezone)::date then
    raise exception 'VALIDATION' using errcode='22023';
  end if;
  for v_student in select id,starts_on,ends_on from public.students where owner_id=v_owner and archived_at is null loop
    if v_student.starts_on > (p_period_start + interval '1 month - 1 day')::date or (v_student.ends_on is not null and v_student.ends_on < p_period_start) then continue; end if;
    select * into v_plan from public.billing_plans where owner_id=v_owner and student_id=v_student.id and effective_month<=p_period_start order by effective_month desc limit 1;
    if not found or v_plan.mode <> 'monthly' then continue; end if;
    insert into public.invoices(owner_id,student_id,period_start,mode_snapshot,due_date,invoice_number)
      values(v_owner,v_student.id,p_period_start,'monthly',p_period_start + (v_plan.due_day - 1),
        'TL-' || to_char(p_period_start,'YYYYMM') || '-' || upper(substr(replace(v_student.id::text,'-',''),1,8)))
      on conflict(owner_id,student_id,period_start) do nothing returning id into v_invoice;
    if v_invoice is not null then
      insert into public.invoice_items(owner_id,invoice_id,kind,amount_rupiah,description)
        values(v_owner,v_invoice,'monthly',v_plan.rate_rupiah,'Biaya les bulanan ' || to_char(p_period_start,'MM/YYYY'));
      v_count := v_count + 1;
    end if;
    v_invoice := null;
  end loop;
  return v_count;
end $$;
revoke all on function public.ensure_invoices(date,text) from public, anon;
grant execute on function public.ensure_invoices(date,text) to authenticated;

create or replace function public.void_payment(p_payment_id uuid,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_payment public.payments%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 300 then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_payment from public.payments where id=p_payment_id and owner_id=v_owner and state='posted' for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  perform 1 from public.invoices where id=v_payment.invoice_id and owner_id=v_owner for update;
  update public.payments set state='void',void_reason=btrim(p_reason),voided_at=now() where id=p_payment_id;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'payment',p_payment_id,'voided',v_owner,jsonb_build_object('reason',btrim(p_reason)));
  return p_payment_id;
end $$;
revoke all on function public.void_payment(uuid,text) from public, anon;
grant execute on function public.void_payment(uuid,text) to authenticated;

create or replace function public.update_student(
  p_student_id uuid,p_expected_version integer,p_name text,p_grade text,p_guardian_name text,p_guardian_phone text,
  p_mode text,p_rate_rupiah bigint,p_due_day smallint,p_effective_month date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_student public.students%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if length(btrim(p_name)) not between 1 and 100 or p_mode not in ('monthly','per_session')
    or p_rate_rupiah not between 1 and 100000000 or p_due_day not between 1 and 28
    or extract(day from p_effective_month) <> 1
    or p_effective_month < date_trunc('month',now())::date then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_student from public.students where id=p_student_id and owner_id=v_owner and archived_at is null for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_student.version <> p_expected_version then raise exception 'CONFLICT' using errcode='40001'; end if;
  update public.students set name=btrim(p_name),grade=nullif(btrim(p_grade),''),guardian_name=nullif(btrim(p_guardian_name),''),
    guardian_phone_e164=nullif(btrim(p_guardian_phone),''),version=version+1,updated_at=now() where id=p_student_id;
  insert into public.billing_plans(owner_id,student_id,effective_month,mode,rate_rupiah,due_day)
    values(v_owner,p_student_id,p_effective_month,p_mode,p_rate_rupiah,p_due_day)
    on conflict(owner_id,student_id,effective_month) do update set mode=excluded.mode,rate_rupiah=excluded.rate_rupiah,due_day=excluded.due_day;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'student',p_student_id,'updated',v_owner,jsonb_build_object('name',btrim(p_name),'billing_mode',p_mode,'rate_rupiah',p_rate_rupiah));
  return p_student_id;
end $$;
revoke all on function public.update_student(uuid,integer,text,text,text,text,text,bigint,smallint,date) from public, anon;
grant execute on function public.update_student(uuid,integer,text,text,text,text,text,bigint,smallint,date) to authenticated;

create or replace function public.archive_student(p_student_id uuid,p_ends_on date,p_reason text,p_timezone text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_student public.students%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_timezone not in ('Asia/Jakarta','Asia/Makassar','Asia/Jayapura') or length(btrim(coalesce(p_reason,''))) not between 1 and 300 then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_student from public.students where id=p_student_id and owner_id=v_owner and archived_at is null for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if p_ends_on < v_student.starts_on or p_ends_on > (now() at time zone p_timezone)::date then raise exception 'VALIDATION' using errcode='22023'; end if;
  update public.students set ends_on=p_ends_on,archived_at=now(),version=version+1,updated_at=now() where id=p_student_id;
  update public.schedule_rules set active=false,effective_until=p_ends_on where owner_id=v_owner and student_id=p_student_id;
  update public.sessions set state='teacher_cancelled',version=version+1,updated_at=now()
    where owner_id=v_owner and student_id=p_student_id and state='scheduled' and starts_at >= ((p_ends_on + 1)::timestamp at time zone p_timezone);
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'student',p_student_id,'archived',v_owner,jsonb_build_object('ends_on',p_ends_on,'reason',btrim(p_reason)));
  return p_student_id;
end $$;
revoke all on function public.archive_student(uuid,date,text,text) from public, anon;
grant execute on function public.archive_student(uuid,date,text,text) to authenticated;

create or replace function public.reschedule_session(p_session_id uuid,p_expected_version integer,p_starts_at timestamptz,p_ends_at timestamptz)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_session public.sessions%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_ends_at <= p_starts_at or p_ends_at-p_starts_at > interval '4 hours' then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_session from public.sessions where id=p_session_id and owner_id=v_owner and state='scheduled' for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_session.version <> p_expected_version then raise exception 'CONFLICT' using errcode='40001'; end if;
  update public.sessions set starts_at=p_starts_at,ends_at=p_ends_at,rescheduled_manually=true,version=version+1,updated_at=now() where id=p_session_id;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'session',p_session_id,'rescheduled',v_owner,jsonb_build_object('old_starts_at',v_session.starts_at,'new_starts_at',p_starts_at,'old_ends_at',v_session.ends_at,'new_ends_at',p_ends_at));
  return p_session_id;
end $$;
revoke all on function public.reschedule_session(uuid,integer,timestamptz,timestamptz) from public, anon;
grant execute on function public.reschedule_session(uuid,integer,timestamptz,timestamptz) to authenticated;

create or replace function public.set_session_state(p_session_id uuid,p_expected_version integer,p_state text,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_session public.sessions%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_state not in ('student_absent','teacher_cancelled') or length(btrim(coalesce(p_reason,''))) not between 1 and 300 then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_session from public.sessions where id=p_session_id and owner_id=v_owner and state='scheduled' for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_session.version <> p_expected_version then raise exception 'CONFLICT' using errcode='40001'; end if;
  update public.sessions set state=p_state,version=version+1,updated_at=now() where id=p_session_id;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'session',p_session_id,p_state,v_owner,jsonb_build_object('reason',btrim(p_reason)));
  return p_session_id;
end $$;
revoke all on function public.set_session_state(uuid,integer,text,text) from public, anon;
grant execute on function public.set_session_state(uuid,integer,text,text) to authenticated;

create or replace function public.create_ad_hoc_session(p_student_id uuid,p_starts_at timestamptz,p_duration_minutes smallint)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_session uuid; v_student public.students%rowtype;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_duration_minutes not between 15 and 240 or p_starts_at > now() + interval '60 days' then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_student from public.students where id=p_student_id and owner_id=v_owner and archived_at is null;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  insert into public.sessions(owner_id,student_id,starts_at,ends_at)
    values(v_owner,p_student_id,p_starts_at,p_starts_at+make_interval(mins=>p_duration_minutes)) returning id into v_session;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'session',v_session,'created',v_owner,jsonb_build_object('kind','ad_hoc','student_id',p_student_id));
  return v_session;
end $$;
revoke all on function public.create_ad_hoc_session(uuid,timestamptz,smallint) from public, anon;
grant execute on function public.create_ad_hoc_session(uuid,timestamptz,smallint) to authenticated;

create or replace function public.ensure_schedule_window(p_from date,p_to date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_rule record; v_day date; v_start timestamptz; v_count integer := 0;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_to < p_from or p_to-p_from > 59 then raise exception 'VALIDATION' using errcode='22023'; end if;
  for v_rule in select r.* from public.schedule_rules r join public.students s on s.id=r.student_id and s.owner_id=r.owner_id
    where r.owner_id=v_owner and r.active and s.archived_at is null and r.effective_from <= p_to and (r.effective_until is null or r.effective_until >= p_from)
  loop
    for v_day in select d::date from generate_series(greatest(p_from,v_rule.effective_from), least(p_to,coalesce(v_rule.effective_until,p_to)), interval '1 day') d loop
      if extract(isodow from v_day)::int = v_rule.weekday then
        v_start := (v_day + v_rule.local_start) at time zone v_rule.timezone;
        insert into public.sessions(owner_id,student_id,schedule_rule_id,occurrence_date,starts_at,ends_at)
          values(v_owner,v_rule.student_id,v_rule.id,v_day,v_start,v_start+make_interval(mins=>v_rule.duration_minutes))
          on conflict do nothing;
        if found then v_count := v_count + 1; end if;
      end if;
    end loop;
  end loop;
  return v_count;
end $$;
revoke all on function public.ensure_schedule_window(date,date) from public, anon;
grant execute on function public.ensure_schedule_window(date,date) to authenticated;

create or replace function public.add_invoice_adjustment(p_invoice_id uuid,p_amount_signed bigint,p_description text,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_total bigint; v_paid bigint; v_item uuid;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if p_amount_signed = 0 or abs(p_amount_signed) > 100000000 or length(btrim(p_description)) not between 1 and 120 or length(btrim(p_reason)) not between 1 and 300 then raise exception 'VALIDATION' using errcode='22023'; end if;
  perform 1 from public.invoices where id=p_invoice_id and owner_id=v_owner and lifecycle='active' for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  select coalesce(sum(amount_rupiah),0) into v_total from public.invoice_items where invoice_id=p_invoice_id and owner_id=v_owner and state='active';
  select coalesce(sum(amount_rupiah),0) into v_paid from public.payments where invoice_id=p_invoice_id and owner_id=v_owner and state='posted';
  if v_total+p_amount_signed < v_paid or v_total+p_amount_signed < 0 then raise exception 'ADJUSTMENT_BELOW_PAID' using errcode='22023'; end if;
  insert into public.invoice_items(owner_id,invoice_id,kind,amount_rupiah,description,reason)
    values(v_owner,p_invoice_id,'adjustment',p_amount_signed,btrim(p_description),btrim(p_reason)) returning id into v_item;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'invoice_item',v_item,'adjusted',v_owner,jsonb_build_object('amount_rupiah',p_amount_signed,'reason',btrim(p_reason)));
  return v_item;
end $$;
revoke all on function public.add_invoice_adjustment(uuid,bigint,text,text) from public, anon;
grant execute on function public.add_invoice_adjustment(uuid,bigint,text,text) to authenticated;

create or replace function public.reopen_session(p_session_id uuid,p_expected_version integer,p_reason text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_owner uuid := auth.uid(); v_session public.sessions%rowtype; v_note public.session_notes%rowtype; v_invoice uuid;
  v_charge bigint; v_total bigint; v_paid bigint;
begin
  if v_owner is null then raise exception 'UNAUTHENTICATED' using errcode='28000'; end if;
  if length(btrim(coalesce(p_reason,''))) not between 1 and 300 then raise exception 'VALIDATION' using errcode='22023'; end if;
  select * into v_session from public.sessions where id=p_session_id and owner_id=v_owner for update;
  if not found then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if v_session.state <> 'completed' or v_session.version <> p_expected_version then raise exception 'CONFLICT' using errcode='40001'; end if;
  select invoice_id,amount_rupiah into v_invoice,v_charge from public.invoice_items where owner_id=v_owner and session_id=p_session_id and kind='session' and state='active' limit 1;
  if v_invoice is not null then
    perform 1 from public.invoices where id=v_invoice and owner_id=v_owner for update;
    select coalesce(sum(amount_rupiah),0) into v_total from public.invoice_items where invoice_id=v_invoice and owner_id=v_owner and state='active';
    select coalesce(sum(amount_rupiah),0) into v_paid from public.payments where invoice_id=v_invoice and owner_id=v_owner and state='posted';
    if v_total-v_charge < v_paid then raise exception 'CHARGE_BELOW_PAID' using errcode='22023'; end if;
    update public.invoice_items set state='void' where owner_id=v_owner and session_id=p_session_id and kind='session' and state='active';
  end if;
  select * into v_note from public.session_notes where owner_id=v_owner and session_id=p_session_id for update;
  if found then
    insert into public.session_note_revisions(owner_id,session_id,topic_id,understanding,note,reason,actor_id,version)
      values(v_owner,p_session_id,v_note.topic_id,v_note.understanding,v_note.note,btrim(p_reason),v_owner,v_note.version);
    delete from public.session_notes where id=v_note.id and owner_id=v_owner;
  end if;
  update public.sessions set state='scheduled',completed_at=null,version=version+1,updated_at=now() where id=p_session_id;
  insert into public.audit_events(owner_id,entity_type,entity_id,action,actor_id,safe_diff)
    values(v_owner,'session',p_session_id,'reopened',v_owner,jsonb_build_object('reason',btrim(p_reason),'reversed_charge',coalesce(v_charge,0)));
  return p_session_id;
end $$;
revoke all on function public.reopen_session(uuid,integer,text) from public, anon;
grant execute on function public.reopen_session(uuid,integer,text) to authenticated;
