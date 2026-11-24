"use client";
import { useState } from "react";
import { addTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";

// 글자만 치고 엔터: 오늘 할 일로, 적은 사람이 맡는 일로 들어간다. 날짜·다른 담당·병원 일정은 '+ 추가'에서.
export default function QuickAdd({ auth, today }: { auth: Auth; today: string }) {
  const [text, setText] = useState("");
  const { run, pending, err } = useAct();
  return (
    <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); const t = text.trim(); if (t) run(() => addTask(auth, t, today, "custom"), () => setText("")); }}>
      <label htmlFor="quick-add" className="sr-only">오늘 할 일 적기</label>
      <input id="quick-add" value={text} maxLength={100} onChange={(e) => setText(e.target.value)} placeholder="오늘 할 일 적기" className="min-w-0 flex-1 rounded-xl border border-line bg-card px-3 py-2 text-base" />
      <button disabled={pending || !text.trim()} className="rounded-full bg-accent-soft px-4 text-base font-semibold text-accent disabled:opacity-40">추가</button>
      {err && <p role="alert" className="text-warn">{err}</p>}
    </form>
  );
}
