import test from "node:test";
import assert from "node:assert/strict";
import { buildReminders } from "./reminders.ts";
import { nextDue } from "./timeline.ts";
import { taskIcs } from "./ics.ts";
import { krTime } from "./format.ts";

const task = (o: object) => ({ id: "t1", title: "첫 외래", due_date: "2026-11-27", due_time: null, done: false, assignee_id: "me", ...o });
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
