"use client";
import { useState } from "react";
import Link from "next/link";
import { EVENT_STYLE, type CalEvent, type EventKind } from "@/lib/calendar";
import { krDate } from "@/lib/format";
import Icon from "./Icon";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const weekday = (d: string) => WEEKDAYS[new Date(`${d}T00:00:00Z`).getUTCDay()];

export default function WeekStrip({
  week,
  today,
  dischargeDate,
  eventsData,
  base,
}: {
  week: string[];
  today: string;
  dischargeDate: string | null;
  eventsData: [string, CalEvent[]][];
  base: string; // 케이스 주소(/c/<열쇠>). 할 일·지원 상세와 달력 주소를 여기서 만든다
}) {
  const [selected, setSelected] = useState<string>(today);
  const eventsMap = new Map<string, CalEvent[]>(eventsData);

  const selectedEvents = eventsMap.get(selected) ?? [];
  const isToday = selected === today;

  return (
    <section className="mt-6" aria-labelledby="h-week">
      <div className="mb-2 flex items-end justify-between">
        <div>
          <h2 id="h-week" className="font-display text-headline">이번 주 일정</h2>
          <p className="text-xs text-muted">날짜를 누르면 홈에서 바로 일정을 확인할 수 있어요</p>
        </div>
        <Link href={`${base}/tasks?d=${selected}`} className="flex items-center text-sm font-medium text-accent">
          달력 전체 보기
        </Link>
      </div>

      <div className="rounded-xl bg-card p-3 shadow-card">
        {/* 7일 주간 달력 띠 */}
        <ol className="grid grid-cols-7 gap-1">
          {week.map((d) => {
            const ev = eventsMap.get(d) ?? [];
            const kinds = [...new Set(ev.map((e) => e.kind))].slice(0, 3);
            const isSel = d === selected;
            const isTodayDay = d === today;
            const isDischarge = d === dischargeDate;

            return (
              <li key={d}>
                <button
                  type="button"
                  onClick={() => setSelected(d)}
                  aria-pressed={isSel}
                  className={`flex w-full min-h-0 flex-col items-center gap-1 rounded-2xl py-2 transition-all ${
                    isSel
                      ? "bg-accent-soft ring-2 ring-primary font-semibold text-accent shadow-sm"
                      : isTodayDay
                      ? "bg-accent-soft/60"
                      : "hover:bg-accent-soft/30"
                  } ${isDischarge ? "ring-[1.5px] ring-[#ef7a4a]" : ""}`}
                >
                  <span className={`text-caption ${isSel || isTodayDay ? "font-semibold text-accent" : "text-muted"}`}>
                    {isTodayDay ? "오늘" : weekday(d)}
                  </span>
                  <span className="font-display text-headline tabular-nums leading-none">
                    {Number(d.slice(8))}
                    <span className="sr-only">일, 일정 {ev.length}개</span>
                  </span>
                  <span className="flex h-1.5 gap-0.5">
                    {kinds.map((k) => (
                      <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_STYLE[k as EventKind].dot }} />
                    ))}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        {/* 선택한 날짜의 인라인 일정 표시 */}
        <div className="mt-3 border-t border-line pt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-accent">
              {isToday ? "오늘 (선택됨)" : `${krDate(selected)} (${weekday(selected)})`}
            </p>
            <span className="text-caption text-muted tabular-nums">일정 {selectedEvents.length}개</span>
          </div>

          {selectedEvents.length === 0 ? (
            <p className="py-2 text-center text-xs text-muted">이 날은 예정된 일정이 없어요.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedEvents.map((e, idx) => {
                // 줄 전체를 눌러 상세로 간다(할 일 → 할 일 수정, 지원 마감 → 지원 상세). 퇴원일처럼 갈 곳이 없으면 그냥 줄
                const href = e.taskId ? `${base}/tasks/${e.taskId}` : e.benefitId ? `${base}/benefits/${e.benefitId}` : null;
                const inner = (
                  <>
                    <span className={`mt-px shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${EVENT_STYLE[e.kind].chip}`}>{EVENT_STYLE[e.kind].label}</span>
                    <span className={`min-w-0 flex-1 leading-snug ${e.done ? "line-through opacity-50" : ""}`}>{e.title}</span>
                    {href && <Icon name="right" size={16} className="mt-0.5 shrink-0 text-muted" />}
                  </>
                );
                const row = "flex items-start gap-2 rounded-lg bg-background/60 p-2.5 text-sm";
                return (
                  <li key={idx + e.title}>
                    {href ? <Link href={href} className={`${row} min-h-11`}>{inner}</Link> : <div className={row}>{inner}</div>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
