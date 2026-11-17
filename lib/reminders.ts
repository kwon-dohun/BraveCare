// 앱이 휴대폰에 예약해 둘 알림 목록. 할 일은 전날 저녁 8시와 당일(시간이 있으면 1시간 전, 없으면 아침 8시 30분),
// 아직 신청하지 않은 지원은 마감 3일 전과 당일 아침 9시. 담당 없는 일은 급한 것(병원 일정·퇴원 당일)만 알려서 가족 수만큼 같은 알림이 쌓이지 않게 한다.
// 순수 함수라 테스트한다.
import type { Result } from "./benefits.ts";
import { krTime } from "./format.ts";
import { priorityOf, openDeadlines } from "./priority.ts";

export interface Reminder { id: string; title: string; body: string; at: string; path: string }

const DAY = 86_400_000;
const kst = (date: string, time: string) => Date.parse(`${date}T${time}:00+09:00`);

export function buildReminders(d: {
  tasks: { id: string; title: string; kind: string; source: string; rel_day: number | null; due_date: string | null; due_time: string | null; done: boolean; assignee_id: string | null }[];
  results: Result[]; status: Record<string, string>; meId: string; now: number;
}): Reminder[] {
  const out: (Omit<Reminder, "at"> & { at: number })[] = [];
  const deadlines = openDeadlines(d.results);
  for (const t of d.tasks) {
    if (t.done || t.kind === "question" || !t.due_date || (t.assignee_id && t.assignee_id !== d.meId)) continue; // 다른 가족이 맡은 일은 알리지 않는다
    if (t.source === "benefit") continue; // 지원 신청은 아래 마감 알림이 맡는다
    if (!t.assignee_id && priorityOf(t, deadlines) > 1) continue; // 급하지 않은 담당 없는 일은 화면에서만
    const body = t.assignee_id ? t.title : `${t.title} (담당자 없음)`;
    const path = `/tasks/${t.id}`;
    out.push({ id: `${t.id}:eve`, title: "내일 할 일이 있어요", body, at: kst(t.due_date, "20:00") - DAY, path });
    out.push(t.due_time
      ? { id: `${t.id}:day`, title: `${krTime(t.due_time)}에 일정이 있어요`, body, at: kst(t.due_date, t.due_time) - 3_600_000, path }
      : { id: `${t.id}:day`, title: "오늘 할 일이에요", body, at: kst(t.due_date, "08:30"), path });
  }
  for (const r of d.results) {
    if (r.verdict === "no" || r.deadline.state !== "open" || !r.deadline.endDate || (d.status[r.benefit.id] ?? "none") !== "none") continue;
    const path = `/benefits/${r.benefit.id}`;
    out.push({ id: `${r.benefit.id}:d3`, title: "지원 신청 마감 3일 전이에요", body: r.benefit.name, at: kst(r.deadline.endDate, "09:00") - 3 * DAY, path });
    out.push({ id: `${r.benefit.id}:d0`, title: "오늘이 지원 신청 마감이에요", body: r.benefit.name, at: kst(r.deadline.endDate, "09:00"), path });
  }
  // shortcut: 가까운 40개만. iOS는 예약 알림이 64개까지라 여유를 둔다. 앱을 열 때마다 다시 잡는다.
  return out.filter((r) => r.at > d.now).sort((a, b) => a.at - b.at).slice(0, 40).map((r) => ({ ...r, at: new Date(r.at).toISOString() }));
}
