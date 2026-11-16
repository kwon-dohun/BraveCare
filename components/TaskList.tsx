"use client";
import { useState } from "react";
import Link from "next/link";
import { toggleTask, claimTask, rescheduleTaskToToday } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { KIND_LABEL, REPEAT_LABEL } from "@/lib/timeline";
import { EVENT_STYLE, KIND } from "@/lib/calendar";
import { krDate, krTime } from "@/lib/format";
import { dayDiff } from "@/lib/benefits";
import { useAct } from "./useAct";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import Mascot from "@/components/Mascot";

export interface T { id: string; title: string; kind: keyof typeof KIND_LABEL; due_date: string | null; rel_day: number | null; assignee_id: string | null; done: boolean; done_by: string | null; source: string; source_quote: string | null; memo: string | null; due_time?: string | null; repeat?: "daily" | "weekly" | null }
interface M { id: string; name: string }

// 한 줄에 체크 · 제목 · 메타 · 담당. 왼쪽 색 막대는 달력과 같은 종류별 색이다(색만으로 구분하지 않게 메타에 종류 글자도 쓴다).
// 담당 없는 일에는 '내가 할게', 맡은 일에는 담당 아바타. 담당을 다른 사람으로 바꾸는 건 눌러서 들어가는 상세 화면에서 한다.
export default function TaskList({ tasks, members, auth, meId, today, emptyText, detailBase, showDate = true, showOwner = true, badges = {} }: {
  tasks: T[]; members: M[]; auth: Auth; meId: string; today: string; emptyText?: string; detailBase?: string; showDate?: boolean;
  showOwner?: boolean; badges?: Record<string, string>;
}) {
  const { run, pending, err } = useAct();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;

  const copyHelp = async (t: T) => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const dStr = t.due_date ? ` (${krDate(t.due_date)}까지)` : "";
    const text = `[${t.title}]${dStr} 아직 담당 가족이 없어요. 시간 되시는 분이 맡아주세요.\n${url}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(t.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {}
  };

  if (!tasks.length) return (
    <p className="flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
      <Mascot size={40} mood="rest" />{emptyText ?? "할 일이 없어요"}
    </p>
  );

  return (
    <div className={pending ? "opacity-60" : ""} aria-busy={pending}>
      {err && <p role="alert" className="mb-2 text-warn">{err}</p>}
      <ul className="divide-y divide-line overflow-hidden rounded-xl bg-card shadow-card">
        {tasks.map((t) => {
          const late = !t.done && !!t.due_date && t.due_date < today;
          let dueText = "";
          let isUrgent = false;
          if (showDate) {
            if (t.due_date) {
              const diff = dayDiff(t.due_date, today);
              if (diff === 0) { dueText = "오늘 마감 (D-Day)"; isUrgent = true; }
              else if (diff === 1) { dueText = "내일 마감 (D-1)"; isUrgent = true; }
              else if (diff > 1) { dueText = `${krDate(t.due_date)}까지 (D-${diff})`; }
              else { dueText = `마감 기한 지남 (${krDate(t.due_date)} 예정)`; }
            } else if (t.rel_day !== null) {
              dueText = t.rel_day === 0 ? "퇴원 당일 예정" : t.rel_day < 0 ? `퇴원 ${-t.rel_day}일 전 예정` : `퇴원 ${t.rel_day}일 후 예정`;
            }
          }

          const metaParts = [
            t.kind === "schedule" ? "병원 방문" : "",
            dueText,
            t.due_time ? krTime(t.due_time) : "",
            t.repeat ? `${REPEAT_LABEL[t.repeat]} 반복` : "",
            t.done && t.done_by ? `${t.done_by} 완료` : "",
          ].filter(Boolean);

          const owner = nameOf(t.assignee_id);
          const badge = !t.done ? badges[t.id] : undefined;
          const title = `line-clamp-3 text-callout font-medium leading-snug ${t.done ? "text-muted line-through" : ""}`;
          return (
            <li key={t.id} className="flex items-stretch">
              <span className="w-1 shrink-0" style={{ background: EVENT_STYLE[KIND[t.kind]].dot, opacity: t.done ? 0.35 : 1 }} aria-hidden />
              <div className="flex min-w-0 flex-1 items-center gap-1 py-1 pl-1 pr-3">
                <button
                  aria-label={`${t.title} ${t.done ? "완료 취소" : "완료로 표시"}`}
                  onClick={() => run(() => toggleTask(auth, t.id, !t.done))}
                  className="group flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors ${t.done ? "border-primary bg-primary text-ink" : "border-[#9fb8ac] bg-card group-hover:border-accent"}`}>
                    {t.done && <Icon name="check" size={16} />}
                  </span>
                </button>
                <div className="min-w-0 flex-1 py-1.5">
                  {detailBase ? <Link href={`${detailBase}/${t.id}`} className={`block min-h-0 ${title}`}>{t.title}</Link> : <p className={title}>{t.title}</p>}
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className={late ? "font-medium text-warn" : isUrgent ? "font-semibold text-accent" : "text-muted"}>
                      {metaParts.join(" · ")}
                    </span>
                    {late && !t.done && (
                      <button
                        type="button"
                        onClick={() => run(() => rescheduleTaskToToday(auth, t.id, today))}
                        className="rounded bg-accent-soft px-1.5 py-0.5 text-caption font-semibold text-accent hover:opacity-80"
                        title="마감일을 오늘로 변경합니다"
                      >
                        오늘 하기
                      </button>
                    )}
                  </div>
                  {badge && <span className="mt-1 inline-block rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn">{badge}</span>}
                  {t.memo && <p className="mt-0.5 truncate text-xs text-muted">메모: {t.memo}</p>}
                </div>
                {showOwner && !t.done && (
                  t.assignee_id ? (
                    <div className="flex w-20 shrink-0 flex-col items-center justify-center self-center gap-0.5" title={`담당: ${owner ?? ""}`}>
                      <Avatar name={owner ?? "?"} size={28} />
                      <span className={`max-w-16 truncate text-caption leading-none ${t.assignee_id === meId ? "font-semibold text-accent" : "text-muted"}`}>{t.assignee_id === meId ? "나" : owner}</span>
                    </div>
                  ) : (
                    <div className="flex w-20 shrink-0 flex-col items-center justify-center self-center gap-1">
                      <button onClick={() => run(() => claimTask(auth, t.id))} className="flex h-8 w-full items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent transition-colors hover:opacity-90">
                        내가 할게
                      </button>
                      <button type="button" onClick={() => copyHelp(t)} className="text-caption text-muted hover:text-ink">
                        {copiedId === t.id ? "복사됨" : "도움 요청"}
                      </button>
                    </div>
                  )
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
