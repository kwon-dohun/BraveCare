import test from "node:test";
import assert from "node:assert/strict";
import { verifyItems, parseDate, parseModelJson, toDocItems } from "./extract.ts";

const TRANSCRIPT = "퇴원 안내문\n1. 외래 예약: 2026년 11월 27일 오전 10시 정형외과\n2. 아스피린 100mg 하루 1회 식후 복용\n문의 02-123-4567";

test("원문에 없는 항목은 버린다 (환각 0건 보장)", () => {
  const out = verifyItems(TRANSCRIPT, [
    { kind: "schedule", text: "외래 예약: 2026년 11월 27일 오전 10시 정형외과" },
    { kind: "medication", text: "아스피린 100mg 하루 1회 식후 복용" },
    { kind: "caution", text: "2주간 계단을 피하세요" }, // 원문에 없음
    { kind: "medication", text: "아스피린 200mg 하루 1회 식후 복용" }, // 숫자가 바뀜
  ]);
  assert.deepEqual(out.map((i) => i.text), ["외래 예약: 2026년 11월 27일 오전 10시 정형외과", "아스피린 100mg 하루 1회 식후 복용"]);
});

test("공백·줄바꿈 차이는 허용, 중복은 제거", () => {
  const out = verifyItems("외래  예약:\n11/27", [{ kind: "schedule", text: "외래 예약: 11/27" }, { kind: "schedule", text: "외래 예약: 11/27" }]);
  assert.equal(out.length, 1);
});

test("날짜: 분명한 하나만 읽는다", () => {
  assert.equal(parseDate("외래 예약: 2026년 11월 27일", "2026-11-15"), "2026-11-27");
  assert.equal(parseDate("11/27 오전 10시", "2026-11-15"), "2026-11-27");
  assert.equal(parseDate("11월 27일 방문", "2026-11-15"), "2026-11-27");
  assert.equal(parseDate("2026.12.04 검사", "2026-11-15"), "2026-12-04");
});

test("날짜: 연말 근처에서는 가까운 연도를 고른다", () => {
  assert.equal(parseDate("1/8 외래", "2026-12-28"), "2027-01-08");
});

test("날짜: 모호하면 null (날짜 2개, 없음, 불가능한 날짜, 시각·전화번호)", () => {
  assert.equal(parseDate("11/27 또는 12/4", "2026-11-15"), null);
  assert.equal(parseDate("2주 뒤 외래", "2026-11-15"), null);
  assert.equal(parseDate("2/30 방문", "2026-11-15"), null);
  assert.equal(parseDate("10:30 방문, 02-123-4567", "2026-11-15"), null);
});

test("일정인데 날짜가 불분명하면 확인 필요", () => {
  const [a, b] = toDocItems([{ kind: "schedule", text: "2주 뒤 외래" }, { kind: "caution", text: "음주 금지" }], "2026-11-15");
  assert.equal(a.needsCheck, true);
  assert.equal(b.needsCheck, false);
});

test("모델 JSON 파싱: 코드펜스 제거, 깨진 JSON은 빈 결과", () => {
  assert.equal(parseModelJson('```json\n{"transcript":"a","items":[{"kind":"caution","text":"b"},{"kind":"x","text":"c"}]}\n```').items.length, 1);
  assert.deepEqual(parseModelJson("죄송합니다"), { docType: "other", transcript: "", items: [] });
});

test("진단서·확인서 문서 파싱", () => {
  const res = parseModelJson('{"docType":"certificate","transcript":"진단서 질병분류기호 C16","items":[]}');
  assert.equal(res.docType, "certificate");
  assert.equal(res.transcript, "진단서 질병분류기호 C16");
});
