-- =====================================================================
-- Southern Inspection Readiness — โครงสร้างฐานข้อมูล + Row Level Security
-- รันใน Supabase SQL Editor ตามลำดับ: 0001 → 0002
-- =====================================================================

-- ---------- หน่วยงาน ----------
create table if not exists public.units (
  code text primary key check (code in ('SURAT','SONGKHLA','KRABI','YALA')),
  name text not null,
  short text not null,
  abbr text not null,
  sort int not null default 0
);

-- ---------- ผู้ใช้ (ผูกกับ auth.users) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text not null default '',
  role text not null default 'executive' check (role in ('admin','unit_officer','executive')),
  unit_code text references public.units(code),
  created_at timestamptz not null default now(),
  constraint officer_has_unit check (role <> 'unit_officer' or unit_code is not null)
);

-- สร้างโปรไฟล์อัตโนมัติเมื่อมีผู้ใช้ใหม่ (บทบาทเริ่มต้น = ดูอย่างเดียว)
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ฟังก์ชันช่วยตรวจสิทธิ์ (security definer เพื่อไม่ให้ RLS ของ profiles วนซ้ำ)
create or replace function public.app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;
create or replace function public.app_unit() returns text
language sql stable security definer set search_path = public as $$
  select unit_code from public.profiles where id = auth.uid()
$$;

-- ---------- แผน ----------
create table if not exists public.rounds (
  id int primary key,
  month text not null,
  target text not null,
  commodity text not null,
  -- จำนวนรวมตาม "หัวตาราง" ของเอกสารต้นฉบับ (null = ไม่มีคอลัมน์นี้)
  header_staff int,
  header_crane int,
  header_pickup int
);

create table if not exists public.plan_days (
  round_id int not null references public.rounds(id) on delete cascade,
  date date not null,
  province text not null,
  note text,
  primary key (round_id, date)
);

-- จำนวนต่อวันรายหน่วยงาน ตาม "รายละเอียด" ในเอกสารต้นฉบับ
create table if not exists public.plan_allocations (
  round_id int not null references public.rounds(id) on delete cascade,
  unit_code text not null references public.units(code),
  staff int not null default 0 check (staff >= 0),
  crane int not null default 0 check (crane >= 0),
  pickup int not null default 0 check (pickup >= 0),
  primary key (round_id, unit_code)
);

-- ประเด็นที่ข้อมูลต้นฉบับขัดแย้ง/อ่านไม่ชัด (เช่น รถกระบะรอบ 4)
create table if not exists public.plan_issues (
  id text primary key,
  round_id int not null references public.rounds(id) on delete cascade,
  resource text check (resource in ('staff','crane','pickup')),
  title text not null,
  detail text not null,
  source_values jsonb,
  blocking boolean not null default false,
  status text not null default 'open' check (status in ('open','resolved')),
  resolution text,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolved_by_name text
);

-- ---------- ข้อมูลที่หน่วยงานส่ง ----------
create table if not exists public.responses (
  round_id int not null references public.rounds(id) on delete cascade,
  unit_code text not null references public.units(code),
  status text not null default 'draft' check (status in ('draft','submitted')),
  cannot_participate boolean not null default false,
  coordinator_name text not null default '',
  coordinator_phone text not null default '',
  notes text not null default '',
  problems text not null default '',
  constraint_unresolved boolean not null default false,
  needs_support boolean not null default false,
  support_staff int not null default 0 check (support_staff >= 0),
  support_crane int not null default 0 check (support_crane >= 0),
  support_pickup int not null default 0 check (support_pickup >= 0),
  support_detail text not null default '',
  -- [{date, available, staff, crane, pickup}] ค่า null = ยังไม่กรอก
  days jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_by_name text,
  submitted_at timestamptz,
  primary key (round_id, unit_code)
);

-- ประวัติการบันทึก/ส่ง (เขียนโดย trigger เท่านั้น ผู้ใช้แก้ไขไม่ได้)
create table if not exists public.response_history (
  id bigint generated always as identity primary key,
  round_id int not null,
  unit_code text not null,
  action text not null check (action in ('draft','submit')),
  snapshot jsonb not null,
  at timestamptz not null default now(),
  by uuid,
  by_name text
);
create index if not exists response_history_idx on public.response_history (round_id, unit_code, at desc);

-- ตั้งค่าเวลา/ผู้แก้ไขฝั่งเซิร์ฟเวอร์ และบันทึกประวัติ
create or replace function public.responses_before() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  new.updated_by_name := coalesce(
    (select nullif(display_name, '') from public.profiles where id = auth.uid()),
    new.updated_by_name);
  if new.status = 'submitted' then
    new.submitted_at := now();
  elsif tg_op = 'UPDATE' then
    new.submitted_at := old.submitted_at;
  end if;
  return new;
end $$;
drop trigger if exists responses_before on public.responses;
create trigger responses_before before insert or update on public.responses
  for each row execute function public.responses_before();

create or replace function public.responses_after() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.response_history (round_id, unit_code, action, snapshot, by, by_name)
  values (new.round_id, new.unit_code, case when new.status = 'submitted' then 'submit' else 'draft' end,
          to_jsonb(new), auth.uid(), new.updated_by_name);
  return new;
end $$;
drop trigger if exists responses_after on public.responses;
create trigger responses_after after insert or update on public.responses
  for each row execute function public.responses_after();

-- มุมมองรายวัน (สำหรับทำรายงานด้วย SQL)
create or replace view public.v_response_days with (security_invoker = true) as
select r.round_id, r.unit_code, r.status, r.cannot_participate,
       (d->>'date')::date as date,
       coalesce((d->>'available')::boolean, false) as available,
       (d->>'staff')::int as staff, (d->>'crane')::int as crane, (d->>'pickup')::int as pickup
from public.responses r, jsonb_array_elements(r.days) d;

-- ---------- ข้อสรุปที่ประชุม (แยกจากข้อมูลหน่วยงาน) ----------
create table if not exists public.meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  round_id int not null references public.rounds(id) on delete cascade,
  topic text not null default '',
  decision text not null,
  allocation text not null default '',
  owner text not null default '',
  due_date date,
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid() references auth.users(id),
  created_by_name text
);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.units enable row level security;
alter table public.profiles enable row level security;
alter table public.rounds enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_allocations enable row level security;
alter table public.plan_issues enable row level security;
alter table public.responses enable row level security;
alter table public.response_history enable row level security;
alter table public.meeting_decisions enable row level security;

-- อ่านได้ทุกคนที่เข้าสู่ระบบ / เขียนได้เฉพาะ admin
do $$
declare t text;
begin
  foreach t in array array['units','rounds','plan_days','plan_allocations','plan_issues','meeting_decisions'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$I', t);
    execute format('create policy "%1$s_read" on public.%1$I for select to authenticated using (true)', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$I', t);
    execute format('create policy "%1$s_admin_write" on public.%1$I for all to authenticated using (public.app_role() = ''admin'') with check (public.app_role() = ''admin'')', t);
  end loop;
end $$;

-- profiles: เห็นของตนเอง (admin เห็นทั้งหมด); แก้บทบาท/หน่วยงานได้เฉพาะ admin
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.app_role() = 'admin');
drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles for update to authenticated
  using (public.app_role() = 'admin') with check (public.app_role() = 'admin');

-- responses: ทุกคนอ่านได้ (เพื่อแสดงแดชบอร์ด)
-- เขียนได้เฉพาะ admin หรือเจ้าหน้าที่ของหน่วยงานนั้นเอง
drop policy if exists responses_read on public.responses;
create policy responses_read on public.responses for select to authenticated using (true);
drop policy if exists responses_insert on public.responses;
create policy responses_insert on public.responses for insert to authenticated
  with check (public.app_role() = 'admin' or (public.app_role() = 'unit_officer' and unit_code = public.app_unit()));
drop policy if exists responses_update on public.responses;
create policy responses_update on public.responses for update to authenticated
  using (public.app_role() = 'admin' or (public.app_role() = 'unit_officer' and unit_code = public.app_unit()))
  with check (public.app_role() = 'admin' or (public.app_role() = 'unit_officer' and unit_code = public.app_unit()));
drop policy if exists responses_delete on public.responses;
create policy responses_delete on public.responses for delete to authenticated using (public.app_role() = 'admin');

-- history: อ่านได้ ไม่มี policy insert/update/delete (trigger เขียนให้)
drop policy if exists history_read on public.response_history;
create policy history_read on public.response_history for select to authenticated using (true);

-- Realtime: อัปเดตแดชบอร์ดอัตโนมัติ
do $$ begin
  alter publication supabase_realtime add table public.responses, public.meeting_decisions, public.plan_issues, public.plan_allocations;
exception when duplicate_object then null; when undefined_object then null;
end $$;
