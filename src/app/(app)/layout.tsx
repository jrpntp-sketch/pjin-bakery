import { requireUser } from "@/lib/supabase/server";
import { Sidebar, BottomNav, MobileHeader } from "@/components/nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, user } = await requireUser();

  const { data: settings } = await supabase
    .from("settings")
    .select("shop_name")
    .eq("user_id", user.id)
    .maybeSingle();

  const shopName = settings?.shop_name ?? "ร้านขนม";

  return (
    <div className="flex min-h-dvh bg-cream-50">
      <Sidebar shopName={shopName} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader shopName={shopName} />
        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 pb-24 sm:px-6 lg:pb-8">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
