import type { CaseInput, Reason, Result } from "./benefits.ts";

// 템플릿 문구는 의료 지시를 하지 않는다(의료법 제27조). "~하세요"가 아니라 의료진에게 확인할 질문 형태로 쓴다.
// kind "schedule"은 실제 병원 방문 일정(안내문·직접 입력)에만 쓴다. 홈의 '외래 당일' 판단이 이걸 본다.
export type TaskKind = "prep" | "question" | "schedule" | "admin" | "custom";
export interface TaskSeed {
  title: string;
  kind: TaskKind;
  rel: number; // 퇴원일 기준 D±n
  source: "template" | "benefit";
  benefitId?: string; // 지원 제도와 이어진 할 일
  preOnly?: boolean; // 퇴원 뒤에는 의미가 없는 일. 이미 지난 시점에 시작한 사람에게는 만들지 않는다
}

const COMMON: TaskSeed[] = [
  // 1단계: 퇴원 전 준비
  { rel: -3, kind: "question", title: "퇴원 후 먹을 약과 먹는 방법을 의료진에게 물어보기" },
  { rel: -3, kind: "prep", title: "집에서 미끄러지거나 걸려 넘어질 만한 곳 살펴보기" },
  { rel: -2, kind: "question", title: "기존에 먹던 약과 같이 먹어도 되는지 물어보기" },
  { rel: -2, kind: "prep", title: "퇴원 당일 이동 방법(차량 등)과 같이 갈 사람 정하기", preOnly: true },
  { rel: -1, kind: "question", title: "첫 외래 예약일과 진료과를 확인하기" },
  { rel: -1, kind: "question", title: "병원에 바로 연락해야 하는 증상이 무엇인지 물어보기" },
  { rel: -1, kind: "admin", title: "입원한 병원이 실손24 전산 청구가 되는지 확인하기" },
  { rel: -1, kind: "admin", title: "연말정산용 장애인증명서 발급 대상인지 주치의에게 물어보기" },
  // 2단계: 퇴원 당일
  { rel: 0, kind: "admin", title: "원무과에서 보험 청구 서류 4종 받기" },
  { rel: 0, kind: "question", title: "약국에서 약 설명을 들을 때 궁금한 점 물어보기", preOnly: true },
  { rel: 0, kind: "prep", title: "퇴원 안내문과 약봉투를 사진으로 남기기" },
  // 3단계: 집에서 회복, 첫 외래
  { rel: 1, kind: "prep", title: "식사와 약을 챙길 사람 정하기" },
  { rel: 1, kind: "prep", title: "데일리 체크 시작하기 (하루 10초)" },
  { rel: 7, kind: "prep", title: "퇴원 일주일, 불편한 점을 환자에게 물어보고 외래 때 물어볼 것 적어두기" },
  { rel: 13, kind: "prep", title: "첫 외래 전날: 외래 리포트와 물어볼 것 확인하기" },
  // 4단계: 정기 외래, 마무리
  { rel: 30, kind: "admin", title: "퇴원 30일 점검: 아직 신청하지 않은 지원 확인하기" },
  { rel: 30, kind: "prep", title: "다음 외래 예약증을 촬영해서 일정 갱신하기" },
  { rel: 90, kind: "admin", title: "보험 청구가 빠진 진료비가 없는지 확인하기" },
  { rel: 150, kind: "admin", title: "병원비가 컸다면 재난적의료비 신청 기한이 남았는지 확인하기" },
].map((t): TaskSeed => ({ ...t, source: "template", kind: t.kind as TaskKind }));

const BY_REASON: Partial<Record<Reason, Omit<TaskSeed, "source">[]>> = {
  ortho: [
    { rel: -3, kind: "question", title: "계단 이용과 샤워가 언제부터 가능한지 물어보기" },
    { rel: -3, kind: "question", title: "보행기·지팡이 같은 보조기구가 필요한지 물어보기" },
    { rel: -2, kind: "question", title: "재활치료 일정과 장소 확인하기" },
    { rel: 7, kind: "question", title: "수술 부위 소독 주기와 실밥 제거 일정을 병원에 문의하기" },
  ],
  cancer: [
    { rel: -3, kind: "question", title: "다음 치료 일정과 병원 방문 주기 확인하기" },
    { rel: -3, kind: "question", title: "식사에서 주의할 점이 있는지 물어보기" },
    { rel: -2, kind: "question", title: "산정특례 등록이 되어 있는지 원무과에 확인하기" },
  ],
  brain: [
    { rel: -3, kind: "question", title: "재활치료 일정과 장소 확인하기" },
    { rel: -3, kind: "question", title: "말하기·삼킴이 불편할 때 어디에 연락하면 되는지 물어보기" },
    { rel: -2, kind: "question", title: "산정특례 등록이 되어 있는지 원무과에 확인하기" },
  ],
  heart: [
    { rel: -3, kind: "question", title: "집에서 혈압·맥박을 확인해야 하는지, 방법은 무엇인지 물어보기" },
    { rel: -2, kind: "question", title: "산정특례 등록이 되어 있는지 원무과에 확인하기" },
  ],
  surgery: [
    { rel: -3, kind: "question", title: "수술 부위 관리와 소독이 필요한지 물어보기" },
    { rel: -3, kind: "question", title: "샤워 가능 시기를 물어보기" },
  ],
  internal: [{ rel: -3, kind: "question", title: "식사와 활동에서 주의할 점이 있는지 물어보기" }],
};

export const SELF_CARE_TITLE_MAP: Record<string, string> = {
  "원무과에서 보험 청구 서류 4종 받기": "퇴원 수납할 때 원무과에 내 보험 청구 서류 4종 요청하기",
  "식사와 약을 챙길 사람 정하기": "식사와 오늘 약 챙겨 먹기",
  "퇴원 일주일, 불편한 점을 환자에게 물어보고 외래 때 물어볼 것 적어두기": "퇴원 일주일, 내 몸 상태 돌아보고 외래 때 물어볼 것 적어두기",
  "퇴원 당일 이동 방법(차량 등)과 같이 갈 사람 정하기": "퇴원 당일 이동 방법(병원 안심동행 또는 택시) 챙기기",
  "계단 이용과 샤워가 언제부터 가능한지 물어보기": "회진 때 의사 선생님께 '샤워 언제부터 되나요?' 여쭤보기",
};

export function seedTasks(input: CaseInput, _results: Result[]): TaskSeed[] {
  const byReason = (BY_REASON[input.reason] ?? []).map((t) => ({ ...t, source: "template" as const }));
  // 지원은 시작할 때 할 일로 만들지 않는다. 신청 날짜는 사용자가 지원 상세에서 마감 안에서 직접 골라 넣는다(홈의 '받을 수 있는 지원'과 달력의 마감 표시는 그대로).
  const all = [...COMMON, ...byReason].sort((a, b) => a.rel - b.rel);
  if (input.isSelfCare) {
    return all.map((t) => ({ ...t, title: SELF_CARE_TITLE_MAP[t.title] ?? t.title }));
  }
  return all;
}

export const addDays = (date: string, n: number) =>
  new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);

export const KIND_LABEL: Record<TaskKind, string> = {
  prep: "준비",
  question: "의료진에게 확인",
  schedule: "병원 일정",
  admin: "행정",
  custom: "직접 추가",
};

// 타임라인 4단계. 퇴원일 기준 며칠째인지로 나눈다.
export const PHASES = ["퇴원 전 준비", "퇴원 당일", "집에서 회복 · 첫 외래", "정기 외래 · 마무리"] as const;
export function phaseOf(rel: number | null, due: string | null, discharge: string | null): number | null {
  const off = rel ?? (due && discharge ? Math.round((Date.parse(due) - Date.parse(discharge)) / 86_400_000) : null);
  if (off === null) return null;
  return off < 0 ? 0 : off === 0 ? 1 : off <= 14 ? 2 : 3;
}

// 반복 할 일의 다음 날짜. 밀린 일을 뒤늦게 끝내도 다음 회차가 과거로 잡히지 않게 한다.
export function nextDue(due: string | null, repeat: "daily" | "weekly", today: string) {
  let d = due ?? today;
  do d = addDays(d, repeat === "daily" ? 1 : 7); while (d < today);
  return d;
}
export const REPEAT_LABEL = { daily: "매일", weekly: "매주" } as const;
