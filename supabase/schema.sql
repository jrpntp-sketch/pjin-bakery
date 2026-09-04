-- ============================================================
-- Pjin Bakery — Database Schema
-- รันไฟล์นี้ใน Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- ============================================================

-- ---------- helper: updated_at ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- 1. SETTINGS  (ค่าแรง/ชม., ชื่อร้าน, สกุลเงิน)
-- ============================================================
create table if not exists public.settings (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  shop_name     text        not null default 'ร้านขนม',
  currency      text        not null default 'THB',
  hourly_wage   numeric(12,2) not null default 0 check (hourly_wage >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
drop trigger if exists settings_touch on public.settings;
create trigger settings_touch
 before update on public.settings
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 2. PRODUCTS  (สินค้า/สูตรขนม)
-- ============================================================
create table if not exists public.products (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  name                 text not null,
  unit                 text not null default 'ชิ้น',
  base_price           numeric(12,2) not null default 0 check (base_price >= 0),
  low_stock_threshold  integer not null default 5 check (low_stock_threshold >= 0),
  notes                text,
  is_active            boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists products_user_idx on public.products(user_id);
drop trigger if exists products_touch on public.products;
create trigger products_touch
 before update on public.products
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 3. CHANNELS  (ช่องทางขาย + ส่วนแบ่ง)
-- ============================================================
-- share_type: 'none'    = ขายเอง ได้เต็มราคา base
--             'percent' = หักส่วนแบ่ง % จากยอดขาย
--             'fixed'   = ใช้ราคาขายคงที่ต่างจาก base (ไม่หัก %)
create table if not exists public.channels (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  name                     text not null,
  share_type               text not null default 'none'
                             check (share_type in ('none','percent','fixed')),
  share_percent            numeric(5,2) not null default 0
                             check (share_percent >= 0 and share_percent <= 100),
  fixed_price              numeric(12,2) not null default 0 check (fixed_price >= 0),
  shipping_cost_per_trip   numeric(12,2) not null default 0 check (shipping_cost_per_trip >= 0),
  is_active                boolean not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists channels_user_idx on public.channels(user_id);
drop trigger if exists channels_touch on public.channels;
create trigger channels_touch
 before update on public.channels
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 4. BATCHES  (รอบผลิต)  — หัวใจของการคิดต้นทุนจริง
-- ============================================================
-- hourly_wage_snapshot: เก็บค่าแรง ณ วันที่บันทึก เพื่อไม่ให้ต้นทุนย้อนหลัง
--                       เปลี่ยนตามเมื่อผู้ใช้ปรับค่าแรงในอนาคต
create table if not exists public.batches (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  product_id            uuid not null references public.products(id) on delete cascade,
  produced_on           date not null default current_date,
  qty_produced          numeric(12,2) not null check (qty_produced > 0),
  hours_spent           numeric(8,2) not null default 0 check (hours_spent >= 0),
  hourly_wage_snapshot  numeric(12,2) not null default 0 check (hourly_wage_snapshot >= 0),
  material_cost         numeric(12,2) not null default 0 check (material_cost >= 0),
  overhead_cost         numeric(12,2) not null default 0 check (overhead_cost >= 0),
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),

  -- คำนวณอัตโนมัติในระดับฐานข้อมูล (generated columns)
  labor_cost    numeric(12,2) generated always as (hours_spent * hourly_wage_snapshot) stored,
  total_cost    numeric(12,2) generated always as
                  (material_cost + overhead_cost + hours_spent * hourly_wage_snapshot) stored,
  cost_per_unit numeric(12,4) generated always as
                  ((material_cost + overhead_cost + hours_spent * hourly_wage_snapshot)
                    / nullif(qty_produced,0)) stored,
  material_cost_per_unit numeric(12,4) generated always as
                  (material_cost / nullif(qty_produced,0)) stored
);
create index if not exists batches_user_idx    on public.batches(user_id);
create index if not exists batches_product_idx on public.batches(product_id);
create index if not exists batches_date_idx    on public.batches(produced_on);
drop trigger if exists batches_touch on public.batches;
create trigger batches_touch
 before update on public.batches
  for each row execute function public.touch_updated_at();

-- ---------- 4b. BATCH MATERIALS (รายการวัตถุดิบทีละอย่าง — ไม่บังคับ) ----------
-- ถ้ากรอกรายการย่อย ระบบจะ sync ยอดรวมกลับไปที่ batches.material_cost ให้เอง
create table if not exists public.batch_materials (
  id         uuid primary key default gen_random_uuid(),
  batch_id   uuid not null references public.batches(id) on delete cascade,
  name       text not null,
  cost       numeric(12,2) not null default 0 check (cost >= 0),
  created_at timestamptz not null default now()
);
create index if not exists batch_materials_batch_idx on public.batch_materials(batch_id);

create or replace function public.sync_batch_material_cost()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  target uuid := coalesce(new.batch_id, old.batch_id);
  total  numeric(12,2);
begin
  select coalesce(sum(cost),0) into total from public.batch_materials where batch_id = target;
  update public.batches set material_cost = total where id = target;
  return null;
end $$;

drop trigger if exists batch_materials_sync on public.batch_materials;
create trigger batch_materials_sync
  after insert or update or delete on public.batch_materials
  for each row execute function public.sync_batch_material_cost();

-- ============================================================
-- 5. TRANSACTIONS  (ขาย/ฝากขาย)
-- ============================================================
-- ต้นทุนถูก "snapshot" ตอนบันทึก โดยใช้ค่าเฉลี่ยถ่วงน้ำหนักจากรอบผลิตทั้งหมด
-- ของสินค้านั้น ณ เวลานั้น -> กำไรย้อนหลังไม่เปลี่ยนเมื่อมีรอบผลิตใหม่เข้ามา
create table if not exists public.transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  product_id          uuid not null references public.products(id) on delete restrict,
  channel_id          uuid not null references public.channels(id) on delete restrict,
  sold_on             date not null default current_date,
  qty                 numeric(12,2) not null check (qty > 0),
  unit_price          numeric(12,2) not null check (unit_price >= 0),
  delivery_cost       numeric(12,2) not null default 0 check (delivery_cost >= 0),
  -- snapshots
  unit_full_cost      numeric(12,4) not null default 0 check (unit_full_cost >= 0),
  unit_material_cost  numeric(12,4) not null default 0 check (unit_material_cost >= 0),
  channel_share       numeric(12,2) not null default 0 check (channel_share >= 0),
  notes               text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  revenue      numeric(12,2) generated always as (qty * unit_price) stored,
  -- กำไรขั้นต้น = ยอดขาย − ต้นทุนวัตถุดิบ (ไม่รวมแรง/แฝง/ส่วนแบ่ง)
  gross_profit numeric(12,2) generated always as
                 (qty * unit_price - qty * unit_material_cost) stored,
  -- กำไรสุทธิ = ยอดขาย − ต้นทุนจริงต่อชิ้น − ส่วนแบ่งช่องทาง − ค่าส่ง
  net_profit   numeric(12,2) generated always as
                 (qty * unit_price - qty * unit_full_cost - channel_share - delivery_cost) stored
);
create index if not exists transactions_user_idx    on public.transactions(user_id);
create index if not exists transactions_product_idx on public.transactions(product_id);
create index if not exists transactions_channel_idx on public.transactions(channel_id);
create index if not exists transactions_date_idx    on public.transactions(sold_on);
drop trigger if exists transactions_touch on public.transactions;
create trigger transactions_touch
 before update on public.transactions
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 6. EXPENSES  (รายจ่ายอื่นที่ไม่ผูกกับรอบผลิต)
-- ============================================================
create table if not exists public.expenses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  category   text not null default 'อื่นๆ',
  amount     numeric(12,2) not null check (amount >= 0),
  spent_on   date not null default current_date,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists expenses_user_idx on public.expenses(user_id);
create index if not exists expenses_date_idx on public.expenses(spent_on);
drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch
 before update on public.expenses
  for each row execute function public.touch_updated_at();

-- ============================================================
-- 7. VIEWS  (สต๊อก + ต้นทุนเฉลี่ย)
-- ============================================================

-- สต๊อกคงเหลือ = ผลิตมาทั้งหมด − ขายไปทั้งหมด (คำนวณสด ไม่มีทาง drift)
create or replace view public.product_stock
with (security_invoker = true) as
select
  p.id                                              as product_id,
  p.user_id,
  p.name,
  p.unit,
  p.base_price,
  p.low_stock_threshold,
  p.is_active,
  coalesce(b.produced, 0)                           as total_produced,
  coalesce(t.sold, 0)                               as total_sold,
  coalesce(b.produced, 0) - coalesce(t.sold, 0)     as stock_qty,
  -- ต้นทุนเฉลี่ยถ่วงน้ำหนักจากทุกรอบผลิต
  case when coalesce(b.produced,0) > 0
       then b.total_cost / b.produced else 0 end    as avg_cost_per_unit,
  case when coalesce(b.produced,0) > 0
       then b.material_cost / b.produced else 0 end as avg_material_cost_per_unit,
  b.last_produced_on
from public.products p
left join (
  select product_id,
         sum(qty_produced)  as produced,
         sum(total_cost)    as total_cost,
         sum(material_cost) as material_cost,
         max(produced_on)   as last_produced_on
  from public.batches group by product_id
) b on b.product_id = p.id
left join (
  select product_id, sum(qty) as sold
  from public.transactions group by product_id
) t on t.product_id = p.id;

-- ธุรกรรมพร้อมชื่อสินค้า/ช่องทาง (ใช้ในหน้ารายงาน)
create or replace view public.transaction_details
with (security_invoker = true) as
select
  t.*,
  p.name as product_name,
  p.unit as product_unit,
  c.name as channel_name
from public.transactions t
join public.products p on p.id = t.product_id
join public.channels c on c.id = t.channel_id;

-- ============================================================
-- 8. ROW LEVEL SECURITY
--    ทุกตารางเห็นเฉพาะข้อมูลของตัวเอง (single-tenant ปลอดภัยโดย default)
-- ============================================================
alter table public.settings        enable row level security;
alter table public.products        enable row level security;
alter table public.channels        enable row level security;
alter table public.batches         enable row level security;
alter table public.batch_materials enable row level security;
alter table public.transactions    enable row level security;
alter table public.expenses        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['settings','products','channels','batches','transactions','expenses']
  loop
    execute format('drop policy if exists %I_own on public.%I', t, t);
    execute format(
      'create policy %I_own on public.%I for all
         using (user_id = (select auth.uid()))
         with check (user_id = (select auth.uid()))', t, t);
  end loop;
end $$;

-- batch_materials ไม่มี user_id ของตัวเอง -> เช็คผ่าน batch แม่
drop policy if exists batch_materials_own on public.batch_materials;
create policy batch_materials_own on public.batch_materials for all
  using (exists (
    select 1 from public.batches b
    where b.id = batch_materials.batch_id and b.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.batches b
    where b.id = batch_materials.batch_id and b.user_id = (select auth.uid())));

-- ============================================================
-- 9. สร้าง settings + ช่องทาง "ขายเอง" อัตโนมัติเมื่อสมัครสมาชิกใหม่
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.settings (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into public.channels (user_id, name, share_type)
    values (new.id, 'ขายเอง', 'none');
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
