"use client";
import { useTransition, useState } from "react";
import { toggleTask, assignTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { KIND_LABEL } from "@/lib/timeline";
import { dateLabel } from "@/lib/format";

interface T { id: string; title: string; kind: keyof typeof KIND_LABEL; due_date: string | null; rel_day: number | null; assignee_id: string | null; done: boolean; done_by: string | null; source: string; source_quote: string | null }
interface M { id: string; name: string }

export default function TaskList({ tasks, members, auth, meId, canAssign, today, emptyText }: {
  tasks: T[]; members: M[]; auth: Auth; meId: string; canAssign: boolean; today: string; emptyText?: string;
}) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const run = (fn: () => Promise<void>) => start(async () => { setErr(""); try { await fn(); } catch (e) { setErr(e instanceof Error ? e.message : "문제가 생겼어요"); } });
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;

  if (!tasks.length) return <p className="rounded-xl border border-line bg-card p-4 text-muted">{emptyText ?? "할 일이 없어요"}</p>;

  return (
    <div className={pending ? "opacity-60" : ""}>
      {err && <p role="alert" className="mb-2 text-warn">{err}</p>}
      <ul className="divide-y divide-line rounded-xl border border-line bg-card">
        {tasks.map((t) => {
          const canCheck = canAssign || t.assignee_id === meId;
          return (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3">
              <button
                aria-label={t.done ? "완료 취소" : "완료로 표시"}
                disabled={!canCheck}
                onClick={() => run(() => toggleTask(auth, t.id, !t.done))}
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 ${t.done ? "border-accent bg-accent text-white" : "border-line bg-white"} ${canCheck ? "" : "opacity-40"}`}
              >
                {t.done ? "✓" : ""}
              </button>
              <div className="min-w-0 flex-1">
                <p className={t.done ? "text-muted line-through" : ""}>{t.title}</p>
                <p className="text-sm text-muted">
                  {KIND_LABEL[t.kind]} · {dateLabel(t.due_date, t.rel_day, today)}
                  {t.done && t.done_by ? ` · ${t.done_by} 완료` : ""}
                </p>
                {t.source === "doc" && t.source_quote && <p className="mt-1 text-sm text-muted">안내문: “{t.source_quote}”</p>}
                {canAssign ? (
                  <select
                    aria-label="담당자"
                    value={t.assignee_id ?? ""}
                    onChange={(e) => run(() => assignTask(auth, t.id, e.target.value || null))}
                    className={`mt-1 rounded-lg border px-2 text-sm ${t.assignee_id ? "border-line bg-white" : "border-warn bg-warn-soft text-warn"}`}
                  >
                    <option value="">담당자 없음</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                ) : (
                  <p className="text-sm text-muted">담당: {nameOf(t.assignee_id) ?? "없음"}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
