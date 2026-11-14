import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, sortResults, type CaseInput } from "./benefits.ts";

const persona: CaseInput = {
  dischargeDate: "2026-11-20", birthYear: 1954, sido: "서울", sigungu: "마포구",
  reason: "ortho", living: "spouse", helpers: 2, income: null,
};
const by = (rs: ReturnType<typeof evaluate>, id: string) => rs.find((r) => r.benefit.id === id)!;

test("페르소나(72세, 서울, 배우자와 거주)", () => {
  const rs = evaluate(persona, "2026-11-15");
  assert.equal(by(rs, "ltc_grade").verdict, "high");
  assert.equal(by(rs, "integrated_care").verdict, "high");
  assert.equal(by(rs, "integrated_care").apply.phone, "1668-0120");
  assert.equal(by(rs, "seoul_recovery").verdict, "check");
});

test("혼자 거주면 일상회복서비스 높음, 마감은 퇴원 후 30일", () => {
  const r = by(evaluate({ ...persona, living: "alone" }, "2026-11-15"), "seoul_recovery");
  assert.equal(r.verdict, "high");
  assert.deepEqual(r.deadline, { state: "open", daysLeft: 35, endDate: "2026-12-20" });
});

test("서울 외 지역은 서울 제도 해당 없음", () => {
  assert.equal(by(evaluate({ ...persona, sido: "경기" }, "2026-11-15"), "seoul_recovery").verdict, "no");
});

test("퇴원일 미정이면 마감 unknown", () => {
  assert.equal(by(evaluate({ ...persona, dischargeDate: null }, "2026-11-15"), "seoul_recovery").deadline.state, "unknown");
});

test("신청 기간 지나면 closed", () => {
  assert.equal(by(evaluate(persona, "2027-01-30"), "seoul_recovery").deadline.state, "closed");
});

test("만 65세 경계(2026-1961=65)는 확인 필요", () => {
  assert.equal(by(evaluate({ ...persona, birthYear: 1961 }, "2026-11-15"), "ltc_grade").verdict, "check");
});

test("정렬: 높음이 확인 필요보다 먼저", () => {
  const rs = sortResults(evaluate(persona, "2026-11-15"));
  const first = rs.findIndex((r) => r.verdict === "check");
  assert.ok(rs.slice(0, first).every((r) => r.verdict === "high"));
});
