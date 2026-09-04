import { requireUser } from "@/lib/supabase/server";
import { money, monthStartISO, thaiDate, todayISO } from "@/lib/format";
import type { Expense } from "@/lib/types";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { ExpenseForm } from "./expense-form";
import { deleteExpense } from "@/lib/actions/expenses";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const { supabase } = await requireUser();

  const { data } = await supabase
    .from("expenses")
    .select("*")
    .order("spent_on", { ascending: false })
    .limit(100);

  const expenses = (data ?? []) as Expense[];
  const monthStart = monthStartISO();
  const monthTotal = expenses
    .filter((e) => e.spent_on >= monthStart)
    .reduce((s, e) => s + Number(e.amount), 0);
  const allTotal = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <>
      <PageHeader
        title="รายจ่ายอื่น"
        subtitle="ของที่ไม่ผูกกับรอบผลิต เช่น ซื้อเตาใหม่ ค่าสมัครตลาดนัด"
      />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Stat label="รายจ่ายเดือนนี้" value={money(monthTotal)} tone="bad" />
        <Stat
          label="รวมทั้งหมด"
          value={money(allTotal)}
          hint={`${expenses.length} รายการ`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card title="ประวัติรายจ่าย">
          {expenses.length === 0 ? (
            <Empty icon="💸">ยังไม่มีรายจ่ายอื่น</Empty>
          ) : (
            <ul className="divide-y divide-cream-100">
              {expenses.map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-cocoa-700">{e.category}</p>
                    <p className="text-xs text-cocoa-400">
                      {thaiDate(e.spent_on)}
                      {e.note && ` · ${e.note}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="tabular font-semibold text-berry-500">
                      −{money(e.amount)}
                    </span>
                    <form action={deleteExpense}>
                      <input type="hidden" name="id" value={e.id} />
                      <button
                        type="submit"
                        className="rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-berry-500/10 hover:text-berry-500"
                      >
                        ลบ
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="lg:sticky lg:top-5 lg:self-start">
          <ExpenseForm today={todayISO()} />
        </div>
      </div>
    </>
  );
}
