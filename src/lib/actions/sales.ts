"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/supabase/server";
import {
  numField,
  strField,
  round2,
  round4,
  unitPriceFor,
  channelShareFor,
} from "@/lib/pricing";
import { todayISO } from "@/lib/format";
import type { Channel } from "@/lib/types";
import type { FormState } from "./products";

export async function saveSale(
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const { supabase, user } = await requireUser();

  const productId = strField(fd, "product_id");
  const channelId = strField(fd, "channel_id");
  if (!productId) return { error: "กรุณาเลือกสินค้า" };
  if (!channelId) return { error: "กรุณาเลือกช่องทางขาย" };

  const qty = numField(fd, "qty");
  if (qty <= 0) return { error: "จำนวนต้องมากกว่า 0" };

  // ดึงสินค้า + ช่องทาง + สต๊อกคงเหลือ พร้อมกัน
  const [productRes, channelRes, stockRes] = await Promise.all([
    supabase
      .from("products")
      .select("base_price, name")
      .eq("id", productId)
      .single(),
    supabase.from("channels").select("*").eq("id", channelId).single(),
    supabase
      .from("product_stock")
      .select("stock_qty, avg_cost_per_unit, avg_material_cost_per_unit")
      .eq("product_id", productId)
      .single(),
  ]);

  if (productRes.error) return { error: "ไม่พบสินค้าที่เลือก" };
  if (channelRes.error) return { error: "ไม่พบช่องทางที่เลือก" };

  const channel = channelRes.data as Channel;
  const stock = stockRes.data;

  if (stock && qty > Number(stock.stock_qty)) {
    return {
      error: `สต๊อกไม่พอ — ${productRes.data.name} เหลือ ${Number(stock.stock_qty)} หน่วย`,
    };
  }

  // ราคาขาย: แก้ในฟอร์มได้ ถ้าไม่แก้ใช้ราคาตามช่องทาง
  const defaultPrice = unitPriceFor(channel, Number(productRes.data.base_price));
  const unitPrice = numField(fd, "unit_price", defaultPrice);

  // snapshot ต้นทุน ณ เวลาขาย -> กำไรย้อนหลังไม่เปลี่ยนเมื่อผลิตรอบใหม่
  const row = {
    user_id: user.id,
    product_id: productId,
    channel_id: channelId,
    sold_on: strField(fd, "sold_on", todayISO()),
    qty,
    unit_price: unitPrice,
    delivery_cost: numField(fd, "delivery_cost"),
    unit_full_cost: round4(Number(stock?.avg_cost_per_unit ?? 0)),
    unit_material_cost: round4(Number(stock?.avg_material_cost_per_unit ?? 0)),
    channel_share: channelShareFor(channel, unitPrice, qty),
    notes: strField(fd, "notes") || null,
  };

  const { error } = await supabase.from("transactions").insert(row);
  if (error) return { error: error.message };

  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/reports");
  return { ok: true };
}

export async function deleteSale(fd: FormData) {
  const { supabase } = await requireUser();
  const id = strField(fd, "id");
  if (!id) return;

  await supabase.from("transactions").delete().eq("id", id);

  revalidatePath("/sales");
  revalidatePath("/");
  revalidatePath("/reports");
}
