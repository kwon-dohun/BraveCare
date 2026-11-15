"use client";
import { useState } from "react";
import { toggleTask, setTaskMemo } from "@/app/actions";
import type { Auth } from "@/lib/db";
import type { T } from "@/components/TaskList";
import { useAct } from "@/components/useAct";

// 고령 가족도 쓰기 쉽게: 할 일 하나에 큰 버튼 하나
export default function MyTask({ auth, task, when, overdue }: { auth: Auth; task: T; when: string; overdue: boolean }) {
  const [memo, setMemo] = useState(task.memo ?? "");
  const [editing, setEditing] = useState(false);
  const { run, pending, err } = useAct();

  return (
    <li className="rounded-xl bg-card shadow-card p-4">
      <p className={`text-headline ${task.done ? "text-muted line-through" : "font-medium"}`}>{task.title}</p>
      <p className={`text-sm ${overdue ? "text-warn" : "text-muted"}`}>{when || "날짜 미정"}{overdue ? " · 지남" : ""}</p>
      {task.source === "doc" && task.source_quote && <p className="mt-1 text-sm text-muted">안내문 원문: “{task.source_quote}”</p>}
      {task.memo && !editing && <p className="mt-2 rounded-lg bg-background px-3 py-2 text-sm">메모: {task.memo}</p>}

      {editing && (
        <form className="mt-2" onSubmit={(e) => { e.preventDefault(); run(() => setTaskMemo(auth, task.id, memo), () => setEditing(false)); }}>
          <label htmlFor={`m-${task.id}`} className="sr-only">메모</label>
          <textarea id={`m-${task.id}`} rows={2} maxLength={500} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="가족에게 남길 말" className="w-full rounded-xl border border-line px-3 py-2" />
          <div className="mt-2 flex gap-2">
            <button type="button" onClick={() => { setMemo(task.memo ?? ""); setEditing(false); }} className="flex-1 rounded-xl border border-line px-4">취소</button>
            <button disabled={pending} className="flex-1 rounded-full bg-accent-soft px-4 font-semibold text-accent">메모 저장</button>
          </div>
        </form>
      )}
      {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
      {!task.done && task.due_date && (
        <a href={`/ics/${auth.k}/${auth.v}/${task.id}`} className="mt-2 block text-accent underline">내 캘린더에 넣기 (전날 저녁·당일 아침 알림)</a>
      )}

      {!editing && (
        <div className="mt-3 flex gap-2">
          <button disabled={pending} onClick={() => run(() => toggleTask(auth, task.id, !task.done))}
            className={`flex-1 rounded-xl px-4 py-3 font-semibold disabled:opacity-40 ${task.done ? "border border-line text-muted" : "bg-primary text-ink"}`}>
            {pending ? "저장하는 중…" : task.done ? "완료 취소" : "완료했어요"}
          </button>
          <button onClick={() => setEditing(true)} className="rounded-xl border border-line px-4">{task.memo ? "메모 수정" : "메모"}</button>
        </div>
      )}
    </li>
  );
}
