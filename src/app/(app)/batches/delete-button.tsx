"use client";

import { deleteBatch } from "@/lib/actions/batches";

export function DeleteBatchButton({ id }: { id: string }) {
  return (
    <form
      action={deleteBatch}
      onSubmit={(e) => {
        if (!confirm("ลบรอบผลิตนี้? สต๊อกและต้นทุนเฉลี่ยจะถูกคำนวณใหม่")) {
          e.preventDefault();
        }
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
