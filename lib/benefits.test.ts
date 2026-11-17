import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, sortResults, validateInput, normalizeInput, BENEFITS, type CaseInput } from "./benefits.ts";
import { matchPacketDoc } from "./packet.ts";
import { LOCAL } from "./benefit-local.ts";

// 72세, 서울, 낮에도 가족이 있음, 일반 가구
const senior: CaseInput = { dischargeDate: "2026-11-20", birthYear: 1954, sido: "서울", sigungu: "마포구", reason: "ortho", living: "home", income: "general" };
// 36세 맞벌이, 서울, 소득 모름 (기획서의 핵심 페르소나)
const worker: CaseInput = { dischargeDate: "2026-11-20", birthYear: 1990, sido: "서울", sigungu: "마포구", reason: "ortho", living: "away", income: "unknown" };
const T = "2026-11-15";
const by = (rs: ReturnType<typeof evaluate>, id: string) => rs.find((r) => r.benefit.id === id)!;

test("규칙표: id 중복 없음, 출처 URL은 https", () => {
  assert.equal(new Set(BENEFITS.map((b) => b.id)).size, BENEFITS.length);
  for (const b of BENEFITS) assert.match(b.source.url, /^https:/, b.id);
});

test("어르신(72세, 서울): 장기요양·통합돌봄·돌봄SOS 높음", () => {
  const rs = evaluate(senior, T);
  for (const id of ["ltc_grade", "integrated_care", "seoul_sos"]) assert.equal(by(rs, id).verdict, "high", id);
  assert.equal(by(rs, "integrated_care").apply.phone, "1668-0120");
  assert.equal(by(rs, "daily_care").verdict, "no"); // 65세 미만 제도
});

test("맞벌이 청장년(36세): 노인 제도는 해당 없음, 돌봄휴가·안심동행은 높음", () => {
  const rs = evaluate(worker, T);
  for (const id of ["family_care_leave", "seoul_escort"]) assert.equal(by(rs, id).verdict, "high", id);
  for (const id of ["ltc_grade", "seoul_sos", "senior_short_care", "special_calc"]) assert.equal(by(rs, id).verdict, "no", id);
});

test("소득을 모르면: 소득 조건 제도는 '소득 확인 필요', 소득 때문에 탈락시키지 않는다", () => {
  const rs = evaluate(worker, T);
  for (const id of ["catastrophic_medical", "emergency_medical", "seoul_paid_sick"]) {
    assert.equal(by(rs, id).verdict, "check", id);
    assert.equal(by(rs, id).needsIncome, true, id);
  }
});

test("소득을 알면: 수급·차상위는 긴급복지 높음, 일반 가구는 해당 없음", () => {
  assert.equal(by(evaluate({ ...worker, income: "basic" }, T), "emergency_medical").verdict, "high");
  assert.equal(by(evaluate({ ...worker, income: "general" }, T), "emergency_medical").verdict, "no");
  assert.equal(by(evaluate({ ...worker, income: "general" }, T), "catastrophic_medical").needsIncome, false);
});

test("암환자 의료비: 수급·차상위만 높음 (2026년 성인 신규 기준)", () => {
  assert.equal(by(evaluate({ ...worker, reason: "cancer", income: "basic" }, T), "cancer_cost").verdict, "high");
  assert.equal(by(evaluate({ ...worker, reason: "cancer", income: "mid" }, T), "cancer_cost").verdict, "no");
  assert.equal(by(evaluate(worker, T), "cancer_cost").verdict, "no");
});

test("지역 제도: 다른 지역이면 해당 없음, 상병수당은 시범 지역 시·도만 확인 필요", () => {
  assert.equal(by(evaluate({ ...worker, sido: "경기", sigungu: "" }, T), "seoul_escort").verdict, "no");
  assert.equal(by(evaluate({ ...worker, sido: "경기", sigungu: "" }, T), "gyeonggi_care").verdict, "high");
  assert.equal(by(evaluate({ ...worker, sido: "경기", sigungu: "" }, T), "sickness_benefit").verdict, "check");
  assert.equal(by(evaluate(worker, T), "sickness_benefit").verdict, "no");
});

test("상병수당: 2026 시범지역 8곳만, 시·도까지 맞아야 대상", () => {
  const at = (sido: string, sigungu: string) => by(evaluate({ ...worker, sido, sigungu }, T), "sickness_benefit");
  assert.match(at("경기", "안양시").reason, /시범지역에 해당/);
  assert.match(at("대구", "달서구").reason, /시범지역에 해당/);
  assert.equal(at("경남", "창원시").verdict, "no"); // 2022년 1단계 지역이라 지금은 아님
  assert.equal(at("서울", "중구").verdict, "no"); // 이름이 같은 다른 지역이 걸리지 않음
  assert.doesNotMatch(at("경기", "수원시").reason, /시범지역에 해당/); // 같은 도의 다른 시는 확인 필요로만
});

test("마감: 긴급복지는 퇴원 전까지, 재난적의료비는 퇴원 후 180일, 미정이면 unknown", () => {
  assert.deepEqual(by(evaluate(worker, T), "emergency_medical").deadline, { state: "open", daysLeft: 5, endDate: "2026-11-20" });
  assert.equal(by(evaluate(worker, "2026-11-21"), "emergency_medical").deadline.state, "closed");
  assert.equal(by(evaluate(worker, T), "catastrophic_medical").deadline.endDate, "2027-05-19");
  assert.equal(by(evaluate({ ...worker, dischargeDate: null }, T), "catastrophic_medical").deadline.state, "unknown");
});

test("만 65세 경계(2026-1961=65)는 확인 필요", () => {
  assert.equal(by(evaluate({ ...senior, birthYear: 1961 }, T), "ltc_grade").verdict, "check");
});

test("입력 검증: 잘못된 값은 거부, 이미 퇴원한 날짜는 허용, 소득이 없으면 모름", () => {
  assert.ok(validateInput(worker, T));
  assert.ok(validateInput({ ...worker, dischargeDate: "2026-08-01" }, T));
  assert.equal(validateInput({ ...worker, dischargeDate: "2024-01-01" }, T), null);
  assert.equal(validateInput({ ...worker, dischargeDate: "내일" }, T), null);
  assert.equal(validateInput({ ...worker, birthYear: 2030 }, T), null);
  assert.equal(validateInput({ ...worker, living: "spouse" }, T), null);
  assert.equal(validateInput(null, T), null);
  assert.equal(validateInput({ ...worker, income: "x" }, T)!.income, "unknown");
});

test("구버전 케이스 값은 지금 분류로 옮긴다", () => {
  const n = normalizeInput({ ...worker, living: "spouse", income: null });
  assert.equal(n.living, "home");
  assert.equal(n.income, "unknown");
});

test("정렬: 높음 → 확인 필요 → 해당 없음", () => {
  const order = sortResults(evaluate(worker, T)).map((r) => r.verdict);
  assert.deepEqual(order, [...order].sort((a, b) => "hcn".indexOf(a[0]) - "hcn".indexOf(b[0])));
});

test("서류 매칭: 복지 서류 문구와 원무과 4종 서류 매핑", () => {
  assert.equal(matchPacketDoc("입퇴원확인서(병원 발급)")?.id, "admission");
  assert.equal(matchPacketDoc("진료비 영수증 사본")?.id, "receipt");
  assert.equal(matchPacketDoc("진료비 세부내역서")?.id, "detail");
  assert.equal(matchPacketDoc("원무과 장애인증명서")?.id, "disabled_cert");
  assert.equal(matchPacketDoc("신분증"), null);
});

test("환자 본인이 쓰는 모드에는 가족돌봄휴가를 보여주지 않는다", () => {
  const base = { dischargeDate: "2026-11-20", birthYear: 1985, sido: "서울", sigungu: "마포구", reason: "surgery", living: "alone", income: "general" } as const;
  const v = (isSelfCare: boolean) => evaluate({ ...base, isSelfCare }, "2026-11-17").find((r) => r.benefit.id === "family_care_leave")!.verdict;
  assert.equal(v(true), "no");
  assert.notEqual(v(false), "no");
});

// 접수 마감 위험·오래된 확인일·초안: '높음'을 주지 않고 확인 필요로 낮춘다(월 1회 점검을 못 해도 틀린 확신을 주지 않게)
test("안전장치: closeRisk·확인일 만료·초안은 높음 → 확인 필요, 해당 없음은 그대로", () => {
  const mk = (id: string, extra: Partial<(typeof BENEFITS)[number]> = {}, verdict: "high" | "no" = "high") => ({
    id, name: id, operator: "시험", summary: "", cost: "", apply: { place: "" }, docs: [], deadline: null,
    rules: [{ when: {}, verdict, reason: "조건에 맞아요." }], fallback: { verdict: "check" as const, reason: "" },
    source: { label: "시험", url: "https://example.com" }, lastVerified: T, ...extra,
  });
  const fakes = [
    mk("t_fresh"), mk("t_risk", { closeRisk: "접수가 끝났을 수 있어요." }), mk("t_edge", { lastVerified: "2026-10-01" }), // 45일
    mk("t_stale", { lastVerified: "2026-09-30" }), mk("t_draft", { lastVerified: null }), mk("t_no", { lastVerified: null }, "no"),
  ];
  BENEFITS.push(...fakes);
  try {
    const rs = evaluate(worker, T);
    assert.equal(by(rs, "t_fresh").verdict, "high");
    assert.equal(by(rs, "t_fresh").demoted, undefined);
    assert.equal(by(rs, "t_risk").verdict, "check");
    assert.equal(by(rs, "t_risk").demoted, "closeRisk");
    assert.match(by(rs, "t_risk").reason, /조건에 맞아요\. 접수가 끝났을 수 있어요\./);
    assert.equal(by(rs, "t_edge").verdict, "high"); // 정확히 45일은 아직 유효
    assert.equal(by(rs, "t_stale").verdict, "check");
    assert.equal(by(rs, "t_stale").demoted, "stale");
    assert.equal(by(rs, "t_stale").verifiedAgo, 46);
    assert.equal(by(rs, "t_draft").demoted, "draft");
    assert.equal(by(rs, "t_draft").verifiedAgo, null);
    assert.equal(by(rs, "t_no").verdict, "no"); // 해당 없음에는 덧붙이지 않는다
    assert.equal(by(rs, "t_no").reason, "조건에 맞아요.");
  } finally {
    BENEFITS.splice(BENEFITS.length - fakes.length, fakes.length);
  }
});

test("안전장치: 시범사업·재고 제도에는 closeRisk가 달려 있어 높음이 나오지 않는다", () => {
  for (const id of ["sickness_benefit", "home_visit_doctor", "assistive_rental"]) assert.ok(BENEFITS.find((b) => b.id === id)!.closeRisk, id);
  assert.notEqual(by(evaluate({ ...worker, reason: "ortho" }, T), "assistive_rental").verdict, "high");
});

test("안전장치: 오늘이 확인일에서 45일을 넘으면 실제 제도도 높음이 확인 필요로 내려간다", () => {
  const later = "2027-01-15"; // 확인일(2026-11-15·16)에서 60일 안팎
  const rs = evaluate(worker, later);
  assert.equal(by(rs, "family_care_leave").verdict, "check");
  assert.equal(by(rs, "family_care_leave").demoted, "stale");
});

// ---- 지방 시·군·구 제도 (lib/benefit-local.ts) ----

test("지방 제도: 다른 지역 사람에게는 보이지 않는다 (만 65세 경계에서도), 출처와 확인일이 있다", () => {
  for (const b of LOCAL) {
    assert.ok(b.lastVerified, b.id);
    for (const input of [senior, { ...senior, birthYear: 1961 }, worker]) assert.equal(by(evaluate(input, T), b.id).verdict, "no", b.id);
  }
});

test("지방 제도: 이름이 같은 구(서구)는 시·도까지 맞춘다", () => {
  for (const sido of ["대구", "광주", "대전", "인천"]) assert.equal(by(evaluate({ ...senior, sido, sigungu: "서구" }, T), "busan_seogu_escort").verdict, "no", sido);
  assert.notEqual(by(evaluate({ ...senior, sido: "부산", sigungu: "서구" }, T), "busan_seogu_escort").verdict, "no");
});

test("지방 제도: 강원·전남·충남·부산 어르신 병원 동행 판정", () => {
  const at = (id: string, sido: string, sigungu: string, over: Partial<CaseInput> = {}) => by(evaluate({ ...senior, sido, sigungu, ...over }, T), id);
  assert.equal(at("gangwon_escort", "강원", "홍천군", { living: "alone" }).verdict, "high");
  assert.equal(at("gangwon_escort", "강원", "홍천군", { living: "home" }).verdict, "check");
  assert.equal(at("gangwon_escort", "강원", "홍천군", { birthYear: 1990 }).verdict, "no"); // 65세 미만
  assert.equal(at("hwacheon_escort", "강원", "화천군", { living: "home" }).verdict, "high"); // 자녀와 살아도 신청 가능
  assert.equal(at("gangjin_escort", "전남", "강진군").verdict, "check"); // 군 선정 절차
  assert.equal(at("buyeo_escort", "충남", "부여군", { living: "alone" }).verdict, "check"); // 70세 이상 홀몸
  assert.equal(at("buyeo_escort", "충남", "부여군", { living: "home" }).verdict, "no");
  const seogu = at("busan_seogu_escort", "부산", "서구", { living: "alone" });
  assert.equal(seogu.verdict, "check"); // 예산 조기 소진 이력이 있어 높음을 주지 않는다
  assert.equal(seogu.demoted, "closeRisk");
  assert.equal(at("gangjin_escort", "전남", "강진군", { birthYear: 1961 }).verdict, "check"); // 65세 경계
});

test("지방 제도: 경남형 통합돌봄(도민 누구나)·충북 공동간병(의료급여·차상위, 병상 한정)", () => {
  const at = (id: string, sido: string, sigungu: string, over: Partial<CaseInput> = {}) => by(evaluate({ ...worker, sido, sigungu, ...over }, T), id);
  assert.equal(at("gyeongnam_care", "경남", "함양군").verdict, "high"); // 36세 맞벌이도 대상 (나이 제한 없음)
  assert.equal(at("gyeongnam_care", "경남", "함양군", { living: "home" }).verdict, "check");
  assert.equal(at("gyeongnam_care", "경북", "의성군").verdict, "no");
  assert.equal(at("chungbuk_joint_nursing", "충북", "충주시", { income: "basic" }).verdict, "check"); // 입원 병원이 의료원이어야 해서 높음은 아님
  assert.equal(at("chungbuk_joint_nursing", "충북", "충주시", { income: "basic" }).demoted, "closeRisk");
  assert.equal(at("chungbuk_joint_nursing", "충북", "충주시", { income: "unknown" }).needsIncome, true);
  assert.equal(at("chungbuk_joint_nursing", "충북", "충주시", { income: "general" }).verdict, "no");
  assert.equal(at("chungbuk_joint_nursing", "충남", "천안시", { income: "basic" }).verdict, "no");
});

test("지방 제도(복지로 확인분): 통합돌봄·간병비·입원생활비·융자 판정", () => {
  const at = (id: string, sido: string, sigungu: string, over: Partial<CaseInput> = {}) => by(evaluate({ ...senior, sido, sigungu, ...over }, T), id);
  // 시·도 단위 통합돌봄: 혼자 지내면 높음, 아니면 확인 필요, 다른 지역은 해당 없음
  for (const [id, sido, gu] of [["busan_care", "부산", "해운대구"], ["jeju_care", "제주", "제주시"]] as const) {
    assert.equal(at(id, sido, gu, { living: "alone" }).verdict, "high", id);
    assert.equal(at(id, sido, gu, { living: "home" }).verdict, "check", id);
    assert.equal(at(id, "서울", "마포구").verdict, "no", id);
  }
  assert.equal(at("daejeon_care", "대전", "유성구", { living: "alone" }).verdict, "high");
  assert.equal(at("daejeon_care", "대전", "유성구", { birthYear: 1990 }).verdict, "check"); // 노인·장애인 등이라 65세 미만은 확인
  // 군 단위 어르신 돌봄: 65세 미만은 해당 없음
  assert.equal(at("hamyang_care", "경남", "함양군", { living: "alone" }).verdict, "high");
  assert.equal(at("hamyang_care", "경남", "함양군", { birthYear: 1990 }).verdict, "no");
  assert.equal(at("chuncheon_care", "강원", "춘천시", { living: "alone" }).verdict, "high");
  // 예산군: 수급·차상위 + 65세 이상, 소득을 모르면 확인 필요
  assert.equal(at("yesan_discharge_care", "충남", "예산군", { income: "basic", living: "alone" }).verdict, "high");
  assert.equal(at("yesan_discharge_care", "충남", "예산군", { income: "unknown", living: "alone" }).needsIncome, true);
  assert.equal(at("yesan_discharge_care", "충남", "예산군", { income: "general", living: "alone" }).verdict, "no");
  // 전주시: 2026-12-31 종료라 높음이 아니라 확인 필요 (closeRisk)
  assert.equal(at("jeonju_escort", "전북", "전주시").verdict, "check");
  assert.equal(at("jeonju_escort", "전북", "전주시").demoted, "closeRisk");
  // 간병비: 수급·차상위만, 입원 병원 확인이 필요해 확인 필요
  assert.equal(at("namwon_care", "전북", "남원시", { income: "basic" }).verdict, "check");
  assert.equal(at("namwon_care", "전북", "남원시", { income: "general" }).verdict, "no");
  for (const gu of ["제주시", "서귀포시"]) assert.equal(at("jeju_nursing", "제주", gu, { income: "basic" }).verdict, "check", gu);
  assert.equal(at("changnyeong_ward", "경남", "창녕군").verdict, "check"); // 65세 이상
  assert.equal(at("changnyeong_ward", "경남", "창녕군", { birthYear: 1990, income: "general" }).verdict, "no");
  // 입원생활비·융자
  assert.equal(at("chungnam_sick_pay", "충남", "천안시", { birthYear: 1990 }).verdict, "check");
  assert.equal(at("chungnam_sick_pay", "서울", "마포구", { birthYear: 1990 }).verdict, "no");
  assert.equal(at("chungbuk_medical_loan", "충북", "청주시").verdict, "high");
  assert.equal(at("chungbuk_medical_loan", "충북", "청주시", { birthYear: 1990, income: "general" }).verdict, "check");
  assert.equal(at("andong_visit_care", "경북", "안동시").verdict, "check");
  assert.equal(at("andong_visit_care", "경북", "의성군").verdict, "no");
});

test("강원 어르신 병원동행: 도 단위, 홍천·정선 같은 군에서도 뜬다", () => {
  for (const gu of ["홍천군", "정선군", "속초시"]) assert.equal(by(evaluate({ ...senior, sido: "강원", sigungu: gu, living: "alone" }, T), "gangwon_escort").verdict, "high", gu);
});
