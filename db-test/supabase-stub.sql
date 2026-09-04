-- จำลองสิ่งที่ Supabase มีให้อยู่แล้ว เพื่อให้ migration รันได้บน Postgres เปล่า
create schema if not exists auth;

create table if not exists auth.users (
  id    uuid primary key default gen_random_uuid(),
  email text unique
);

-- auth.uid() ปกติอ่านจาก JWT — ในเทสต์ให้อ่านจาก session variable แทน
create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('test.user_id', true), '')::uuid;
$$;

-- role ที่ Supabase สร้างไว้ให้ (RLS policy อ้างถึงโดยอ้อม)
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end $$;
