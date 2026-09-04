"use client";

import { signOut } from "@/lib/actions/auth";
import { Button } from "@/components/ui";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost">
        ออกจากระบบ
      </Button>
    </form>
  );
}
