"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

export default function AddTask({ auth, defaultDate = "", plain = false }: { auth: Auth; defaultDate?: string; plain?: boolean }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("");
  const [visit, setVisit] = useState(false);
  const { run, pending, err } = useAct();
  return (
    <form
      className={plain ? "" : "mt-6 rounded-xl bg-card p-4 shadow-card"}
      onSubmit={(e) => { e.preventDefault(); run(() => addTask(auth, title, date || null, visit ? "schedule" : "custom", time || null), () => { setTitle(""); setDate(defaultDate); setTime(""); setVisit(false); }); }}
    >
      <label htmlFor="nt" className="font-semibold">할 일 직접 추가</label>
      <input id="nt" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="예: 첫 외래 동행" className="mt-2 w-full rounded-xl border border-line px-4 py-2" />
      <label htmlFor="nd" className="mt-2 block text-sm text-muted">날짜 {visit ? "(필수)" : "(선택)"}</label>
      <input id="nd" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-xl border border-line px-4 py-2" />
      {date && (
        <>
          <label htmlFor="nh" className="mt-2 block text-sm text-muted">시간 (선택)</label>
          <input id="nh" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full rounded-xl border border-line px-4 py-2" />
        </>
      )}
      <label className="mt-3 flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={visit} onChange={(e) => setVisit(e.target.checked)} /> 병원 가는 일정이에요 (외래·검사)</label>
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <button disabled={pending || !title.trim() || (visit && !date)} className="mt-3 w-full rounded-full bg-accent-soft px-5 py-2 font-semibold text-accent disabled:opacity-40">추가</button>
    </form>
  );
}
