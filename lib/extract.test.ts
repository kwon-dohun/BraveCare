import test from "node:test";
import assert from "node:assert/strict";
import { verifyItems, parseDate, parseModelJson, toDocItems, validateTranscript } from "./extract.ts";

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
  assert.deepEqual(parseModelJson("죄송합니다"), { docType: "other", transcript: "", items: [], fields: {}, meds: [] });
});

test("진단서·확인서 문서 파싱", () => {
  const res = parseModelJson('{"docType":"certificate","transcript":"진단서 질병분류기호 C16","items":[]}');
  assert.equal(res.docType, "certificate");
  assert.equal(res.transcript, "진단서 질병분류기호 C16");
});

test("서버 방어막 validateTranscript: 의료 키워드 및 길이 검증", () => {
  // 정상 의료 서류 (진단서, 퇴원안내문, 영수증 등) 통과
  assert.equal(validateTranscript("서울병원 정형외과 퇴원안내문 환자 홍길동 11월 27일 외래 방문"), true);
  assert.equal(validateTranscript("진료비 계산서 및 영수증 본인부담금 450,000원 납부 완료"), true);

  // 셀카, 풍경, 사물 등 의료 키워드 없는 사진 차단
  assert.equal(validateTranscript("오늘 날씨가 너무 좋아서 친구와 카페에서 커피를 마셨다"), false);
  assert.equal(validateTranscript("맥북 프로 16인치 M3 맥스 스페이스 블랙"), false);

  // 약봉투처럼 약 이름·용법만 있어도 통과, 원문에서 확인된 항목이 있으면 통과
  assert.equal(validateTranscript("타이레놀이알서방정 650mg 1일 3회 아침 점심 저녁"), true);
  assert.equal(validateTranscript("짧은 글", 1), true);
  // 너무 짧은 텍스트 차단
  assert.equal(validateTranscript("서울병원 진료"), false);
  assert.equal(validateTranscript(""), false);
});

test("서류 양식: 원문에 있는 값만 채우고 없으면 빈칸, 사람이 고친 값은 양식 칸만 받는다", async () => {
  const { verifyFields, cleanFields, missingCount, fieldLines } = await import("./extract.ts");
  const t = "필독약국\n슈가메트서방정 35/1000mg\n1일 1회 저녁식사 직후 1정 복용\n알마겔정\n조제일 2020.02.07";
  const f = verifyFields(t, "medication", {
    fields: { 조제일: "2020.02.07", 며칠분: "7일분", 약국: "필독약국", 합계: "34,300원" },
    meds: [{ name: "슈가메트서방정", how: "1일 1회 저녁식사 직후 1정 복용" }, { name: "알마겔정", how: "1일 3회" }, { name: "타이레놀", how: "1일 3회" }, { name: "슈가메트서방정", how: "" }],
  });
  assert.deepEqual(f.values, { 조제일: "2020.02.07", 며칠분: "", 약국: "필독약국" }); // 원문에 없는 '7일분'은 빈칸, 양식 밖 '합계'는 버림
  assert.deepEqual(f.meds, [{ name: "슈가메트서방정", how: "1일 1회 저녁식사 직후 1정 복용" }, { name: "알마겔정", how: "" }]); // 지어낸 약·복용법은 버림, 중복 제거
  assert.equal(missingCount("medication", f), 2); // 며칠분 + 알마겔정 먹는 법
  assert.deepEqual(fieldLines("medication", f).slice(0, 2), ["슈가메트서방정: 1일 1회 저녁식사 직후 1정 복용", "알마겔정: 먹는 법 못 읽음"]);
  const c = cleanFields("receipt", { values: { 합계: " 34,300원 ", 엉뚱한칸: "x" }, meds: [{ name: "a" }] });
  assert.equal(c.values.합계, "34,300원");
  assert.equal("엉뚱한칸" in c.values, false);
  assert.deepEqual(c.meds, []);
});
