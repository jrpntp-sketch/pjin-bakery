import pg from "pg";
const c = new pg.Client({ host:"127.0.0.1", port:55432, user:"postgres", database:"postgres" });
await c.connect();
const q=(s,p)=>c.query(s,p).then(r=>r.rows);
let pass=0,fail=0;
const check=(l,got,want,tol=0.005)=>{const ok=typeof want==="number"?Math.abs(Number(got)-want)<tol:got===want;
  console.log(`${ok?"PASS":"FAIL"}  ${l}: ${got}${ok?"":`  (คาด ${want})`}`);ok?pass++:fail++;};

await q("delete from auth.users");
const [u]=await q("insert into auth.users(email) values('t@t.com') returning id");
const uid=u.id;
const [p]=await q("insert into products(user_id,name,base_price) values($1,'ขนม',50) returning id",[uid]);
const [ch]=await q("select id from channels where user_id=$1",[uid]);

// ---------- 1. ต้นทุนเฉลี่ยถ่วงน้ำหนักข้ามหลายรอบผลิต ----------
// รอบ 1: 10 ชิ้น ต้นทุนรวม 200 -> 20/ชิ้น
// รอบ 2: 30 ชิ้น ต้นทุนรวม 300 -> 10/ชิ้น
// เฉลี่ยถ่วงน้ำหนัก = 500/40 = 12.5  (ไม่ใช่ (20+10)/2 = 15)
await q(`insert into batches(user_id,product_id,qty_produced,material_cost) values($1,$2,10,200)`,[uid,p.id]);
await q(`insert into batches(user_id,product_id,qty_produced,material_cost) values($1,$2,30,300)`,[uid,p.id]);
const [s]=await q("select * from product_stock where product_id=$1",[p.id]);
console.log("=== 1. ต้นทุนเฉลี่ยข้ามหลายรอบผลิต ===");
check("ถ่วงน้ำหนักถูก (500÷40)", s.avg_cost_per_unit, 12.5);
console.log("      ถ้าเฉลี่ยแบบผิด (20+10)÷2 จะได้ 15 — ต่างกัน 20%");
check("สต๊อกรวม 2 รอบ", s.stock_qty, 40);

// ---------- 2. on delete restrict: ลบสินค้าที่มีรายการขายไม่ได้ ----------
await q(`insert into transactions(user_id,product_id,channel_id,qty,unit_price,unit_full_cost,unit_material_cost)
         values($1,$2,$3,5,50,12.5,12.5)`,[uid,p.id,ch.id]);
console.log("\n=== 2. ลบสินค้าที่มีประวัติขาย (แอปต้องเปลี่ยนไปปิดใช้งานแทน) ===");
try{ await q("delete from products where id=$1",[p.id]); check("ลบสินค้าที่มีรายการขาย","สำเร็จ (ผิด!)","ถูกบล็อก"); }
catch(e){ check("ลบสินค้าที่มีรายการขาย","ถูกบล็อก","ถูกบล็อก"); }

// ---------- 3. ลบรอบผลิต -> วัตถุดิบย่อยหายตาม (cascade) ----------
const [b]=await q("insert into batches(user_id,product_id,qty_produced,material_cost) values($1,$2,5,50) returning id",[uid,p.id]);
await q("insert into batch_materials(batch_id,name,cost) values($1,'น้ำตาล',50)",[b.id]);
await q("delete from batches where id=$1",[b.id]);
console.log("\n=== 3. ลบรอบผลิต ===");
check("วัตถุดิบย่อยถูกลบตาม", (await q("select * from batch_materials where batch_id=$1",[b.id])).length, 0);

// ---------- 4. constraint กันข้อมูลพัง ----------
console.log("\n=== 4. constraint กันข้อมูลพัง ===");
try{ await q("insert into batches(user_id,product_id,qty_produced) values($1,$2,0)",[uid,p.id]);
     check("ผลิตได้ 0 ชิ้น (หารศูนย์)","ผ่านไปได้ (ผิด!)","ถูกบล็อก"); }
catch(e){ check("ผลิตได้ 0 ชิ้น (หารศูนย์)","ถูกบล็อก","ถูกบล็อก"); }
try{ await q("insert into channels(user_id,name,share_type,share_percent) values($1,'x','percent',150)",[uid]);
     check("ส่วนแบ่ง 150%","ผ่านไปได้ (ผิด!)","ถูกบล็อก"); }
catch(e){ check("ส่วนแบ่ง 150%","ถูกบล็อก","ถูกบล็อก"); }
try{ await q("insert into channels(user_id,name,share_type) values($1,'x','ไม่มีประเภทนี้')",[uid]);
     check("ประเภทช่องทางมั่ว","ผ่านไปได้ (ผิด!)","ถูกบล็อก"); }
catch(e){ check("ประเภทช่องทางมั่ว","ถูกบล็อก","ถูกบล็อก"); }

// ---------- 5. ลบบัญชี -> ข้อมูลหายหมด ----------
await q("delete from auth.users where id=$1",[uid]);
console.log("\n=== 5. ลบบัญชี ข้อมูลต้องหายตาม ===");
check("สินค้าที่เหลือ", (await q("select * from products")).length, 0);
check("รอบผลิตที่เหลือ", (await q("select * from batches")).length, 0);
check("settings ที่เหลือ", (await q("select * from settings")).length, 0);

await c.end();
console.log(`\n${"=".repeat(40)}\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail?1:0);
