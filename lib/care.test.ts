import test from "node:test";
import assert from "node:assert/strict";
import { taskIcs, feedIcs } from "./ics.ts";
import { summarize, type Daily } from "./report.ts";
import { timeContextCheer, weekendDischargeWarning } from "./format.ts";
import { searchGlossary } from "./glossary.ts";
import { isEmergency, isCrisis, verifyAnswer, parseChatJson, chips } from "./chat.ts";
import { itemsFromText, maskIds } from "./extract.ts";
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

test("약 개수는 목록의 서로 다른 약 이름 수로 고친다", async () => {
  const { fixMedCount } = await import("./chat.ts");
  const s = "모두 6가지예요.\n11월 17일에 넣은 약봉투 기준이에요.\n아침 식사 직후: 듀비에트정, 광동아스피린장용정, 다이크로짇정\n식후 30분: 애니코프정(1일 3회), 소론도정(1일 3회)\n저녁 식사 직후: 슈가메트서방정\n식전 또는 식후 1시간: 알마겔정";
  assert.equal(fixMedCount(s).split("\n")[0], "모두 7가지예요.");
  // 같은 약이 두 때에 나와도 한 번만 센다
  assert.equal(fixMedCount("아침에는 9가지예요\n아침: 가정, 나정\n점심: 가정").split("\n")[0], "아침에는 2가지예요");
  // 목록이 없으면 그대로
  assert.equal(fixMedCount("모두 3가지예요."), "모두 3가지예요.");
});

test("한 줄로 붙여 쓴 약 목록도 줄을 나눠 세고, 약 목록이 없는 답은 건드리지 않는다", async () => {
  const { fixMedCount } = await import("./chat.ts");
  const s = "아침에는 4가지예요. 11월 17일에 넣은 약봉투 기준이에요. 아침 식사 직후: 듀비에트정, 광동아스피린장용정, 다이크로짇정. 식후 30분: 애니코프정(1일 3회), 소론도정(1일 3회)";
  assert.equal(fixMedCount(s), "아침에는 5가지예요.\n11월 17일에 넣은 약봉투 기준이에요.\n아침 식사 직후: 듀비에트정, 광동아스피린장용정, 다이크로짇정\n식후 30분: 애니코프정(1일 3회), 소론도정(1일 3회)");
  const prose = "퇴원 후에는 소화가 잘 되는 음식이 좋아요. 예를 들어 죽이나 계란찜이에요.";
  assert.equal(fixMedCount(prose), prose);
});

test("챗봇 답의 글자 그대로인 \n은 줄바꿈으로", () => {
  assert.equal(parseChatJson('{"summary":"아침에는 3가지예요.\\n아침: 가정"}').summary, "아침에는 3가지예요.\n아침: 가정");
});

test("챗봇: '아파요'도 응급으로 잡고, 죽고 싶다는 말은 위기 안내로 분리한다", () => {
  for (const q of ["가슴이 아파요", "가슴이 아팠어요"]) assert.equal(isEmergency(q), true, q);
  for (const q of ["너무 힘들어서 죽고 싶다는 생각이 들어", "자살하고 싶어요", "그냥 사라지고 싶다"]) assert.equal(isCrisis(q), true, q);
  for (const q of ["샤워는 언제부터 돼?", "약 먹고 죽처럼 부드러운 음식 먹어도 돼?", "수술이 힘들었어요"]) assert.equal(isCrisis(q), false, q);
});

test("챗봇: '적혀 있지 않아요' 답에는 엉뚱한 근거 인용을 붙이지 않는다", () => {
  const docs = [{ label: "서류", text: "11월 27일 정형외과 외래" }];
  const a = verifyAnswer({ summary: "다음 CT 검사 날짜는 적혀 있지 않아요.", sourceQuote: "11월 27일 정형외과 외래", advice: "" }, docs);
  assert.equal(a.sourceQuote, "");
  assert.equal(a.unverified, false);
});

test("지원↔할 일: 제목·benefit_id로 지원을 찾고, 신청 방법 방식을 짐작하고, 기본 날짜는 이틀 뒤(마감이 가까우면 마감일)", async () => {
  const { benefitIdOfTask, benefitTaskTitle, applyWays, defaultBenefitDue } = await import("./benefit-task.ts");
  const { BENEFITS } = await import("./benefits.ts");
  const b = BENEFITS[0];
  assert.equal(benefitIdOfTask({ benefit_id: "x1", source: "manual", title: "아무 제목" }), "x1");
  assert.equal(benefitIdOfTask({ source: "benefit", title: `${b.name} 신청 알아보기` }), b.id); // 예전에 자동으로 만든 할 일
  assert.equal(benefitIdOfTask({ source: "benefit", title: benefitTaskTitle(b.name) }), b.id);
  assert.equal(benefitIdOfTask({ source: "template", title: `${b.name} 신청 알아보기` }), null);
  assert.deepEqual(applyWays("주민센터·보건소 전화 문의 후 방문(신분증 지참), 또는 공유누리(eshare.go.kr) 온라인 예약"), ["온라인", "방문", "전화"]);
  assert.deepEqual(applyWays("복지로에서 신청"), ["온라인"]);
  assert.deepEqual(applyWays("", "1577-1000"), ["전화"]);
  assert.equal(defaultBenefitDue("2026-11-18"), "2026-11-20");
  assert.equal(defaultBenefitDue("2026-11-18", "2026-11-19"), "2026-11-19");
  assert.equal(defaultBenefitDue("2026-11-18", "2026-12-30"), "2026-11-20");
  assert.equal(defaultBenefitDue("2026-11-18", "2026-11-10"), "2026-11-18"); // 마감이 지났어도 날짜는 오늘로
});

test("전화 문장: 입원 이유·퇴원일을 채우고, 퇴원 전이면 '퇴원할 예정', 확인 필요면 대상 확인 부탁", async () => {
  const { callScript } = await import("./benefit-task.ts");
  const base = { name: "휠체어 무료 대여", reason: "ortho", dischargeDate: "2026-11-15", today: "2026-11-18", selfCare: false, check: false };
  assert.match(callScript(base), /저희 가족이 정형외과 수술로 11월 15일에 퇴원했어요/);
  assert.match(callScript({ ...base, today: "2026-11-10" }), /퇴원할 예정이에요/);
  assert.match(callScript({ ...base, selfCare: true }), /제가 정형외과 수술로/);
  assert.match(callScript({ ...base, check: true }), /대상이 되는지도 확인/);
  assert.match(callScript({ ...base, dischargeDate: null }), /입원했다가 퇴원했어요/);
});

test("서류 안내: 알려진 서류만 어디서 받는지 붙이고, 모르는 것·따로 없음은 붙이지 않는다", async () => {
  const { docHint } = await import("./doc-hints.ts");
  assert.match(docHint("신분증 (나머지는 상담 때 안내)")!, /본인 신분증/);
  assert.match(docHint("퇴원을 확인할 수 있는 서류")!, /원무과/);
  assert.match(docHint("가족관계증명서")!, /정부24/);
  assert.equal(docHint("따로 없음 (전화 상담 후 안내)"), null);
  assert.equal(docHint("회사에 내는 신청서 (회사 양식)") !== null, true);
  assert.equal(docHint("근로중단확인서"), null);
});

test("신청 날짜 후보: 마감 안의 날짜만, 마감일도 후보로, 미리 고르는 건 3일 뒤(마감이 가까우면 가장 늦은 날)", async () => {
  const { dueOptions, recommendedDue } = await import("./due-options.ts");
  const far = dueOptions("2026-11-18", "2026-11-29");
  assert.deepEqual(far.map((o) => o.date), ["2026-11-18", "2026-11-19", "2026-11-21", "2026-11-25", "2026-11-29"]);
  assert.equal(recommendedDue(far), "2026-11-21");
  const near = dueOptions("2026-11-18", "2026-11-19");
  assert.deepEqual(near.map((o) => o.date), ["2026-11-18", "2026-11-19"]);
  assert.equal(recommendedDue(near), "2026-11-19");
  assert.equal(dueOptions("2026-11-18").length, 4); // 마감이 없으면 네 가지
});

test("챗봇 자료: 외래 때 적은 답 메모가 한 줄로 들어가고, 답 없는 질문은 안 들어간다", async () => {
  const { caseBrief } = await import("./brief.ts");
  const { evaluate } = await import("./benefits.ts");
  const input = { dischargeDate: "2026-11-18", birthYear: 1958, sido: "서울", sigungu: "마포구", reason: "ortho", living: "away", income: "mid" } as const;
  const text = caseBrief({
    input, today: "2026-11-20", members: [{ id: "a", name: "지은", role: "admin" }],
    tasks: [
      { title: "샤워 언제부터 되나요?", kind: "question", due_date: null, assignee_id: null, done: true, memo: "다음 주부터 가능,\n사우나는 한 달 뒤", done_at: "2026-11-19T05:00:00Z" },
      { title: "실밥은 언제 빼나요?", kind: "question", due_date: null, assignee_id: null, done: false },
    ],
    results: evaluate(input, "2026-11-20"), status: {}, hospital: "", silson24: null, packet: [],
  });
  assert.match(text, /^- 11월 19일 질문 "샤워 언제부터 되나요\?" → 들은 답: 다음 주부터 가능, 사우나는 한 달 뒤$/m);
  assert.doesNotMatch(text, /들은 답: .*실밥/);
});

test("외래 리포트: 말하기 요약은 기록한 값만 문장으로 옮긴다", async () => {
  const { summarize, speakScript } = await import("./report.ts");
  const day = (d: string, o = {}) => ({ check_date: d, med_morning: true, med_lunch: true, med_dinner: true, side_effect: false, temp: "normal" as const, wound_issue: false, pain: 3, bowel: "good" as const, ...o });
  const none = speakScript(summarize([day("2026-11-19")], "2026-11-16", "2026-11-19"));
  assert.match(none, /퇴원 후 4일 중 1일을 기록했어요/);
  assert.match(none, /모두 이상 없었어요/);
  const some = speakScript(summarize([day("2026-11-18", { temp: "mild", pain: 6 }), day("2026-11-19", { side_effect: true })], "2026-11-18", "2026-11-19"));
  assert.match(some, /다만 11월 18일 미열 \/ 11월 19일 약 먹고 불편함이 있었어요/);
  assert.equal(speakScript(summarize([], "2026-11-18", "2026-11-19")), "");
});
