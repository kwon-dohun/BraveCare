"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

export default function AddTask({ auth }: { auth: Auth }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const { run, pending, err } = useAct();
  return (
    <form
      className="mt-6 rounded-xl border border-line bg-card p-4"
      onSubmit={(e) => { e.preventDefault(); run(() => addTask(auth, title, date || null), () => { setTitle(""); setDate(""); }); }}
    >
      <label htmlFor="nt" className="font-bold">할 일 직접 추가</label>
      <input id="nt" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="예: 첫 외래 동행" className="mt-2 w-full rounded-xl border border-line px-4 py-2" />
      <label htmlFor="nd" className="mt-2 block text-sm text-muted">날짜 (선택)</label>
      <input id="nd" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-line px-4 py-2" />
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <button disabled={pending || !title.trim()} className="mt-3 w-full rounded-xl border border-accent px-5 py-2 font-bold text-accent disabled:opacity-40">추가</button>
    </form>
  );
}
