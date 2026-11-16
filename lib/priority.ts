// 할 일의 우선순위. 새 컬럼 없이 종류·출처·마감으로 계산한다. 화면 정렬·배지와 알림이 같은 규칙을 쓴다.
//   0 골든타임: 마감이 있는 지원 신청  1 사람이 필요한 일: 병원 일정·퇴원 당일  2 일반 준비  3 나중에 해도 되는 일(퇴원 30일 이후)
import type { Result } from "./benefits.ts";
import { dayDiff } from "./benefits.ts";

export type Priority = 0 | 1 | 2 | 3;
interface T { id: string; title: string; kind: string; source: string; rel_day: number | null; due_date: string | null }

// 마감이 아직 남은 지원의 이름 → 남은 일수
export function openDeadlines(results: Result[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of results) if (r.verdict !== "no" && r.deadline.state === "open") m.set(r.benefit.name, r.deadline.daysLeft ?? 0);
  return m;
}

const BENEFIT_SUFFIX = " 신청 알아보기";
export function priorityOf(t: T, deadlines: Map<string, number>): Priority {
  if (t.source === "benefit" && deadlines.has(t.title.replace(BENEFIT_SUFFIX, ""))) return 0;
  if (t.kind === "question") return 2;
  if (t.kind === "schedule" || t.rel_day === 0) return 1;
  if (t.rel_day !== null && t.rel_day >= 30) return 3;
  return 2;
}

// 같은 구역 안의 순서: 밀린 일을 우선순위 안에서 먼저, 그다음 날짜순
export function sortTasks<X extends T>(tasks: X[], deadlines: Map<string, number>, today: string): X[] {
  const key = (t: X) => priorityOf(t, deadlines) * 2 + (t.due_date && t.due_date < today ? 0 : 1);
  return [...tasks].sort((a, b) => key(a) - key(b) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
}

// 목록 행에 붙일 짧은 배지(없으면 생략). 담당이 없을 때만 '구한다'는 말을 쓴다.
export function badgeFor(t: T & { assignee_id: string | null }, deadlines: Map<string, number>, today: string): string | null {
  const p = priorityOf(t, deadlines);
  if (p === 0) { const d = deadlines.get(t.title.replace(BENEFIT_SUFFIX, ""))!; return d === 0 ? "오늘 마감" : `마감 D-${d}`; }
  if (p === 1 && !t.assignee_id && t.due_date && dayDiff(t.due_date, today) >= 0) return "같이 할 사람이 필요해요";
  return null;
}
