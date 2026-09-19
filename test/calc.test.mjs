/**
 * พิสูจน์ว่าสูตรที่ย้ายจาก Postgres มาเป็น TypeScript ให้ผลเท่าเดิมเป๊ะ
 * ตัวเลขคาดหวังทุกตัวคือค่าที่ Postgres 18 จริงคืนมาในชุดทดสอบเดิม 41 เคส
 *   node --experimental-strip-types test/calc.test.mjs
 */
import {
  computeBatch, computeTransaction, computeStock,
  unitPriceFor, channelShareFor, sumTotals, groupTotals, round4,
} from "../src/lib/calc.ts";

let pass = 0, fail = 0;
const check = (label, got, want, tol = 0.0001) => {
  const ok = typeof want === "number" ? Math.abs(got - want) < tol : got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}: ${got}${ok ? "" : `  (คาด ${want})`}`);
  ok ? pass++ : fail++;
};

// ---------- รอบผลิต: 24 ชิ้น · วัตถุดิบ 380 · 3.5ชม.×150 · แฝง 120 ----------
const batch = {
  id: "b1", productId: "p1", producedOn: "2026-09-04",
  qtyProduced: 24, hoursSpent: 3.5, hourlyWageSnapshot: 150,
  materialCost: 380, overheadCost: 120, createdAt: "",
};
const cb = computeBatch(batch);
console.log("=== 1. รอบผลิต (ตรงกับที่ Postgres คืนมา) ===");
check("ค่าแรง", cb.laborCost, 525);
check("ต้นทุนรวม", cb.totalCost, 1025);
check("ต้นทุนจริง/ชิ้น", round4(cb.costPerUnit), 42.7083);
check("ต้นทุนวัตถุดิบ/ชิ้น", round4(cb.materialCostPerUnit), 15.8333);

// ---------- ขาย 10 ชิ้น @60 ฝากร้านหัก 30% ค่าส่ง 50 ----------
const channel = {
  id: "c1", name: "ฝากร้านกาแฟ", shareType: "percent",
  sharePercent: 30, fixedPrice: 0, shippingCostPerTrip: 50,
  isActive: true, createdAt: "",
};
const price = unitPriceFor(channel, 60);
const share = channelShareFor(channel, price, 10);
check("ราคาขาย/หน่วย", price, 60);
check("ส่วนแบ่งช่องทาง", share, 180);

const ct = computeTransaction({
  id: "t1", productId: "p1", channelId: "c1", soldOn: "2026-09-04",
  qty: 10, unitPrice: 60, deliveryCost: 50,
  unitFullCost: 42.7083, unitMaterialCost: 15.8333,
  channelShare: share, createdAt: "",
});
console.log("\n=== 2. รายการขาย ===");
check("ยอดขาย", ct.revenue, 600);
check("กำไรขั้นต้น", ct.grossProfit, 441.67);
check("กำไรสุทธิ", ct.netProfit, -57.08);
console.log("      ^ ขั้นต้นบวก แต่สุทธิติดลบ — ตรงกับผลจาก Postgres");

// ---------- สต๊อก ----------
const product = {
  id: "p1", name: "บราวนี่", unit: "ชิ้น", basePrice: 60,
  lowStockThreshold: 5, isActive: true, createdAt: "",
};
const st = computeStock(product, [batch], [ct]);
console.log("\n=== 3. สต๊อก ===");
check("ผลิตแล้ว", st.totalProduced, 24);
check("ขายไป", st.totalSold, 10);
check("คงเหลือ", st.stockQty, 14);
check("ต้นทุนเฉลี่ย/ชิ้น", round4(st.avgCostPerUnit), 42.7083);

// ---------- ต้นทุนเฉลี่ยถ่วงน้ำหนักข้ามหลายรอบ ----------
// รอบ1: 10 ชิ้น ต้นทุน 200 (20/ชิ้น) · รอบ2: 30 ชิ้น ต้นทุน 300 (10/ชิ้น)
// ถ่วงน้ำหนัก = 500/40 = 12.5  (เฉลี่ยธรรมดาจะได้ 15 ซึ่งผิด)
const mk = (id, qty, mat) => ({
  id, productId: "p1", producedOn: "2026-09-01", qtyProduced: qty,
  hoursSpent: 0, hourlyWageSnapshot: 0, materialCost: mat,
  overheadCost: 0, createdAt: "",
});
const st2 = computeStock(product, [mk("b1", 10, 200), mk("b2", 30, 300)], []);
console.log("\n=== 4. ต้นทุนเฉลี่ยข้ามหลายรอบ ===");
check("ถ่วงน้ำหนักถูก (500÷40)", st2.avgCostPerUnit, 12.5);
console.log("      เฉลี่ยแบบผิด (20+10)÷2 = 15 ต่างกัน 20%");

// ---------- รวมยอด ----------
const totals = sumTotals([ct, ct]);
console.log("\n=== 5. รวมยอดหลายรายการ ===");
check("ยอดขายรวม", totals.revenue, 1200);
check("กำไรสุทธิรวม", totals.net, -114.16);
check("จำนวนรายการ", totals.orders, 2);

const grouped = groupTotals([ct], () => "p1", () => "บราวนี่");
check("จัดกลุ่มตามสินค้า", grouped[0].label, "บราวนี่");

// ---------- เคสขอบ ----------
console.log("\n=== 6. เคสขอบ (กันหารศูนย์) ===");
const zero = computeBatch({ ...batch, qtyProduced: 0 });
check("ผลิต 0 ชิ้น ไม่ระเบิด", zero.costPerUnit, 0);
const noBatch = computeStock(product, [], []);
check("ไม่มีรอบผลิต ต้นทุนเป็น 0", noBatch.avgCostPerUnit, 0);
check("ช่องทางขายเอง ไม่หักส่วนแบ่ง",
  channelShareFor({ ...channel, shareType: "none" }, 60, 10), 0);
check("ช่องทางราคาคงที่ ใช้ราคาช่องทาง",
  unitPriceFor({ ...channel, shareType: "fixed", fixedPrice: 45 }, 60), 45);

console.log(`\n${"=".repeat(45)}\nผ่าน ${pass} · ไม่ผ่าน ${fail}`);
process.exit(fail ? 1 : 0);
