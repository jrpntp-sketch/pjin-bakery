import pg from "pg";
import { readFileSync } from "node:fs";

const c = new pg.Client({ host: "127.0.0.1", port: 55432, user: "postgres", database: "postgres" });
await c.connect();

const files = [
  ["stub  ", process.argv[2]],
  ["migration", process.argv[3]],
];

for (const [label, path] of files) {
  const sql = readFileSync(path, "utf8");
  try {
    await c.query(sql);
    console.log(`PASS  ${label}: รันผ่าน`);
  } catch (e) {
    console.log(`FAIL  ${label}: ${e.message}`);
    if (e.position) {
      const pos = Number(e.position);
      console.log("      รอบๆ ตำแหน่งที่ผิด:");
      console.log("      " + sql.slice(Math.max(0, pos - 160), pos + 160).replace(/\n/g, "\n      "));
    }
    await c.end();
    process.exit(1);
  }
}

// รันซ้ำอีกรอบ พิสูจน์ว่า idempotent จริง
try {
  await c.query(readFileSync(process.argv[3], "utf8"));
  console.log("PASS  รันซ้ำรอบสอง: ไม่ error (idempotent จริง)");
} catch (e) {
  console.log(`FAIL  รันซ้ำรอบสอง: ${e.message}`);
  process.exitCode = 1;
}

const { rows: tables } = await c.query(
  `select table_name from information_schema.tables
   where table_schema='public' order by table_name`);
console.log("\nตาราง/view ที่สร้าง:", tables.map(t => t.table_name).join(", "));

await c.end();
