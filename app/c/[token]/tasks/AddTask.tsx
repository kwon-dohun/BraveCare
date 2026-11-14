"use client";
import { useState, useTransition } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";

export default function AddTask({ auth }: { auth: Auth }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <form
      className="mt-4 rounded-xl border border-line bg-card p-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => { setErr(""); try { await addTask(auth, title, date || null); setTitle(""); setDate(""); } catch (x) { setErr(x instanceof Error ? x.message : "문제가 생겼어요"); } });
      }}
    >
      <label htmlFor="nt" className="font-bold">할 일 직접 추가</label>
      <input id="nt" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="예: 어머니 병원 동행" className="mt-2 w-full rounded-xl border border-line px-4 py-2" />
      <input type="date" aria-label="날짜(선택)" value={date} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full rounded-xl border border-line px-4 py-2" />
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <button disabled={pending || !title.trim()} className="mt-3 w-full rounded-xl border border-accent px-5 py-2 font-bold text-accent disabled:opacity-40">추가</button>
    </form>
  );
}
