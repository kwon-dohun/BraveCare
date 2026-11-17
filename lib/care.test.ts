import test from "node:test";
import assert from "node:assert/strict";
import { taskIcs, feedIcs } from "./ics.ts";
import { summarize, type Daily } from "./report.ts";
import { timeContextCheer, weekendDischargeWarning } from "./format.ts";
import { searchGlossary } from "./glossary.ts";
import { isEmergency, verifyAnswer, parseChatJson, chips } from "./chat.ts";
import { itemsFromText, maskIds, extractCautionTags } from "./extract.ts";
import { phaseOf, seedTasks } from "./timeline.ts";
import { identifyScannedPacketDocs } from "./packet.ts";

const day = (d: string, p: Partial<Daily> = {}): Daily => ({ check_date: d, med_morning: true, med_lunch: true, med_dinner: true, side_effect: false, temp: "normal", wound_issue: false, pain: 2, bowel: "good", ...p });

test("ics: 종일 일정에 전날 저녁·당일 아침 알람 두 개, 특수문자는 이스케이프", () => {
  const ics = taskIcs({ id: "t1", title: "외래 동행; 정형외과, 2층", due_date: "2026-11-30", memo: "신분증\n예약증", kind: "schedule" }, "서울병원");
  assert.match(ics, /DTSTART;VALUE=DATE:20261130\r\n/);
  assert.match(ics, /DTEND;VALUE=DATE:20261201\r\n/); // 월말을 넘긴다
  assert.ok(ics.includes(String.raw`SUMMARY:[씩씩케어] 외래 동행\; 정형외과\, 2층`));
  assert.ok(ics.includes(String.raw`DESCRIPTION:병원: 서울병원\n신분증\n예약증`));
  assert.equal(ics.match(/BEGIN:VALARM/g)!.length, 2);
  assert.ok(ics.includes("TRIGGER:-PT4H") && ics.includes("TRIGGER:PT8H30M"));
});

test("ics: 전체 일정 feedIcs 생성 - 퇴원일 및 여러 VEVENT가 올바르게 합쳐진다", () => {
  const tasks = [
    { id: "t1", title: "원무과 서류 받기", due_date: "2026-11-20", memo: null, kind: "admin" },
    { id: "t2", title: "정형외과 외래", due_date: "2026-11-27", due_time: "14:00", memo: "신분증", kind: "schedule" },
  ];
  const feed = feedIcs(tasks, { calName: "홍길동 가족", hospital: "아산병원", dischargeDate: "2026-11-20" });
  assert.match(feed, /X-WR-CALNAME:홍길동 가족/);
  assert.match(feed, /X-WR-TIMEZONE:Asia\/Seoul/);
  assert.ok(feed.includes("[씩씩케어] 퇴원하는 날"));
  assert.ok(feed.includes("[씩씩케어] 원무과 서류 받기"));
  assert.ok(feed.includes("[씩씩케어] 정형외과 외래"));
  assert.equal(feed.match(/BEGIN:VEVENT/g)!.length, 3);
});

test("리포트: 복약률은 기록한 날 기준, 기록률을 같이 낸다", () => {
  const s = summarize([day("2026-11-21"), day("2026-11-22", { med_dinner: false, temp: "mild", pain: 6 }), day("2026-11-24", { wound_issue: true, bowel: "constipation" })], "2026-11-20", "2026-11-26");
  assert.equal(s.days, 3);
  assert.equal(s.span, 7);
  assert.equal(s.adherence, 89); // 8/9
  assert.equal(s.avgPain, 3.3);
  assert.deepEqual(s.fevers, [{ date: "2026-11-22", temp: "mild" }]);
  assert.deepEqual(s.wounds, ["2026-11-24"]);
});

test("리포트: 3일 미만이면 평균을 내지 않고, 0건이면 복약률도 없다", () => {
  assert.equal(summarize([day("2026-11-21")], "2026-11-21", "2026-11-21").avgPain, null);
  const empty = summarize([], "2026-11-21", "2026-11-21");
  assert.equal(empty.adherence, null);
  assert.equal(empty.maxPain, null);
});

test("챗봇: 서류에 없는 근거 문장은 버린다", () => {
  const docs = ["타이레놀 500mg 1일 3회\n식후 30분 복용"];
  assert.equal(verifyAnswer({ summary: "식후에 드세요", sourceQuote: "식후 30분  복용", advice: "" }, docs).sourceQuote, "식후 30분 복용");
  assert.equal(verifyAnswer({ summary: "빈속에 가능", sourceQuote: "빈속에 복용 가능", advice: "" }, docs).sourceQuote, "");
  assert.deepEqual(parseChatJson("죄송합니다"), { summary: "", sourceQuote: "", advice: "" });
  assert.equal(verifyAnswer({ summary: "죽이 좋아요. 병원에 확인해 보세요.", sourceQuote: "", advice: "병원에 확인해 보세요." }, docs).summary, "죽이 좋아요.");
  // 경고는 '인용했는데 자료에 없을 때'만. 일반 상식 답변(인용 없음)에는 경고를 붙이지 않는다
  assert.equal(verifyAnswer({ summary: "빈속에 가능", sourceQuote: "빈속에 복용 가능", advice: "" }, docs).unverified, true);
  assert.equal(verifyAnswer({ summary: "부드러운 음식", sourceQuote: "", advice: "" }, docs).unverified, false);
});

test("챗봇: 응급 표현 감지, 일상 질문은 통과", () => {
  for (const q of ["숨이 차요", "열이 38.5도예요", "가슴이 아프대요", "호흡곤란이 있어요"]) assert.equal(isEmergency(q), true, q);
  for (const q of ["샤워는 언제부터 돼?", "이 약 언제 먹어?"]) assert.equal(isEmergency(q), false, q);
});

test("챗봇: 서류가 없어도 우리 집 정보 질문 3개 + 용어 질문, 최대 6개", () => {
  assert.deepEqual(chips([]).slice(0, 3), ["오늘 뭐부터 하면 돼?", "다음 병원 일정은 언제야?", "받을 수 있는 지원 알려줘"]);
  assert.equal(chips(["medication", "guide", "receipt"]).length, 6);
  assert.ok(chips(["medication"]).includes("이 약은 언제, 어떻게 먹으라고 적혀 있어?"));
});

test("챗봇: 근거 문장이 어느 자료에서 왔는지 붙인다", () => {
  const src = [{ label: "서류", text: "식후 30분 복용" }, { label: "씩씩케어 정보", text: "퇴원일: 11월 18일" }];
  assert.equal(verifyAnswer({ summary: "", sourceQuote: "퇴원일: 11월 18일", advice: "" }, src).source, "씩씩케어 정보");
  assert.equal(verifyAnswer({ summary: "", sourceQuote: "없는 문장", advice: "" }, src).source, undefined);
});

test("병원 문자 붙여넣기: 날짜 있는 줄만 일정, 없으면 전체를 날짜 입력 대기로", () => {
  const items = itemsFromText("[OO병원] 예약 안내\r\n11월 27일(금) 14:00 정형외과 외래\n문의 02-123-4567", "2026-11-16");
  assert.deepEqual(items.map((i) => [i.text, i.date]), [["11월 27일(금) 14:00 정형외과 외래", "2026-11-27"]]);
  const vague = itemsFromText("다음 주에 외래 오세요", "2026-11-16");
  assert.equal(vague.length, 1);
  assert.equal(vague[0].needsCheck, true);
});

test("주민등록번호 뒷자리는 가린다", () => {
  assert.equal(maskIds("홍길동 540101-1234567 정형외과"), "홍길동 540101-******* 정형외과");
});

test("타임라인 단계: 퇴원 전·당일·회복·정기 외래, 직접 정한 날짜는 퇴원일과 비교", () => {
  assert.deepEqual([-3, 0, 14, 15].map((r) => phaseOf(r, null, null)), [0, 1, 2, 3]);
  assert.equal(phaseOf(null, "2026-12-20", "2026-11-20"), 3);
  assert.equal(phaseOf(null, "2026-12-20", null), null);
});

test("템플릿은 의료 지시가 아니라 확인·질문 형태", () => {
  const seeds = seedTasks({ dischargeDate: null, birthYear: 1990, sido: "서울", sigungu: "마포구", reason: "ortho", living: "away", income: "unknown" }, []);
  assert.ok(seeds.length > 15);
  for (const s of seeds) assert.doesNotMatch(s.title, /하세요|마세요|금지/, s.title);
});

test("홈 히어로: 퇴원 전·당일·후·미정을 큰 숫자 하나와 설명 한 줄로", async () => {
  const { heroLabel } = await import("./format.ts");
  assert.deepEqual(heroLabel("2026-11-18", "2026-11-16"), { big: "D-2", sub: "11월 18일 퇴원까지" });
  assert.deepEqual(heroLabel("2026-11-16", "2026-11-16"), { big: "D-Day", sub: "오늘 퇴원해요" });
  assert.equal(heroLabel("2026-11-10", "2026-11-16").big, "6일째");
  assert.equal(heroLabel(null, "2026-11-16").big, "D-?");
  // 셀프 케어 모드 1인칭 맞춤
  assert.deepEqual(heroLabel("2026-11-18", "2026-11-16", true), { big: "D-2", sub: "너무 걱정 마세요, 씩씩이가 하나씩 챙겨드릴게요" });
  assert.deepEqual(heroLabel("2026-11-16", "2026-11-16", true), { big: "D-Day", sub: "오늘 퇴원해요 · 서류와 약 챙겨서 조심히 귀가하세요" });
});

test("셀프 케어 모드: 할 일 템플릿 문구가 환자 1인칭으로 변환된다", async () => {
  const seeds = seedTasks({
    dischargeDate: "2026-11-20", birthYear: 1990, sido: "서울", sigungu: "마포구",
    reason: "ortho", living: "alone", income: "unknown", isSelfCare: true,
  }, []);
  const titles = seeds.map((s) => s.title);
  assert.ok(titles.includes("퇴원 수납할 때 원무과에 내 보험 청구 서류 4종 요청하기"));
  assert.ok(titles.includes("식사와 오늘 약 챙겨 먹기"));
  assert.ok(titles.includes("퇴원 일주일, 내 몸 상태 돌아보고 외래 때 물어볼 것 적어두기"));
  assert.ok(titles.includes("회진 때 의사 선생님께 '샤워 언제부터 되나요?' 여쭤보기"));
});

test("챗봇 자료: 우리 집 정보는 한 줄에 사실 하나, 오늘 할 일·병원 일정·담당자가 들어간다", async () => {
  const { caseBrief } = await import("./brief.ts");
  const { evaluate } = await import("./benefits.ts");
  const input = { dischargeDate: "2026-11-18", birthYear: 1958, sido: "서울", sigungu: "마포구", reason: "ortho", living: "away", income: "mid" } as const;
  const text = caseBrief({
    input, today: "2026-11-16", members: [{ id: "a", name: "지은", role: "admin" }, { id: "b", name: "민수", role: "member" }],
    tasks: [
      { title: "서류 받기", kind: "admin", due_date: "2026-11-16", assignee_id: "b", done: false },
      { title: "정형외과 외래", kind: "schedule", due_date: "2026-11-27", assignee_id: null, done: false },
    ],
    results: evaluate(input, "2026-11-16"), status: {}, hospital: "", silson24: null, packet: [],
  });
  assert.match(text, /^퇴원일: 11월 18일 \(2일 남음\)$/m);
  assert.match(text, /^입원 이유: 정형외과 수술/m);
  assert.match(text, /^- 11월 16일 서류 받기 \(행정, 민수\)$/m);
  assert.match(text, /^- 11월 27일 정형외과 외래 \(병원 일정, 담당자 없음\)$/m);
  assert.match(text, /^받을 가능성이 높은 지원 \d+개:$/m);
});

test("달력: 일요일 시작 격자, 퇴원일·할 일·미신청 지원 마감만 찍힌다", async () => {
  const { monthGrid, buildEvents, shiftMonth } = await import("./calendar.ts");
  const { evaluate } = await import("./benefits.ts");
  const g = monthGrid("2026-11");
  assert.equal(g[0][0], "2026-11-01"); // 2026-11-01은 일요일
  assert.equal(g.flat().filter(Boolean).length, 30);
  assert.equal(shiftMonth("2026-12", 1), "2027-01");
  assert.equal(shiftMonth("2026-01", -1), "2025-12");
  const input = { dischargeDate: "2026-11-18", birthYear: 1958, sido: "서울", sigungu: "마포구", reason: "ortho", living: "away", income: "mid" } as const;
  const results = evaluate(input, "2026-11-16");
  const ev = buildEvents({ input, results, status: {}, tasks: [{ id: "t", title: "외래", kind: "schedule", due_date: "2026-11-27", done: false, assignee_id: null }] });
  assert.equal(ev.get("2026-11-18")?.[0].kind, "discharge");
  assert.equal(ev.get("2026-11-27")?.[0].kind, "visit");
  const deadlines = [...ev.values()].flat().filter((e) => e.kind === "deadline");
  assert.ok(deadlines.length > 0);
  const applied = Object.fromEntries(deadlines.map((e) => [e.benefitId!, "applied"]));
  assert.equal([...buildEvents({ input, results, status: applied, tasks: [] }).values()].flat().filter((e) => e.kind === "deadline").length, 0);
});

test("시간대별 씩씩이 멘트: 새벽, 오전, 저녁 맞춤", () => {
  assert.equal(timeContextCheer("recovery", false, 3), "늦은 밤 간병 힘내세요. 응급 시엔 119");
  assert.equal(timeContextCheer("visit", false, 9), "오늘 외래 진료! 신분증 챙기기");
  assert.equal(timeContextCheer("pre", false, 9), "오늘 챙길 서류와 질문 확인하기");
  assert.equal(timeContextCheer("recovery", false, 20), "10초 데일리 체크를 남겨보세요");
  assert.equal(timeContextCheer("recovery", true, 20), "오늘 데일리 체크 완료! 푹 쉬세요");
});

test("주말 퇴원 보정: 월요일 퇴원 시 주말 원무과 휴무 사전 경고", () => {
  // 2026-11-23은 월요일. 2026-11-21(토요일)은 D-2
  const warn = weekendDischargeWarning("2026-11-23", "2026-11-21");
  assert.ok(warn);
  assert.match(warn, /일요일이라 원무과와 주민센터가 쉬어요/);

  // 화요일 퇴원(2026-11-24)은 D-1이 평일이므로 주말 경고 없음
  assert.equal(weekendDischargeWarning("2026-11-24", "2026-11-22"), null);
});

test("쉬운 용어 사전: 띄어쓰기·공백 무관 검색", () => {
  // "실손 24" -> "실손24" 매칭
  const r1 = searchGlossary("실손 24");
  assert.ok(r1.some((t) => t.word === "실손24"));

  // "산정 특례" -> "산정특례" 매칭
  const r2 = searchGlossary("산정 특례");
  assert.ok(r2.some((t) => t.word === "산정특례"));

  // "발사" -> "실밥 제거(발사)" 매칭
  const r3 = searchGlossary("발사");
  assert.ok(r3.some((t) => t.word === "실밥 제거(발사)"));

  // 없는 단어 -> 빈 배열
  const r4 = searchGlossary("외계인방문");
  assert.equal(r4.length, 0);
});

test("사후 가입자 맞춤 멘트: 퇴원 후 7일 이내 초기 회복기 안내", () => {
  // 퇴원 후 3일차 오전: 서류/지원금 점검 유도
  assert.equal(timeContextCheer("recovery", false, 10, 3), "퇴원 3일째, 놓친 서류와 미신청 지원금부터 점검해 드릴게요");
  // 퇴원 후 3일차 저녁: 데일리 체크
  assert.equal(timeContextCheer("recovery", false, 19, 3), "퇴원 3일째, 데일리 체크를 남겨보세요");
  // 이미 오늘 체크 완료했으면 완료 멘트 우선
  assert.equal(timeContextCheer("recovery", true, 19, 3), "오늘 데일리 체크 완료! 푹 쉬세요");
});

test("서류 스캔 주의사항 키워드 추출: 보관법, 복약, 운전주의", () => {
  const text1 = "시럽제는 냉장 보관하시고 식후 30분에 드세요. 항생제는 처방일수대로 끝까지 복용하세요.";
  const tags1 = extractCautionTags(text1);
  assert.ok(tags1.includes("냉장 보관"));
  assert.ok(tags1.includes("식후 복용"));
  assert.ok(tags1.includes("끝까지 복용(임의 중단 금지)"));

  const text2 = "직사광선을 피하여 차광 보관할 것. 복용 후 졸음이 올 수 있으니 운전 주의.";
  const tags2 = extractCautionTags(text2);
  assert.ok(tags2.includes("차광 보관"));
  assert.ok(tags2.includes("졸음·운전 주의"));
});

test("서류 보관함 ↔ 원무과 4종 패키지 교차 식별", () => {
  const docs = [
    { doc_type: "receipt", transcript: "진료비 계산서 영수증 총액 450,000원" },
    { doc_type: "guide", transcript: "퇴원 확인서 및 입퇴원확인서 질병분류코드 S82.1" },
  ];
  const matched = identifyScannedPacketDocs(docs);
  assert.ok(matched.includes("receipt"));
  assert.ok(matched.includes("admission"));
  assert.ok(!matched.includes("disabled_cert"));
});

test("도움 요청 문구: 열쇠가 든 주소를 넣지 않고 이모지도 쓰지 않는다", async () => {
  const { helpRequestText } = await import("./task-help.ts");
  const text = helpRequestText({ title: "외래 동행", when: "11월 27일 오후 2:00", memo: "예약증은 냉장고 옆" }, "https://bravecare-kr.vercel.app");
  assert.match(text, /할 일: 외래 동행/);
  assert.match(text, /메모: 예약증은 냉장고 옆/);
  assert.ok(!/\/c\/|\/m\//.test(text));
  assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(text));
});
