import pg from "pg";
const c = new pg.Client({ host:"127.0.0.1", port:55432, user:"postgres", database:"postgres" });
await c.connect();
const q = (s,p) => c.query(s,p).then(r => r.rows);
let pass=0, fail=0;
const check=(l,got,want)=>{const ok=got===want;console.log(`${ok?"PASS":"FAIL"}  ${l}: ${got}${ok?"":`  (คาด ${want})`}`);ok?pass++:fail++;};

// ให้สิทธิ์ role authenticated แบบเดียวกับที่ Supabase ตั้งไว้
await q("grant usage on schema public to authenticated");
await q("grant select,insert,update,delete on all tables in schema public to authenticated");

// user A มีข้อมูลอยู่แล้วจากเทสต์ก่อนหน้า
const [a] = await q("select id from auth.users where email='owner@test.com'");
const [b] = await q("insert into auth.users(email) values('stranger@test.com') returning id");

console.log("=== สวมบทเป็น user B แล้วพยายามดูข้อมูลของ A ===");
await q("set role authenticated");
await q("select set_config('test.user_id',$1,false)",[b.id]);

check("เห็นสินค้าของ A กี่แถว", (await q("select * from products")).length, 0);
check("เห็นรอบผลิตของ A กี่แถว", (await q("select * from batches")).length, 0);
check("เห็นช่องทางของ A กี่แถว", (await q("select * from channels where user_id=$1",[a.id])).length, 0);
check("เห็น view สต๊อกของ A กี่แถว", (await q("select * from product_stock")).length, 0);
check("เห็น view ธุรกรรมของ A กี่แถว", (await q("select * from transaction_details")).length, 0);
check("เห็น settings ของ A กี่แถว", (await q("select * from settings where user_id=$1",[a.id])).length, 0);

// พยายามยัดข้อมูลใส่บัญชีคนอื่น
console.log("\n=== พยายามเขียนข้อมูลใส่บัญชีของ A ===");
try {
  await q("insert into products(user_id,name,base_price) values($1,'แอบใส่',1)",[a.id]);
  check("insert ใส่ user_id ของ A","สำเร็จ (อันตราย!)","ถูกบล็อก");
} catch(e){ check("insert ใส่ user_id ของ A","ถูกบล็อก","ถูกบล็อก"); }

// พยายามแก้ข้อมูลของ A
const upd = await c.query("update products set name='โดนแฮก' where user_id=$1",[a.id]);
check("update ข้อมูลของ A แก้ได้กี่แถว", upd.rowCount, 0);
const del = await c.query("delete from products where user_id=$1",[a.id]);
check("delete ข้อมูลของ A ลบได้กี่แถว", del.rowCount, 0);

// B เขียนข้อมูลของตัวเองต้องได้ปกติ
console.log("\n=== B เขียนข้อมูลของตัวเอง (ต้องทำได้) ===");
await q("insert into products(user_id,name,base_price) values($1,'คุกกี้ของ B',30)",[b.id]);
check("B เห็นสินค้าตัวเอง", (await q("select * from products")).length, 1);

// กลับมาเป็น A ต้องเห็นของตัวเองครบ
await q("select set_config('test.user_id',$1,false)",[a.id]);
console.log("\n=== กลับมาเป็น A ===");
check("A เห็นสินค้าตัวเอง", (await q("select * from products")).length, 1);
check("A เห็นชื่อเดิม ไม่ถูกแก้", (await q("select name from products"))[0].name, "บราวนี่หน้ากรอบ");
check("A เห็นสต๊อกตัวเอง", (await q("select * from product_stock")).length, 1);

await q("reset role");
await c.end();
console.log(`\n${"=".repeat(40)}\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail?1:0);
