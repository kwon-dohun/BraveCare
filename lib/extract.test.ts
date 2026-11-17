import test from "node:test";
import assert from "node:assert/strict";
import { verifyItems, parseDate, parseModelJson, toDocItems, validateTranscript, verifyFields, progressOf, dateWarning, receiptNote } from "./extract.ts";

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

test("줄 표시(@일정 등)에서 항목을 뽑고, 표시를 뗀 원문을 돌려준다", () => {
  const raw = JSON.stringify({ docType: "guide", transcript: "퇴원 안내문\n@일정 외래 2026-11-27 10:30\n@주의사항 2주간 샤워 금지" });
  const p = parseModelJson(raw);
  assert.equal(p.transcript, "퇴원 안내문\n외래 2026-11-27 10:30\n2주간 샤워 금지");
  assert.deepEqual(verifyItems(p.transcript, p.items).map((i) => i.kind + ":" + i.text), ["schedule:외래 2026-11-27 10:30", "caution:2주간 샤워 금지"]);
});

test("모델이 표시를 빠뜨려도 전화번호·복약·방문 일정 줄은 코드가 잡는다", () => {
  const p = parseModelJson(JSON.stringify({ docType: "guide", transcript: "2026-11-27 정형외과 외래\n와파린정 2mg 하루 1회 저녁\n문의 02-3410-1234\n수술 2026-11-08 시행" }));
  assert.deepEqual(p.items.map((i) => i.kind), ["schedule", "medication", "contact"]);
});

test("진단서·영수증은 코드 규칙으로 일정을 만들지 않는다(과거 수술일 오탐 방지)", () => {
  const p = parseModelJson(JSON.stringify({ docType: "certificate", transcript: "2026년 11월 8일 수술 후 외래 추적 필요" }));
  assert.equal(p.items.length, 0);
});

test("한 줄에 날짜가 둘이면 날짜마다 항목을 나눈다 (11/27 의 / 는 나누지 않는다)", () => {
  const [a, b] = toDocItems([{ kind: "schedule", text: "2026-11-27 외래 / 2026-12-18 CT 검사" }], "2026-11-15");
  assert.deepEqual([a.date, b.date], ["2026-11-27", "2026-12-18"]);
  const [c] = toDocItems([{ kind: "schedule", text: "11/27 외래" }], "2026-11-15");
  assert.equal(c.date, "2026-11-27");
});

test("퇴원 안내문 칸은 고른 줄로 채워지고, 원문에 없는 줄은 빠진다", () => {
  const p = parseModelJson(JSON.stringify({ docType: "guide", transcript: "@일정 2026-11-27 외래\n@연락 문의 02-123-4567" }));
  const f = verifyFields(p.transcript, "guide", p).values;
  assert.equal(f["외래 일정"], "2026-11-27 외래");
  assert.equal(f["문의"], "문의 02-123-4567");
  assert.equal(verifyFields("원문", "guide", { fields: { 문의: "없는 줄" } }).values["문의"], "");
});

test("스트리밍 진행: 서류 종류와 옮겨 적은 글자 수를 중간 출력에서 읽는다", () => {
  assert.deepEqual(progressOf('{"docType": "med'), { docType: undefined, chars: 0, sorting: false });
  assert.deepEqual(progressOf('{"docType": "medication", "transcript": "환자 홍길'), { docType: "medication", chars: 5, sorting: false });
  const p = progressOf('{"docType": "guide", "transcript": "abc\n def", "fields": {"a"');
  assert.equal(p.sorting, true);
  assert.ok(p.chars >= 9 && p.chars <= 12); // 닫는 따옴표 앞뒤 몇 글자 오차는 허용
});

test("제목 줄(외래 예약)이 따로 있는 날짜 줄도 일정으로 잡고, '않게 하세요'도 주의사항으로 잡는다", () => {
  const p = parseModelJson(JSON.stringify({ docType: "guide", transcript: "외래 진료 예약\n11월 27일(금) 10:30 정형외과 3층 진료실\n12월 18일(금) 14:00 재활의학과\n입원일 2026-11-08\n1. 수술 부위는 2주간 물에 닿지 않게 하세요." }));
  assert.deepEqual(p.items.map((i) => i.kind), ["schedule", "schedule", "caution"]);
});

test("질병코드 대조: 점·소문자·O/0 혼동을 바로잡고, 없으면 상위 코드, 아예 없으면 null", async () => {
  const { normCode, findKcd } = await import("./kcd.ts");
  const table = { S720: ["대퇴골 경부의 골절"], S72: ["대퇴골의 골절"], I10: ["본태성(원발성) 고혈압", "고혈압"] };
  assert.equal(normCode("s72.0O"), "S7200");
  assert.deepEqual(findKcd(table, "S72.0"), { code: "S720", names: ["대퇴골 경부의 골절"], exact: true });
  assert.deepEqual(findKcd(table, "S72.00"), { code: "S720", names: ["대퇴골 경부의 골절"], exact: false }); // 5자리는 상위 코드로
  assert.equal(findKcd(table, "I10")?.names.length, 2);
  assert.equal(findKcd(table, "Z99.9"), null); // 없는 코드 = 다시 확인
  assert.equal(findKcd(table, "병명"), null);
});

test("일정 날짜 경고: 지난 날짜·1년 넘게 먼 날짜만", () => {
  assert.match(dateWarning("2026-11-10", "2026-11-18")!, /지난/);
  assert.equal(dateWarning("2026-11-18", "2026-11-18"), null);
  assert.equal(dateWarning("2027-11-18", "2026-11-18"), null);
  assert.match(dateWarning("2027-11-19", "2026-11-18")!, /1년/);
});

test("영수증 금액 검산: 일부가 합계보다 크면 알리고, 정상·빈칸은 조용히", () => {
  assert.equal(receiptNote({ 합계: "5,446,500원", 본인부담: "797,300원", 비급여: "1,460,000원" }), null);
  assert.ok(receiptNote({ 합계: "544,650원", 본인부담: "797,300원", 비급여: "" }));
  assert.equal(receiptNote({ 합계: "906,260", 본인부담: "640,800", 비급여: "544,000" }), null); // 환자부담 총액에 비급여가 포함된 서식
  assert.equal(receiptNote({ 합계: "", 본인부담: "797,300원" }), null);
});

test("흐림 점수: 평평한 사진은 0, 윤곽이 또렷하면 높다", async () => {
  const { sharpness, BLUR_MIN } = await import("./blur.ts");
  const w = 20, h = 20;
  const flat = new Uint8Array(w * h).fill(128);
  const checker = Uint8Array.from({ length: w * h }, (_, i) => ((i % w) + Math.floor(i / w)) % 2 ? 255 : 0);
  assert.equal(sharpness(flat, w, h), 0);
  assert.ok(sharpness(checker, w, h) > BLUR_MIN * 100);
});
