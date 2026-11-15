import test from "node:test";
import assert from "node:assert/strict";
import { taskIcs } from "./ics.ts";
import { summarize, type Daily } from "./report.ts";
import { isEmergency, verifyAnswer, parseChatJson, chips } from "./chat.ts";
import { itemsFromText, maskIds } from "./extract.ts";
import { phaseOf, seedTasks } from "./timeline.ts";

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
});

test("챗봇: 응급 표현 감지, 일상 질문은 통과", () => {
  for (const q of ["숨이 차요", "열이 38.5도예요", "가슴이 아프대요", "호흡곤란이 있어요"]) assert.equal(isEmergency(q), true, q);
  for (const q of ["샤워는 언제부터 돼?", "이 약 언제 먹어?"]) assert.equal(isEmergency(q), false, q);
});

test("챗봇: 서류가 없어도 우리 집 정보 질문 3개 + 용어 질문, 최대 6개", () => {
  assert.deepEqual(chips([]).slice(0, 3), ["오늘 뭐부터 하면 돼?", "다음 병원 일정은 언제야?", "우리가 받을 수 있는 지원 알려줘"]);
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
