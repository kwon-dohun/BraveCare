// 달력에 찍을 일정 모으기. 할 일(날짜 있는 것) + 퇴원일 + 지원 신청 마감. 순수 함수라 테스트한다.
import type { CaseInput, Result } from "./benefits.ts";
import type { TaskKind } from "./timeline.ts";

export type EventKind = "visit" | "admin" | "question" | "prep" | "discharge" | "deadline";
export interface CalEvent { kind: EventKind; title: string; done?: boolean; taskId?: string; benefitId?: string; assignee?: string | null }

// 색은 종류마다 하나. 범례와 점이 같은 색을 쓴다.
export const EVENT_STYLE: Record<EventKind, { label: string; dot: string; chip: string }> = {
  visit: { label: "병원", dot: "#3b82d6", chip: "bg-[#e3f0ff] text-[#1f5aa6]" },
  admin: { label: "서류·행정", dot: "#d9a400", chip: "bg-[#fff4cc] text-[#7a5a00]" },
  question: { label: "물어볼 것", dot: "#8b6be0", chip: "bg-[#f1e9ff] text-[#5b3aa6]" },
  prep: { label: "준비", dot: "#2fb383", chip: "bg-[#dff7ec] text-[#0b7a57]" },
  discharge: { label: "퇴원", dot: "#ef7a4a", chip: "bg-[#ffe9dc] text-[#9a3f12]" },
  deadline: { label: "지원 마감", dot: "#e0517a", chip: "bg-[#ffe4ea] text-[#a3324f]" },
};

export const KIND: Record<TaskKind, EventKind> = { schedule: "visit", admin: "admin", question: "question", prep: "prep", custom: "prep" };

export function buildEvents(d: {
  input: CaseInput;
  tasks: { id: string; title: string; kind: TaskKind; due_date: string | null; done: boolean; assignee_id: string | null }[];
  results: Result[]; status: Record<string, string>;
}): Map<string, CalEvent[]> {
  const map = new Map<string, CalEvent[]>();
  const add = (date: string, e: CalEvent) => map.set(date, [...(map.get(date) ?? []), e]);
  if (d.input.dischargeDate) add(d.input.dischargeDate, { kind: "discharge", title: "퇴원하는 날" });
  // 의료진에게 물어볼 것은 날짜가 없는 목록이라 달력에 올리지 않는다
  for (const t of d.tasks) if (t.due_date && t.kind !== "question") add(t.due_date, { kind: KIND[t.kind], title: t.title, done: t.done, taskId: t.id, assignee: t.assignee_id });
  for (const r of d.results) {
    if (r.verdict === "no" || r.deadline.state !== "open" || !r.deadline.endDate) continue;
    if ((d.status[r.benefit.id] ?? "none") !== "none") continue; // 이미 신청했으면 마감 알림은 필요 없다
    add(r.deadline.endDate, { kind: "deadline", title: `${r.benefit.name} 신청 마감`, benefitId: r.benefit.id });
  }
  return map;
}

// 해당 달을 일요일 시작 주 단위로. 앞뒤 빈칸은 null.
export function monthGrid(ym: string): (string | null)[][] {
  const [y, m] = ym.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first.getUTCDay()).fill(null)];
  for (let i = 1; i <= days; i++) cells.push(`${ym}-${String(i).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

export const shiftMonth = (ym: string, n: number) => {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

export const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];
export const weekday = (date: string) => WEEKDAY[new Date(`${date}T00:00:00Z`).getUTCDay()];
