// 지원 제도 규칙표. 판정은 규칙만 쓴다(AI 판정 없음). 제도가 바뀌면 이 파일만 고친다.
// 출처·확인일은 화면에 그대로 노출된다.

export type Living = "alone" | "spouse" | "family";
export type Reason = "ortho" | "cancer" | "brain" | "heart" | "surgery" | "internal" | "other";
export type Income = "basic" | "near" | "none" | "unknown";

export interface CaseInput {
  dischargeDate: string | null; // YYYY-MM-DD, 미정이면 null
  birthYear: number;
  sido: string;
  sigungu: string;
  reason: Reason;
  living: Living;
  helpers: number;
  income: Income | null;
}

export type Verdict = "high" | "check" | "no";

interface Apply {
  phone?: string;
  place: string;
  url?: string;
}

interface Rule {
  when: { sido?: string; living?: Living[]; reason?: Reason[]; age?: "65+" | "under65" };
  verdict: Verdict;
  reason: string;
  apply?: Apply; // 지역별로 창구가 다를 때 덮어쓴다
}

export interface Benefit {
  id: string;
  name: string;
  operator: string;
  summary: string;
  cost: string;
  apply: Apply;
  docs: string[];
  deadline: { fromDaysBefore: number; toDaysAfter: number } | null; // 퇴원일 기준
  rules: Rule[]; // 위에서부터 처음 맞는 규칙이 판정
  fallback: { verdict: Verdict; reason: string };
  source: { label: string; url: string };
  lastVerified: string;
}

export const BENEFITS: Benefit[] = [
  {
    id: "seoul_recovery",
    name: "서울 퇴원 후 일상회복서비스",
    operator: "서울시",
    summary: "일상회복매니저(요양보호사)가 집에 와서 식사·청소·세탁·외출 동행을 도와줘요.",
    cost: "시간당 5,000원 (연 1회, 최대 15일·60시간)",
    apply: { phone: "1533-1179", place: "퇴원 24시간 전부터 퇴원 후 30일 이내 콜센터 신청" },
    docs: ["입퇴원확인서(병원 발급)"],
    deadline: { fromDaysBefore: 1, toDaysAfter: 30 },
    rules: [
      { when: { sido: "!서울" }, verdict: "no", reason: "서울 거주자 대상 제도예요" },
      { when: { reason: ["internal"], living: ["spouse", "family"] }, verdict: "check", reason: "일반 질환 퇴원은 제외될 수 있고, 보호자 유무 기준도 확인이 필요해요" },
      { when: { living: ["alone"] }, verdict: "high", reason: "서울 거주, 혼자 지내실 예정이라 조건에 맞을 가능성이 높아요" },
      { when: { living: ["spouse", "family"] }, verdict: "check", reason: "서울시 안내에 '보호자 없는 시민'과 '1인가구 여부 무관, 퇴원한 시민 누구나'가 함께 있어 기관 확인이 필요해요" },
    ],
    fallback: { verdict: "check", reason: "조건 확인이 필요해요" },
    source: { label: "내 손안에 서울 (서울시)", url: "https://mediahub.seoul.go.kr/archives/2007368" },
    lastVerified: "2026-11-15",
  },
  {
    id: "ltc_grade",
    name: "노인장기요양 등급 신청",
    operator: "국민건강보험공단",
    summary: "등급을 받으면 방문요양·주야간보호·복지용구 같은 장기요양 급여를 쓸 수 있어요. 신청 후 공단 방문조사와 판정을 거쳐요.",
    cost: "등급 판정 자체는 무료 (이용 시 본인부담 있음)",
    apply: { phone: "1577-1000", place: "건강보험공단 지사 방문·우편·팩스·인터넷, 대리 신청 가능" },
    docs: ["장기요양인정신청서", "의사소견서(공단 요청 시)", "대리 신청 시 대리인 신분증·대리인지정서"],
    deadline: null,
    rules: [
      { when: { age: "65+" }, verdict: "high", reason: "65세 이상이라 신청 대상이 될 수 있어요" },
      { when: { age: "under65", reason: ["brain"] }, verdict: "check", reason: "65세 미만은 뇌혈관 질환 등 노인성 질병이 있어야 해요" },
    ],
    fallback: { verdict: "no", reason: "65세 미만은 노인성 질병이 있는 경우에만 신청할 수 있어요" },
    source: { label: "국민건강보험공단 노인장기요양보험", url: "https://www.longtermcare.or.kr" },
    lastVerified: "2026-11-15",
  },
  {
    id: "integrated_care",
    name: "통합돌봄 (퇴원환자 연계)",
    operator: "시·군·구 / 협약병원",
    summary: "퇴원 후 의료·요양·돌봄·주거 서비스를 한 번에 연결해 줘요. 병원 퇴원 연계 담당자나 지자체 통합돌봄 담당 부서가 안내해요.",
    cost: "연계 서비스별로 다름",
    apply: { phone: "129", place: "병원 퇴원 연계 담당자 또는 시·군·구 통합돌봄 전담팀" },
    docs: ["신분증", "병원 퇴원(예정) 확인 자료"],
    deadline: null,
    rules: [
      { when: { age: "under65" }, verdict: "no", reason: "2026년은 노인(65세 이상)이 주 대상이에요 (중증 장애인은 시범사업)" },
      { when: { sido: "서울", age: "65+" }, verdict: "high", reason: "서울 거주 65세 이상이라 서울형 통합돌봄 대상일 가능성이 높아요", apply: { phone: "1668-0120", place: "본인·가족이 자치구 또는 동주민센터에 신청" } },
      { when: { age: "65+", living: ["alone"] }, verdict: "high", reason: "65세 이상 혼자 지내셔서 연계 대상일 가능성이 높아요" },
      { when: { age: "65+" }, verdict: "check", reason: "65세 이상이에요. 보호자 돌봄이 어려운지 등 지자체 판단이 필요해요" },
    ],
    fallback: { verdict: "check", reason: "나이 조건 확인이 필요해요" },
    source: { label: "보건복지부 · 서울시", url: "https://mediahub.seoul.go.kr/archives/2017580" },
    lastVerified: "2026-11-15",
  },
  {
    id: "nhis_cap",
    name: "본인부담상한제 환급",
    operator: "국민건강보험공단",
    summary: "1년간 낸 건강보험 본인부담금이 소득 구간별 상한을 넘으면 초과분을 돌려받아요. 비급여·상급병실료 등은 제외돼요.",
    cost: "환급 (받는 쪽)",
    apply: { phone: "1577-1000", place: "공단 안내문을 받은 뒤 계좌 등록·신청" },
    docs: ["본인 명의 계좌", "안내문(공단 발송)"],
    deadline: null,
    rules: [],
    fallback: { verdict: "check", reason: "올해 병원비가 크다면 대상이 될 수 있어요. 내년 8월경부터 공단 안내가 와요" },
    source: { label: "국민건강보험공단", url: "https://www.nhis.or.kr" },
    lastVerified: "2026-11-15",
  },
  {
    id: "private_insurance",
    name: "민간보험 청구 (실손·진단비·간병)",
    operator: "가입 보험사",
    summary: "부모님 가입 보험이 있다면 입원·수술비 청구를 챙기세요. 보험마다 청구 기한이 달라요.",
    cost: "환급 (받는 쪽)",
    apply: { place: "가입 보험사 앱·고객센터·팩스" },
    docs: ["입퇴원확인서", "진단서(필요 시)", "진료비 영수증·세부내역서"],
    deadline: null,
    rules: [],
    fallback: { verdict: "check", reason: "가입 여부는 직접 확인이 필요해요" },
    source: { label: "각 보험사 약관", url: "https://www.fss.or.kr" },
    lastVerified: "2026-11-15",
  },
];

export const REASONS: Reason[] = ["ortho", "cancer", "brain", "heart", "surgery", "internal", "other"];
export const LIVINGS: Living[] = ["alone", "spouse", "family"];

// 신뢰 경계 검증: 클라이언트가 보낸 값을 그대로 믿지 않는다. 잘못되면 null.
export function validateInput(raw: unknown, today: string): CaseInput | null {
  const r = raw as Partial<CaseInput> | null;
  if (!r || typeof r !== "object") return null;
  const d = r.dischargeDate ?? null;
  if (d !== null) {
    if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d))) return null;
    const diff = dayDiff(d, today);
    if (diff < -30 || diff > 60) return null;
  }
  if (!Number.isInteger(r.birthYear) || r.birthYear! < 1900 || r.birthYear! > Number(today.slice(0, 4))) return null;
  if (!REASONS.includes(r.reason as Reason) || !LIVINGS.includes(r.living as Living)) return null;
  if (typeof r.sido !== "string" || !r.sido || r.sido.length > 10) return null;
  const helpers = Number(r.helpers);
  return {
    dischargeDate: d, birthYear: r.birthYear!, sido: r.sido, sigungu: typeof r.sigungu === "string" ? r.sigungu.slice(0, 20) : "",
    reason: r.reason as Reason, living: r.living as Living,
    helpers: Number.isFinite(helpers) ? Math.min(5, Math.max(0, Math.trunc(helpers))) : 0,
    income: (["basic", "near", "none", "unknown"] as const).includes(r.income as Income) ? (r.income as Income) : null,
  };
}

export const STATUS_LABEL: Record<string, string> = {
  none: "미신청", applied: "신청함", approved: "승인", rejected: "거절", dropped: "포기",
};

// ---- 판정 엔진 ----

const MS_DAY = 86_400_000;
export const dayDiff = (a: string, b: string) => Math.round((Date.parse(a) - Date.parse(b)) / MS_DAY);

// 만 나이를 정확히 모르므로 [lo, hi] 범위로 본다. 경계에 걸리면 확인 필요로 처리하려고 null 반환.
function ageClass(birthYear: number, year: number): "65+" | "under65" | null {
  const hi = year - birthYear;
  const lo = hi - 1;
  if (lo >= 65) return "65+";
  if (hi < 65) return "under65";
  return null;
}

export interface Result {
  benefit: Benefit;
  verdict: Verdict;
  reason: string;
  apply: Apply;
  deadline: { state: "unknown" | "open" | "closed"; daysLeft?: number; endDate?: string };
}

export function evaluate(input: CaseInput, today: string): Result[] {
  const year = Number(today.slice(0, 4));
  const age = ageClass(input.birthYear, year);

  return BENEFITS.map((b) => {
    let verdict = b.fallback.verdict;
    let reason = b.fallback.reason;
    let apply = b.apply;

    // 나이가 경계(65세 전후 1년)면 나이 조건이 걸린 규칙은 확인 필요로 돌린다
    const ageBoundary = age === null && b.rules.some((r) => r.when.age);
    if (ageBoundary) {
      verdict = "check";
      reason = "만 65세 경계에 있어 정확한 생일 기준 확인이 필요해요";
    } else {
      for (const r of b.rules) {
        const w = r.when;
        const sidoOk = !w.sido || (w.sido.startsWith("!") ? input.sido !== w.sido.slice(1) : input.sido === w.sido);
        if (sidoOk && (!w.living || w.living.includes(input.living)) && (!w.reason || w.reason.includes(input.reason)) && (!w.age || w.age === age)) {
          verdict = r.verdict;
          reason = r.reason;
          if (r.apply) apply = r.apply;
          break;
        }
      }
    }

    // 소득 모름이면 소득 조건 제도는 확인 필요 (현재 규칙표엔 소득 조건 제도가 없음 — 생기면 여기서 처리)

    let deadline: Result["deadline"] = { state: "unknown" };
    if (b.deadline && input.dischargeDate) {
      const endDate = new Date(Date.parse(input.dischargeDate) + b.deadline.toDaysAfter * MS_DAY).toISOString().slice(0, 10);
      const daysLeft = dayDiff(endDate, today);
      deadline = daysLeft < 0 ? { state: "closed", endDate } : { state: "open", daysLeft, endDate };
    }
    return { benefit: b, verdict, reason, apply, deadline };
  });
}

// 정렬: 높음 → 확인 필요 → 해당 없음, 같은 그룹 안에서는 마감 임박 순
export function sortResults(rs: Result[]): Result[] {
  const rank = { high: 0, check: 1, no: 2 } as const;
  const left = (r: Result) => (r.deadline.state === "open" ? r.deadline.daysLeft! : Infinity);
  return [...rs].sort((a, b) => rank[a.verdict] - rank[b.verdict] || left(a) - left(b));
}
