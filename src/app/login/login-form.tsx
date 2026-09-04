"use client";

import { useActionState, useState } from "react";
import { signIn, signUp, type AuthState } from "@/lib/actions/auth";
import { Button, Field, inputClass } from "@/components/ui";

const EMPTY: AuthState = {};

export function LoginForm() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const action = mode === "in" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, EMPTY);

  return (
    <div className="rounded-2xl border border-cream-200 bg-white p-6 shadow-sm">
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-cream-100 p-1">
        {(["in", "up"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-lg py-2 text-sm font-semibold transition ${
              mode === m
                ? "bg-white text-cocoa-700 shadow-sm"
                : "text-cocoa-400 hover:text-cocoa-600"
            }`}
          >
            {m === "in" ? "เข้าสู่ระบบ" : "สมัครใหม่"}
          </button>
        ))}
      </div>

      <form action={formAction} className="space-y-4">
        <Field label="อีเมล">
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className={inputClass}
          />
        </Field>
        <Field
          label="รหัสผ่าน"
          hint={mode === "up" ? "อย่างน้อย 6 ตัวอักษร" : undefined}
        >
          <input
            name="password"
            type="password"
            required
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            placeholder="••••••••"
            className={inputClass}
          />
        </Field>

        {state.error && (
          <p className="rounded-xl bg-berry-500/10 px-3 py-2 text-sm text-berry-500">
            {state.error}
          </p>
        )}
        {state.message && (
          <p className="rounded-xl bg-mint-500/10 px-3 py-2 text-sm text-mint-500">
            {state.message}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending
            ? "กำลังดำเนินการ…"
            : mode === "in"
              ? "เข้าสู่ระบบ"
              : "สมัครสมาชิก"}
        </Button>
      </form>
    </div>
  );
}
