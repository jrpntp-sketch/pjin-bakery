"use client";

import { deleteSale } from "@/lib/actions/sales";

export function DeleteSaleButton({ id }: { id: string }) {
  return (
    <form
      action={deleteSale}
      onSubmit={(e) => {
        if (!confirm("ลบรายการขายนี้? สต๊อกจะถูกคืนกลับ")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="mt-1 rounded-lg px-2 py-1 text-xs font-semibold text-cocoa-400 transition hover:bg-berry-500/10 hover:text-berry-500"
      >
        ลบ
      </button>
    </form>
  );
}
