"use client";
import Link from "next/link";
import { toggleTask, claimTask, rescheduleTaskToToday } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { KIND_LABEL, REPEAT_LABEL } from "@/lib/timeline";
import { krDate, krTime } from "@/lib/format";
import { dayDiff } from "@/lib/benefits";
import { useAct } from "./useAct";
import Icon from "@/components/Icon";
import Avatar from "@/components/Avatar";
import Mascot from "@/components/Mascot";
import QuestionAnswer from "./QuestionAnswer";

export interface T { id: string; title: string; kind: keyof typeof KIND_LABEL; due_date: string | null; rel_day: number | null; assignee_id: string | null; done: boolean; done_by: string | null; source: string; source_quote: string | null; memo: string | null; due_time?: string | null; repeat?: "daily" | "weekly" | null }
interface M { id: string; name: string }

// 한 줄에 체크 · 제목 · 메타 · 담당. 담당 없는 일을 가족에게 부탁하는 카톡 문구는 상세 화면에서만 복사한다.
// 담당 없는 일에는 '내가 할게', 맡은 일에는 담당 아바타. 담당을 다른 사람으로 바꾸는 건 눌러서 들어가는 상세 화면에서 한다.
export default function TaskList({ tasks, members, auth, meId, today, emptyText, detailBase, showDate = true, showOwner = true, hideToday = false, compact = false, flat = false, badges = {} }: {
  tasks: T[]; members: M[]; auth: Auth; meId: string; today: string; emptyText?: string; detailBase?: string; showDate?: boolean;
  showOwner?: boolean; hideToday?: boolean; compact?: boolean; flat?: boolean; badges?: Record<string, string>;
}) {
  const { run, pending, err } = useAct();
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;

  if (!tasks.length) return (
    <p className="flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
      <Mascot size={40} mood="rest" />{emptyText ?? "할 일이 없어요"}
    </p>
  );

  return (
    <div className={pending ? "opacity-60" : ""} aria-busy={pending}>
      {err && <p role="alert" className="mb-2 text-warn">{err}</p>}
      <ul className={flat ? "divide-y divide-line" : "divide-y divide-line overflow-hidden rounded-xl bg-card shadow-card"}>
        {tasks.map((t) => {
          const isQ = t.kind === "question"; // 물어볼 것은 날짜·마감 없이 체크만 한다
          const late = !isQ && !t.done && !!t.due_date && t.due_date < today;
          let dueText = "";
          let isUrgent = false;
          if (showDate && !isQ) {
            if (t.due_date) {
              const diff = dayDiff(t.due_date, today);
              const plan = t.source === "benefit"; // 할 일의 날짜는 정한 날일 뿐 마감이 아니다(진짜 마감은 지원의 '마감 D-n' 뱃지가 따로 보여 준다)
              if (diff === 0) { dueText = hideToday ? "" : plan ? "오늘 신청하기" : "오늘"; isUrgent = true; } // 홈의 오늘 할 일은 오늘 것이라는 게 뻔해서 뺀다
              else if (diff === 1) { dueText = plan ? "내일 신청하기" : "내일 (D-1)"; isUrgent = true; }
              else if (diff > 1) { dueText = `${krDate(t.due_date)} (D-${diff})`; }
              else { dueText = plan ? `정한 날 지남 (${krDate(t.due_date)})` : `날짜 지남 (${krDate(t.due_date)})`; }
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
          const title = `line-clamp-2 text-callout font-medium leading-snug ${t.done ? "text-muted line-through" : "text-ink"}`;
          // 줄 안의 작은 글자 버튼: 전역 44px 최소 높이를 풀고, 위아래 여백으로 누르는 면적만 키운다
          const inlineBtn = "-my-1 min-h-0 py-1 text-xs font-semibold underline underline-offset-2";
          // 눌러야 하는 줄 안 버튼은 작은 글씨가 아니라 알약 모양으로(누르는 면적 36px)
          const pillBtn = "-my-1.5 flex min-h-9 items-center rounded-full px-3 text-xs font-semibold";
          return (
            <li key={t.id} className="flex items-stretch">
              <div className="flex min-w-0 flex-1 items-center gap-1 py-3 pl-0.5 pr-3">
                <button
                  aria-label={`${t.title} ${t.done ? "완료 취소" : "완료로 표시"}`}
                  onClick={() => run(() => toggleTask(auth, t.id, !t.done))}
                  className="group -my-1 flex h-11 w-11 shrink-0 items-center justify-center"
                >
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-[color,background-color,border-color,transform] duration-150 group-active:scale-90 ${t.done ? "border-primary bg-primary text-ink" : "border-[#9fb8ac] bg-card group-hover:border-accent"}`}>
                    {t.done && <Icon name="check" size={14} />}
                  </span>
                </button>
                <div className="min-w-0 flex-1">
                  {detailBase ? <Link href={`${detailBase}/${t.id}`} className={`block min-h-0 ${title}`}>{t.title}</Link> : <p className={title}>{t.title}</p>}
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs leading-snug">
                    <span className={late ? "font-medium text-warn" : isUrgent ? "font-semibold text-accent" : "text-muted"}>
                      {metaParts.join(" · ")}
                    </span>
                    {late && !t.done && (
                      <button
                        type="button"
                        onClick={() => run(() => rescheduleTaskToToday(auth, t.id, today))}
                        className={`${pillBtn} bg-accent-soft text-accent`}
                        title="날짜를 오늘로 변경합니다"
                      >
                        오늘 하기
                      </button>
                    )}
                    {!compact && !showOwner && !isQ && !t.done && t.due_date && (
                      <a
                        href={`/ics/${auth.k}/${auth.v}/${t.id}`}
                        download={`${t.title}.ics`}
                        className={`${inlineBtn} text-muted hover:text-accent`}
                        title="내 스마트폰 캘린더에 일정 등록"
                      >
                        내 달력에 넣기
                      </a>
                    )}
                  </div>
                  {badge && <span className="mt-1.5 inline-block rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn">{badge}</span>}
                  {t.kind === "question" ? <QuestionAnswer auth={auth} task={t} /> : t.memo && <p className="mt-1 truncate text-xs text-muted">메모: {t.memo}</p>}
                </div>
                {showOwner && !t.done && (
                  <div className="flex w-16 shrink-0 justify-center">
                    {t.assignee_id ? (
                      <div className="flex w-14 flex-col items-center gap-1" title={`담당: ${owner ?? ""}`}>
                        <Avatar name={owner ?? "?"} size={28} />
                        <span className={`max-w-full truncate text-caption leading-none ${t.assignee_id === meId ? "font-semibold text-accent" : "text-muted"}`}>{t.assignee_id === meId ? "나" : owner}</span>
                      </div>
                    ) : (
                      <button onClick={() => run(() => claimTask(auth, t.id))} className={`flex h-9 min-h-0 w-full items-center justify-center text-xs font-semibold text-accent transition-colors hover:opacity-90 rounded-full border border-accent/40 px-2`}>
                        내가 할게
                      </button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
