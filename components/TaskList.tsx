"use client";
import Link from "next/link";
import { toggleTask, assignTask, claimTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { KIND_LABEL } from "@/lib/timeline";
import { dateLabel } from "@/lib/format";
import { useAct } from "./useAct";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";

export interface T { id: string; title: string; kind: keyof typeof KIND_LABEL; due_date: string | null; rel_day: number | null; assignee_id: string | null; done: boolean; done_by: string | null; source: string; source_quote: string | null; memo: string | null }
interface M { id: string; name: string }

export default function TaskList({ tasks, members, auth, meId, canAssign, today, emptyText, detailBase, showDate = true }: {
  tasks: T[]; members: M[]; auth: Auth; meId: string; canAssign: boolean; today: string; emptyText?: string; detailBase?: string; showDate?: boolean;
}) {
  const { run, pending, err } = useAct();
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;
  // 담당자 없음은 홈 요약 칸이 알려준다. 목록에서는 점선으로만 비어 있음을 표시한다.

  if (!tasks.length) return (
    <p className="flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
      <Mascot size={40} mood="rest" />{emptyText ?? "할 일이 없어요"}
    </p>
  );

  return (
    <div className={pending ? "opacity-60" : ""} aria-busy={pending}>
      {err && <p role="alert" className="mb-2 text-warn">{err}</p>}
      <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
        {tasks.map((t) => {
          const canCheck = canAssign || t.assignee_id === meId;
          const overdue = !t.done && !!t.due_date && t.due_date < today;
          const meta = [KIND_LABEL[t.kind], showDate ? dateLabel(t.due_date, t.rel_day, today) : "", overdue ? "지남" : "", t.done && t.done_by ? `${t.done_by} 완료` : ""].filter(Boolean).join(" · ");
          return (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3">
              <button
                aria-label={`${t.title} ${t.done ? "완료 취소" : "완료로 표시"}`}
                disabled={!canCheck}
                onClick={() => run(() => toggleTask(auth, t.id, !t.done))}
                className={`group -my-2 -ml-2 flex h-11 w-11 shrink-0 items-center justify-center ${canCheck ? "" : "opacity-30"}`}
              >
                {/* 눌리는 영역은 44px, 보이는 원은 26px */}
                <span className={`flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] transition-colors ${t.done ? "border-primary bg-primary text-ink" : "border-[#c5d9cf] bg-card group-hover:border-accent"}`}>
                  {t.done && <Icon name="check" size={16} />}
                </span>
              </button>
              <div className="min-w-0 flex-1">
                {detailBase ? (
                  <Link href={`${detailBase}/${t.id}`} className={`flex min-h-0 items-start justify-between gap-2 text-callout font-medium ${t.done ? "text-muted line-through" : ""}`}>
                    <span>{t.title}</span><Icon name="right" size={16} className="mt-0.5 text-muted" />
                  </Link>
                ) : (
                  <p className={`text-callout font-medium ${t.done ? "text-muted line-through" : ""}`}>{t.title}</p>
                )}
                <p className={`mt-0.5 text-xs ${overdue ? "text-warn" : "text-muted"}`}>{meta}</p>
                {t.source === "doc" && t.source_quote && <p className="mt-1 text-sm text-muted">안내문 원문: “{t.source_quote}”</p>}
                {t.memo && <p className="mt-1 rounded-lg bg-background px-2 py-1 text-sm">메모: {t.memo}</p>}
                {canAssign ? (
                  <select
                    aria-label={`${t.title} 담당자`}
                    value={t.assignee_id ?? ""}
                    onChange={(e) => run(() => assignTask(auth, t.id, e.target.value || null))}
                    className={`mt-2 h-8 min-h-0 rounded-full border px-3 text-xs ${t.assignee_id ? "border-accent-soft bg-accent-soft font-medium text-accent" : "border-dashed border-[#c5d9cf] bg-card text-muted"}`}
                  >
                    <option value="">담당자 없음</option>
                    {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                ) : t.assignee_id || t.done ? (
                  <p className="text-sm text-muted">담당: {nameOf(t.assignee_id) ?? "없음"}</p>
                ) : (
                  <button onClick={() => run(() => claimTask(auth, t.id))} className="mt-2 h-8 min-h-0 rounded-full bg-accent-soft px-3.5 text-xs font-semibold text-accent">내가 할게</button>
                )}
                {t.assignee_id === meId && !t.done && t.due_date && (
                  <a href={`/ics/${auth.k}/${auth.v}/${t.id}`} className="mt-1 block text-sm text-accent underline">내 캘린더에 넣기 (알림 포함)</a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
