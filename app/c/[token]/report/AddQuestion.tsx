"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

export default function AddQuestion({ auth }: { auth: Auth }) {
  const [q, setQ] = useState("");
  const { run, pending, err } = useAct();
  return (
    <form className="mt-3 flex gap-2 print:hidden landscape:hidden" onSubmit={(e) => { e.preventDefault(); run(() => addTask(auth, q, null, "question"), () => setQ("")); }}>
      <label htmlFor="aq" className="sr-only">의료진에게 물어볼 것</label>
      <input id="aq" value={q} maxLength={100} onChange={(e) => setQ(e.target.value)} placeholder="물어볼 것 적어두기" className="min-w-0 flex-1 rounded-xl border border-line px-3 py-2 text-base" />
      <button disabled={pending || !q.trim()} className="rounded-xl border border-accent px-4 text-base font-bold text-accent disabled:opacity-40">추가</button>
      {err && <p role="alert" className="text-warn">{err}</p>}
    </form>
  );
}
