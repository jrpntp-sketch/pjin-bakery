import pg from "pg";
const c = new pg.Client({ host:"127.0.0.1", port:55432, user:"postgres", database:"postgres" });
await c.connect();
const q = (s, p) => c.query(s, p).then(r => r.rows);
const n = (v) => Number(v);

let pass = 0, fail = 0;
const check = (label, got, want, tol = 0.005) => {
  const ok = typeof want === "number" ? Math.abs(n(got) - want) < tol : got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${got}${ok ? "" : `  (คาด ${want})`}`);
  ok ? pass++ : fail++;
};

// ล้างข้อมูลเก่า
await q("delete from auth.users");

// ---------- 1. สมัครสมาชิก -> trigger สร้าง settings + ช่องทางให้อัตโนมัติ ----------
const [u] = await q("insert into auth.users(email) values('owner@test.com') returning id");
const uid = u.id;
const settings = await q("select * from settings where user_id=$1", [uid]);
const chans = await q("select * from channels where user_id=$1", [uid]);
console.log("\n=== 1. trigger ตอนสมัครสมาชิก ===");
check("สร้าง settings ให้อัตโนมัติ", settings.length, 1);
check("สร้างช่องทางตั้งต้น", chans[0]?.name, "ขายเอง");

// ตั้งค่าแรง 150/ชม.
await q("update settings set hourly_wage=150 where user_id=$1", [uid]);

// ---------- 2. รอบผลิต: generated columns ----------
const [p] = await q(
  `insert into products(user_id,name,unit,base_price,low_stock_threshold)
   values($1,'บราวนี่หน้ากรอบ','ชิ้น',60,5) returning id`, [uid]);
const [b] = await q(
  `insert into batches(user_id,product_id,qty_produced,hours_spent,
     hourly_wage_snapshot,material_cost,overhead_cost)
   values($1,$2,24,3.5,150,380,120) returning *`, [uid, p.id]);

console.log("\n=== 2. รอบผลิต — ระบบคำนวณเอง ===");
check("ค่าแรง (3.5ชม.×150)", b.labor_cost, 525);
check("ต้นทุนรวมทั้งรอบ", b.total_cost, 1025);
check("ต้นทุนจริง/ชิ้น", b.cost_per_unit, 42.7083);
check("ต้นทุนวัตถุดิบ/ชิ้น", b.material_cost_per_unit, 15.8333);

// ---------- 3. trigger sync วัตถุดิบย่อย ----------
await q(`insert into batch_materials(batch_id,name,cost) values
  ($1,'แป้ง',120),($1,'เนย',180),($1,'ช็อกโกแลต',150)`, [b.id]);
const [b2] = await q("select * from batches where id=$1", [b.id]);
console.log("\n=== 3. trigger รวมยอดวัตถุดิบย่อย ===");
check("material_cost sync จาก 3 รายการ", b2.material_cost, 450);
check("ต้นทุน/ชิ้น คำนวณใหม่ตาม", b2.cost_per_unit, (450+525+120)/24);

// ลบรายการหนึ่งออก ยอดต้องลดตาม
await q("delete from batch_materials where batch_id=$1 and name='ช็อกโกแลต'", [b.id]);
const [b3] = await q("select material_cost from batches where id=$1", [b.id]);
check("ลบวัตถุดิบแล้วยอดลดตาม", b3.material_cost, 300);

// คืนค่าเดิมเพื่อทดสอบต่อ (ลบรายการย่อยทั้งหมด แล้วตั้งยอดรวมเอง)
await q("delete from batch_materials where batch_id=$1", [b.id]);
await q("update batches set material_cost=380 where id=$1", [b.id]);

// ---------- 4. view product_stock ----------
const [s1] = await q("select * from product_stock where product_id=$1", [p.id]);
console.log("\n=== 4. view สต๊อก + ต้นทุนเฉลี่ย ===");
check("ผลิตแล้ว", s1.total_produced, 24);
check("สต๊อกคงเหลือ (ยังไม่ขาย)", s1.stock_qty, 24);
check("ต้นทุนเฉลี่ย/ชิ้น", s1.avg_cost_per_unit, 42.7083);

// ---------- 5. ขายผ่านช่องทางหัก 30% ----------
const [shop] = await q(
  `insert into channels(user_id,name,share_type,share_percent,shipping_cost_per_trip)
   values($1,'ฝากร้านกาแฟ','percent',30,50) returning id`, [uid]);
const [t] = await q(
  `insert into transactions(user_id,product_id,channel_id,qty,unit_price,
     delivery_cost,unit_full_cost,unit_material_cost,channel_share)
   values($1,$2,$3,10,60,50,42.7083,15.8333,180) returning *`, [uid, p.id, shop.id]);

console.log("\n=== 5. ขาย 10 ชิ้น @60 ฝากร้านหัก 30% ค่าส่ง 50 ===");
check("ยอดขาย", t.revenue, 600);
check("กำไรขั้นต้น", t.gross_profit, 441.67);
check("กำไรสุทธิ", t.net_profit, -57.08);
console.log("      ^ ขั้นต้นดูบวก แต่สุทธิติดลบ — จุดที่แอปนี้มีไว้เพื่อบอก");

// ---------- 6. สต๊อกตัดอัตโนมัติ ----------
const [s2] = await q("select * from product_stock where product_id=$1", [p.id]);
console.log("\n=== 6. สต๊อกหลังขาย ===");
check("ขายไปแล้ว", s2.total_sold, 10);
check("สต๊อกเหลือ (24−10)", s2.stock_qty, 14);

// ลบรายการขาย -> สต๊อกต้องคืน
await q("delete from transactions where id=$1", [t.id]);
const [s3] = await q("select stock_qty from product_stock where product_id=$1", [p.id]);
check("ลบรายการขายแล้วสต๊อกคืน", s3.stock_qty, 24);

await c.end();
console.log(`\n${"=".repeat(40)}\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
