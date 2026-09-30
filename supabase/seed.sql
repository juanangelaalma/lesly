-- Local development seed: one demo tutor (demo@temanles.test / demo12345) with sample data.
-- Never run against production.
do $$
declare
  v_uid uuid := '00000000-0000-4000-8000-000000000001';
  v_raka uuid;
  v_nadia uuid;
  v_session uuid;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'demo@temanles.test',
    extensions.crypt('demo12345', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{"display_name":"Kak Dinda"}', now(), now(),
    '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_uid, v_uid::text,
    jsonb_build_object('sub', v_uid::text, 'email', 'demo@temanles.test', 'email_verified', true),
    'email', now(), now(), now());

  perform set_config('request.jwt.claims', json_build_object('sub', v_uid, 'role', 'authenticated')::text, true);

  perform public.update_teacher_profile('Kak Dinda', '+6281200000001', 'Asia/Jakarta', 'Salam, Kak Dinda');

  v_raka := (public.create_student(gen_random_uuid(), 'Raka Pratama', 'SD 5', 'Matematika', 'Jl. Melati 12',
    'Ibu Sari', '+6281234567890', null, 'monthly', 400000, date_trunc('month', v_today)::date) ->> 'studentId')::uuid;
  v_nadia := (public.create_student(gen_random_uuid(), 'Nadia Putri', 'SMP 1', 'IPA', null,
    'Bapak Hendra', '+6281298765432', null, 'per_session', 75000, date_trunc('month', v_today)::date) ->> 'studentId')::uuid;

  perform public.add_schedule_rule(v_raka, extract(isodow from v_today)::smallint, time '16:00', 90, v_today);
  perform public.add_schedule_rule(v_nadia, extract(isodow from v_today + 1)::smallint, time '15:00', 60, v_today);

  v_session := (public.create_session(gen_random_uuid(), v_nadia,
    ((v_today - 2) + time '15:00') at time zone 'Asia/Jakarta', 60) ->> 'sessionId')::uuid;
  perform public.complete_session(gen_random_uuid(), v_session, 1, 'Sistem pencernaan', 'assisted',
    'Sudah paham organ utama, perlu latihan urutan proses.');

  perform public.ensure_invoices(date_trunc('month', v_today)::date);

  perform set_config('request.jwt.claims', '', true);
end;
$$;
