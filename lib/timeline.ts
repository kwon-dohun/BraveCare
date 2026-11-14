import type { CaseInput, Reason, Result } from "./benefits.ts";

// 템플릿 문구는 의료 지시를 하지 않는다. "~하세요"가 아니라 병원에 확인할 질문 형태로 쓴다.
export type TaskKind = "prep" | "question" | "schedule" | "admin" | "custom";
export interface TaskSeed {
  title: string;
  kind: TaskKind;
  rel: number; // 퇴원일 기준 D±n
  source: "template" | "benefit";
}

const COMMON: TaskSeed[] = [
  { rel: -3, kind: "question", title: "퇴원 후 복용할 약과 복용 방법을 병원에 확인하기" },
  { rel: -3, kind: "question", title: "퇴원 요약지(퇴원 안내문)를 받을 수 있는지 확인하기" },
  { rel: -2, kind: "question", title: "퇴원 후 첫 외래 예약 일정 확인하기" },
  { rel: -2, kind: "prep", title: "집에서 미끄러지거나 걸려 넘어질 만한 곳 살펴보기" },
  { rel: -1, kind: "prep", title: "퇴원 당일 이동 방법(차량 등) 정하기" },
  { rel: -1, kind: "admin", title: "병원비 수납 방법·시기 확인하기" },
  { rel: 0, kind: "admin", title: "입퇴원확인서 등 필요한 서류 챙기기" },
  { rel: 1, kind: "prep", title: "식사와 약을 챙길 사람 정하기" },
  { rel: 7, kind: "prep", title: "퇴원 일주일, 불편한 점을 부모님께 물어보기" },
  { rel: 14, kind: "schedule", title: "다음 외래 일정을 가족에게 공유하기" },
  { rel: 30, kind: "admin", title: "퇴원 30일 점검: 아직 신청하지 않은 지원 확인하기" },
].map((t) => ({ ...t, source: "template" as const, kind: t.kind as TaskKind }));

const BY_REASON: Partial<Record<Reason, Omit<TaskSeed, "source">[]>> = {
  ortho: [
    { rel: -3, kind: "question", title: "외래 때 계단 이용 가능 시기를 물어보기" },
    { rel: -3, kind: "question", title: "보행기·지팡이 같은 보조기구가 필요한지 물어보기" },
    { rel: -2, kind: "question", title: "재활치료 일정과 장소 확인하기" },
  ],
  cancer: [
    { rel: -3, kind: "question", title: "다음 치료 일정과 병원 방문 주기 확인하기" },
    { rel: -3, kind: "question", title: "식사에서 주의할 점이 있는지 물어보기" },
  ],
  brain: [
    { rel: -3, kind: "question", title: "재활치료 일정과 장소 확인하기" },
    { rel: -3, kind: "question", title: "말하기·삼킴이 불편할 때 어디에 연락하면 되는지 물어보기" },
  ],
  heart: [
    { rel: -3, kind: "question", title: "집에서 혈압·맥박을 확인해야 하는지, 방법은 무엇인지 물어보기" },
    { rel: -3, kind: "question", title: "병원에 바로 연락해야 하는 증상이 무엇인지 물어보기" },
  ],
  surgery: [
    { rel: -3, kind: "question", title: "수술 부위 관리와 소독이 필요한지 물어보기" },
    { rel: -3, kind: "question", title: "샤워 가능 시기를 물어보기" },
  ],
  internal: [{ rel: -3, kind: "question", title: "식사와 활동에서 주의할 점이 있는지 물어보기" }],
};

export function seedTasks(input: CaseInput, results: Result[]): TaskSeed[] {
  const byReason = (BY_REASON[input.reason] ?? []).map((t) => ({ ...t, source: "template" as const }));
  const benefit: TaskSeed[] = [];
  for (const r of results) {
    if (r.verdict === "no") continue;
    if (r.benefit.deadline) benefit.push({ rel: -1, kind: "admin", source: "benefit", title: `${r.benefit.name} 신청 알아보기` });
    else if (r.benefit.id === "ltc_grade") benefit.push({ rel: 0, kind: "admin", source: "benefit", title: "장기요양 등급 신청 여부 가족과 정하기" });
  }
  return [...COMMON, ...byReason, ...benefit].sort((a, b) => a.rel - b.rel);
}

export const addDays = (date: string, n: number) =>
  new Date(Date.parse(date) + n * 86_400_000).toISOString().slice(0, 10);

export const KIND_LABEL: Record<TaskKind, string> = {
  prep: "준비",
  question: "병원에 확인",
  schedule: "일정",
  admin: "행정",
  custom: "직접 추가",
};
