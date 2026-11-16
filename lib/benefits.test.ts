import test from "node:test";
import assert from "node:assert/strict";
import { evaluate, sortResults, validateInput, normalizeInput, BENEFITS, type CaseInput } from "./benefits.ts";
import { matchPacketDoc } from "./packet.ts";

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
