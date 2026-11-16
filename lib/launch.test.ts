import test from "node:test";
import assert from "node:assert/strict";
import { buildReminders } from "./reminders.ts";
import { nextDue } from "./timeline.ts";
import { taskIcs, fold } from "./ics.ts";
import { krTime } from "./format.ts";

const task = (o: object) => ({ id: "t1", title: "첫 외래", kind: "schedule", source: "manual", rel_day: null, due_date: "2026-11-27", due_time: null, done: false, assignee_id: "me", ...o });
const now = Date.parse("2026-11-20T12:00:00+09:00");
const base = { results: [], status: {}, meId: "me", now };

test("알림: 전날 저녁 8시와 당일 아침 8시 30분", () => {
  const r = buildReminders({ ...base, tasks: [task({})] });
  assert.deepEqual(r.map((x) => x.at), ["2026-11-26T11:00:00.000Z", "2026-11-26T23:30:00.000Z"]);
  assert.equal(r[0].path, "/tasks/t1");
});

test("알림: 시간이 있으면 1시간 전, 제목에 쉬운 시간", () => {
  const r = buildReminders({ ...base, tasks: [task({ due_time: "14:00" })] });
  assert.equal(r[1].at, "2026-11-27T04:00:00.000Z");
  assert.match(r[1].title, /오후 2시/);
});

test("알림: 다른 가족이 맡은 일·끝난 일·지난 시각은 빼고, 담당자 없는 일은 알린다", () => {
  const r = buildReminders({ ...base, tasks: [
    task({ id: "a", assignee_id: "other" }), task({ id: "b", done: true }), task({ id: "c", due_date: "2026-11-20" }), task({ id: "d", assignee_id: null }),
  ] });
  assert.deepEqual(r.map((x) => x.id), ["d:eve", "d:day"]);
  assert.match(r[0].body, /담당자 없음/);
});

test("알림: 급하지 않은 담당 없는 일과 지원 신청 할 일은 개별 알림을 만들지 않는다", () => {
  const r = buildReminders({ ...base, tasks: [
    task({ id: "p", kind: "prep", rel_day: -3, assignee_id: null }), task({ id: "b", kind: "admin", source: "benefit", assignee_id: null }),
  ] });
  assert.deepEqual(r, []);
});

test("알림: 신청하지 않은 지원만 마감 3일 전과 당일", () => {
  const res = (id: string) => ({ verdict: "high", benefit: { id, name: id }, deadline: { state: "open", endDate: "2026-11-30", daysLeft: 10 } });
  const r = buildReminders({ ...base, tasks: [], results: [res("x"), res("y")] as never, status: { y: "applied" } });
  assert.deepEqual(r.map((x) => x.id), ["x:d3", "x:d0"]);
  assert.equal(r[0].at, "2026-11-27T00:00:00.000Z");
});

test("반복: 오늘 것을 끝내면 내일, 밀린 것을 끝내면 과거가 아닌 날로", () => {
  assert.equal(nextDue("2026-11-20", "daily", "2026-11-20"), "2026-11-21");
  assert.equal(nextDue("2026-11-17", "daily", "2026-11-20"), "2026-11-20");
  assert.equal(nextDue("2026-11-06", "weekly", "2026-11-20"), "2026-11-20"); // 같은 요일 유지
  assert.equal(nextDue("2026-11-25", "weekly", "2026-11-20"), "2026-12-02");
});

test("캘린더 파일: 시간이 있으면 그 시각(UTC)과 1시간 전 알람", () => {
  const ics = taskIcs({ id: "t1", title: "외래", due_date: "2026-11-27", due_time: "14:00:00", memo: null, kind: "schedule" }, "");
  assert.match(ics, /DTSTART:20261127T050000Z/);
  assert.match(ics, /TRIGGER:-PT1H/);
  assert.doesNotMatch(ics, /VALUE=DATE/);
});

test("시간을 쉬운 말로", () => {
  assert.equal(krTime("14:00"), "오후 2시");
  assert.equal(krTime("09:30"), "오전 9시 30분");
  assert.equal(krTime("00:05"), "오전 12시 5분");
});

test("캘린더 파일: 75바이트 넘는 줄은 접고, 펼치면 원래 글과 같고, 한글을 자르지 않는다", () => {
  const long = "DESCRIPTION:" + "병원 신분증을 챙기세요. ".repeat(8);
  const lines = fold(long).split("\r\n");
  assert.ok(lines.length > 1);
  assert.ok(lines.every((l) => new TextEncoder().encode(l).length <= 75));
  assert.ok(lines.slice(1).every((l) => l.startsWith(" ")));
  assert.equal(lines.map((l, i) => (i ? l.slice(1) : l)).join(""), long);
  const ics = taskIcs({ id: "t1", title: "외래", due_date: "2026-11-27", memo: "메모 ".repeat(40), kind: "custom" }, "서울병원");
  assert.ok(ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
});

import { priorityOf, sortTasks, badgeFor, openDeadlines } from "./priority.ts";

const pt = (o: object) => ({ id: "x", title: "준비 일", kind: "prep", source: "template", rel_day: -3, due_date: "2026-11-25", assignee_id: null, ...o });
const dl = new Map([["긴급복지 의료지원", 3]]);

test("우선순위: 마감 있는 지원 0, 병원 일정·퇴원 당일 1, 일반 2, 30일 이후 3, 질문은 2", () => {
  assert.equal(priorityOf(pt({ title: "긴급복지 의료지원 신청 알아보기", source: "benefit", kind: "admin" }), dl), 0);
  assert.equal(priorityOf(pt({ title: "마감 없는 지원 신청 알아보기", source: "benefit", kind: "admin" }), dl), 2);
  assert.equal(priorityOf(pt({ kind: "schedule", rel_day: null }), dl), 1);
  assert.equal(priorityOf(pt({ rel_day: 0, kind: "admin" }), dl), 1);
  assert.equal(priorityOf(pt({ rel_day: 30 }), dl), 3);
  assert.equal(priorityOf(pt({ kind: "question", rel_day: 0 }), dl), 2);
});

test("정렬: 같은 우선순위에서는 밀린 일이 먼저, 그다음 날짜순", () => {
  const a = pt({ id: "a", due_date: "2026-11-25" }), b = pt({ id: "b", due_date: "2026-11-18" }), c = pt({ id: "c", due_date: "2026-11-10" });
  const hi = pt({ id: "hi", title: "긴급복지 의료지원 신청 알아보기", source: "benefit", kind: "admin", due_date: "2026-11-30" });
  assert.deepEqual(sortTasks([a, b, c, hi], dl, "2026-11-20").map((t) => t.id), ["hi", "c", "b", "a"]);
});

test("배지: 마감 D-n, 담당 없는 병원 일정만 '같이 할 사람', 담당이 있으면 없음", () => {
  assert.equal(badgeFor(pt({ title: "긴급복지 의료지원 신청 알아보기", source: "benefit", kind: "admin" }), dl, "2026-11-20"), "마감 D-3");
  assert.equal(badgeFor(pt({ kind: "schedule" }), dl, "2026-11-20"), "같이 할 사람이 필요해요");
  assert.equal(badgeFor(pt({ kind: "schedule", assignee_id: "m1" }), dl, "2026-11-20"), null);
  assert.equal(badgeFor(pt({ kind: "schedule", due_date: "2026-11-10" }), dl, "2026-11-20"), null);
});

test("마감이 남은 지원만 모은다", () => {
  const r = (name: string, state: string, daysLeft?: number) => ({ verdict: "high", benefit: { name }, deadline: { state, daysLeft } });
  const m = openDeadlines([r("가", "open", 2), r("나", "closed"), r("다", "unknown")] as never);
  assert.deepEqual([...m], [["가", 2]]);
});

test("캘린더 파일: 같은 할 일은 같은 UID, DTSTAMP는 일정 날짜가 아니라 만든 시각", () => {
  const t = { id: "t1", title: "외래", due_date: "2026-11-27", memo: null, kind: "schedule" };
  const a = taskIcs(t, ""), b = taskIcs(t, "");
  assert.match(a, /UID:t1@bravecare/);
  assert.match(a.match(/DTSTAMP:(\S+)/)![1], /^\d{8}T\d{6}Z$/);
  assert.notEqual(a.match(/DTSTAMP:(\S+)/)![1], "20261127T000000Z");
  assert.equal(a.match(/UID:\S+/)![0], b.match(/UID:\S+/)![0]);
});
