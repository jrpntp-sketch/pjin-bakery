/**
 * รัน migration + เทสต์ทั้งหมดกับ Postgres จริงในเครื่อง
 *   cd db-test && npm install && npm test
 */
import { spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const PORT = 55432;
const BIN = join(here, "node_modules/@embedded-postgres/darwin-arm64/native/bin");

if (!existsSync(join(BIN, "postgres"))) {
  console.error("ไม่พบ Postgres binary — รัน `npm install` ใน db-test/ ก่อน");
  console.error("(ถ้าไม่ใช่ macOS arm64 ให้แก้ path BIN ให้ตรง platform)");
  process.exit(1);
}

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { stdio: "inherit", cwd: here, ...opts });

const dataDir = mkdtempSync(join(tmpdir(), "pjin-pg-"));
let server;

function stop() {
  if (server) run(join(BIN, "pg_ctl"), ["-D", dataDir, "-m", "immediate", "stop"], { stdio: "ignore" });
  rmSync(dataDir, { recursive: true, force: true });
}
process.on("exit", stop);
process.on("SIGINT", () => { stop(); process.exit(130); });

console.log("กำลังเตรียม Postgres...");
run(join(BIN, "initdb"), ["-D", dataDir, "-U", "postgres", "--auth=trust", "-E", "UTF8"], { stdio: "ignore" });

// ปิด unix socket เพราะ path ใน temp dir ยาวเกิน 103 ไบต์
const start = run(join(BIN, "pg_ctl"), [
  "-D", dataDir,
  "-o", `-p ${PORT} -c unix_socket_directories= -c listen_addresses=127.0.0.1`,
  "-w", "start",
], { stdio: "ignore" });
if (start.status !== 0) { console.error("เปิด Postgres ไม่สำเร็จ"); process.exit(1); }
server = true;

const steps = [
  ["migration", ["run-migration.mjs", "supabase-stub.sql", "../supabase/migrations/20260904000000_init.sql"]],
  ["business logic", ["test-logic.mjs"]],
  ["row level security", ["test-rls.mjs"]],
  ["edge cases", ["test-edge.mjs"]],
];

let failed = 0;
for (const [name, args] of steps) {
  console.log(`\n${"─".repeat(50)}\n▶ ${name}\n${"─".repeat(50)}`);
  if (run(process.execPath, args).status !== 0) failed++;
}

console.log(`\n${"=".repeat(50)}`);
console.log(failed ? `❌ มี ${failed} ชุดที่ไม่ผ่าน` : "✅ ผ่านทั้งหมด");
process.exit(failed ? 1 : 0);
