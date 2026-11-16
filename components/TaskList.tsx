"use client";
import { useState } from "react";
import Link from "next/link";
import { toggleTask, claimTask, unclaimTask, rescheduleTaskToToday } from "@/app/actions";
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
  const [toast, setToast] = useState<string | null>(null);
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;

  const copyHelp = async (t: T) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://bravecare-kr.vercel.app";
    const taskPath = detailBase ? `${detailBase}/${t.id}` : `/c/${auth.v}/tasks`;
    const taskUrl = `${origin}${taskPath}`;

    const dateStr = t.due_date ? `${krDate(t.due_date)}${t.due_time ? ` ${krTime(t.due_time)}` : ""}` : "날짜 미정";
    const memoLine = t.memo ? `• 메모: ${t.memo}\n` : "";

    const text = `가족 여러분, 씩씩이에요 🌱

아직 맡은 사람이 없는 일이 있어요!
시간 되시는 분이 도와주실 수 있나요?

• 할 일: ${t.title}
• 일시: ${dateStr}
${memoLine}
아래 링크에서 ‘내가 할게’를 꾹 눌러주시면 돼요.
오늘도 다 같이 씩씩하게! ✨

👉 바로 확인하고 맡기:
${taskUrl}`;

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(t.id);
      setToast("카톡 단톡방용 부탁 메시지와 링크가 복사되었어요. 단톡방에 붙여넣어 공유하세요!");
      setTimeout(() => {
        setCopiedId(null);
        setToast(null);
      }, 3000);
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
      {toast && (
        <div role="status" className="mb-2.5 flex items-center justify-between rounded-xl bg-accent-soft p-3 text-xs font-medium text-accent shadow-sm">
          <span>💬 {toast}</span>
          <button type="button" onClick={() => setToast(null)} className="ml-2 font-bold opacity-60 hover:opacity-100">×</button>
        </div>
      )}
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
          const title = `line-clamp-2 text-callout font-medium leading-snug ${t.done ? "text-muted line-through" : "text-ink"}`;
          // 줄 안의 작은 글자 버튼: 전역 44px 최소 높이를 풀고, 위아래 여백으로 누르는 면적만 키운다
          const inlineBtn = "-my-1 min-h-0 py-1 text-xs font-semibold underline underline-offset-2";
          return (
            <li key={t.id} className="flex items-stretch">
              <span className="w-1 shrink-0" style={{ background: EVENT_STYLE[KIND[t.kind]].dot, opacity: t.done ? 0.35 : 1 }} aria-hidden />
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
                        className={`${inlineBtn} text-accent`}
                        title="마감일을 오늘로 변경합니다"
                      >
                        오늘 하기
                      </button>
                    )}
                    {showOwner && !t.done && !t.assignee_id && (
                      <button
                        type="button"
                        onClick={() => copyHelp(t)}
                        className={`${inlineBtn} ${copiedId === t.id ? "text-accent" : "text-muted"}`}
                        title="가족 단톡방에 보낼 부탁 문구를 복사합니다"
                      >
                        {copiedId === t.id ? "복사 완료!" : "카톡 부탁"}
                      </button>
                    )}
                    {!showOwner && !t.done && t.due_date && (
                      <a
                        href={`/ics/${auth.k}/${auth.v}/${t.id}`}
                        download={`${t.title}.ics`}
                        className={`${inlineBtn} text-muted hover:text-accent`}
                        title="내 스마트폰 캘린더에 일정 등록"
                      >
                        캘린더 알람 (.ics)
                      </a>
                    )}
                  </div>
                  {badge && <span className="mt-1.5 inline-block rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn">{badge}</span>}
                  {t.memo && <p className="mt-1 truncate text-xs text-muted">메모: {t.memo}</p>}
                </div>
                {showOwner && !t.done && (
                  <div className="flex w-16 shrink-0 justify-center">
                    {t.assignee_id ? (
                      <div className="flex w-14 flex-col items-center gap-0.5" title={`담당: ${owner ?? ""}`}>
                        <Avatar name={owner ?? "?"} size={26} />
                        <span className={`max-w-full truncate text-caption leading-none ${t.assignee_id === meId ? "font-semibold text-accent" : "text-muted"}`}>{t.assignee_id === meId ? "나" : owner}</span>
                        {t.assignee_id === meId && (
                          <button
                            type="button"
                            onClick={() => run(() => unclaimTask(auth, t.id))}
                            className="mt-0.5 text-[10px] text-muted underline decoration-line/80 hover:text-warn hover:decoration-warn transition-colors"
                            title="담당을 취소하고 다시 미배정 상태로 돌립니다"
                          >
                            담당 취소
                          </button>
                        )}
                      </div>
                    ) : (
                      <button onClick={() => run(() => claimTask(auth, t.id))} className="flex h-9 min-h-0 w-full items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent transition-colors hover:opacity-90">
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
