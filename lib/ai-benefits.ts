import { BENEFITS } from "./benefits.ts";

// 기본 26개 제도 밖의 추가 지원 "확인처" 목록.
// AI가 사업명·금액을 지어내던 방식을 없앴다. 여기에는 실제로 있는 기관·제도만, 금액·기간 없이 적는다.
// 지역 자체 사업은 지역마다 달라 사업명을 단정하지 않고 주민센터·검색으로 확인하게 한다.
export interface AiBenefitItem {
  id: string;
  category: "상담 창구" | "공익재단" | "공적 제도";
  organization: string;
  title: string;
  summary: string;
  matchReason: string;
  howToCheck: string;
  searchQuery: string;
}

export type ExtraParams = {
  sido: string;
  sigungu?: string;
  reason: string;
  income: string;
  extraTags: string[];
  customKeyword?: string;
};

type Entry = Omit<AiBenefitItem, "matchReason"> & { when: (p: ExtraParams) => string | null; words: string[] };

const lowIncome = (p: ExtraParams) => p.income === "basic" || p.income === "mid" || p.extraTags.includes("기초생활·차상위");

const CATALOG: Entry[] = [
  {
    id: "hospital_sw", category: "상담 창구", organization: "입원한 병원", title: "의료사회복지팀(사회사업팀) 상담",
    summary: "병원비가 부담될 때 재단·후원 연계를 상담해 줘요. 민간 재단의 의료비 지원은 이 팀을 거쳐 신청하는 경우가 많아요.",
    howToCheck: "원무과에 '의료사회복지팀 상담'을 요청하세요. 퇴원 전에 하는 게 가장 좋아요.",
    searchQuery: "병원 의료사회복지팀 의료비 지원 상담",
    when: () => "어느 병원이든 먼저 물어볼 수 있는 곳이에요.", words: ["병원비", "의료비", "치료비", "재단", "후원"],
  },
  {
    id: "local_center", category: "상담 창구", organization: "주민센터 맞춤형복지팀", title: "우리 지역 자체 지원 문의",
    summary: "시·군·구가 자체 예산으로 하는 지원은 지역마다 달라서 씩씩케어가 사업명을 확정해 드릴 수 없어요. 주민센터에서 우리 지역 사업을 확인할 수 있어요.",
    howToCheck: "주민센터에 '퇴원한 환자가 받을 수 있는 우리 구(시·군) 자체 지원이 있나요?'라고 물어보세요.",
    searchQuery: "",
    when: (p) => `${p.sido} ${p.sigungu ?? ""}`.trim() + " 거주로 입력하셨어요.", words: ["지자체", "조례", "구청", "시청", "돌봄", "간병"],
  },
  {
    id: "call129", category: "상담 창구", organization: "보건복지상담센터 · 복지로", title: "129 전화 상담 / 복지로 서비스 찾기",
    summary: "전화 129(보건복지상담센터)나 복지로 누리집에서 우리 조건에 맞는 복지 서비스를 찾아볼 수 있어요.",
    howToCheck: "전화 129, 또는 복지로(bokjiro.go.kr)의 '복지서비스 찾기'",
    searchQuery: "복지로 복지서비스 찾기",
    when: () => "전국 어디서나 쓸 수 있어요.", words: ["복지", "상담", "지원금"],
  },
  {
    id: "asan", category: "공익재단", organization: "아산사회복지재단", title: "의료비 지원 사업",
    summary: "형편이 어려운 가정의 환자 의료비를 지원하는 사업을 운영해요. 대상과 지원 범위는 재단 심사로 정해져요.",
    howToCheck: "입원 병원 의료사회복지팀을 통해 신청해요.",
    searchQuery: "아산사회복지재단 의료비 지원",
    when: (p) => (lowIncome(p) ? "소득 구간을 기초·차상위 또는 중위소득 이하로 입력하셨어요." : null), words: ["병원비", "의료비", "치료비", "재단"],
  },
  {
    id: "chest", category: "공익재단", organization: "사회복지공동모금회(사랑의열매)", title: "의료비 등 긴급 지원",
    summary: "모금한 성금으로 어려운 가정의 의료비 등을 지원해요. 개인이 직접 신청하기보다 주민센터·병원·복지관 같은 기관을 통해 연결돼요.",
    howToCheck: "주민센터나 병원 의료사회복지팀에 연계를 요청하세요.",
    searchQuery: "사회복지공동모금회 의료비 지원",
    when: (p) => (lowIncome(p) ? "소득 구간을 기초·차상위 또는 중위소득 이하로 입력하셨어요." : null), words: ["병원비", "의료비", "생계", "긴급"],
  },
  {
    id: "assistive_device", category: "공적 제도", organization: "국민건강보험공단", title: "장애인 보조기기 급여",
    summary: "등록 장애인이 휠체어·보청기 같은 보조기기를 살 때 비용 일부를 지원해요. 품목마다 기준이 있고 의사 처방이 필요해요.",
    howToCheck: "국민건강보험공단 지사 또는 고객센터 1577-1000",
    searchQuery: "건강보험 장애인 보조기기 급여",
    when: (p) => (p.extraTags.includes("장애인 등록") ? "장애인 등록을 골라주셨어요." : null), words: ["보청기", "휠체어", "보조기기", "보조기구"],
  },
  {
    id: "rare_disease", category: "공적 제도", organization: "질병관리청 · 보건소", title: "희귀질환자 의료비 지원",
    summary: "정해진 희귀질환을 앓는 환자 중 소득 등 기준에 맞는 가구에 의료비를 지원해요.",
    howToCheck: "주소지 보건소에 대상 질환인지 문의하세요.",
    searchQuery: "희귀질환자 의료비 지원사업",
    when: (p) => (p.extraTags.includes("특정 희귀·난치질환") ? "희귀·난치질환을 골라주셨어요." : null), words: ["희귀", "난치"],
  },
  {
    id: "veteran", category: "공적 제도", organization: "국가보훈부", title: "보훈병원·보훈 위탁병원 진료 지원",
    summary: "국가유공자 등 보훈 대상자는 보훈병원이나 가까운 보훈 위탁병원에서 진료비 지원을 받을 수 있어요. 지원 범위는 대상 구분마다 달라요.",
    howToCheck: "국가보훈부 보훈상담센터 1577-0606",
    searchQuery: "보훈 위탁병원 진료 지원",
    when: (p) => (p.extraTags.includes("국가유공자") ? "국가유공자를 골라주셨어요." : null), words: ["보훈", "유공자"],
  },
  {
    id: "blood_cancer", category: "공익재단", organization: "한국혈액암협회", title: "혈액암 환우 지원 사업",
    summary: "혈액암 환우와 가족을 위한 지원 사업을 운영해요. 해마다 사업 내용이 달라서 협회 공지를 확인해야 해요. 혈액암이 아니면 해당하지 않아요.",
    howToCheck: "한국혈액암협회 누리집 공지 또는 전화 문의",
    searchQuery: "한국혈액암협회 환우 지원사업",
    when: (p) => (p.reason === "cancer" ? "입원 이유를 암 치료로 입력하셨어요." : null), words: ["혈액암", "백혈병", "림프종"],
  },
];

export const extraById = (id: string) => CATALOG.find((e) => e.id === id);

const tokens =(kw: string) => kw.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 2);
const squash = (s: string) => s.replace(/\s+/g, "");

export function findExtraHelp(p: ExtraParams): { items: AiBenefitItem[]; basics: { id: string; name: string }[]; keywordHit: boolean } {
  const kws = tokens(p.customKeyword ?? "");
  const region = `${p.sido} ${p.sigungu ?? ""}`.trim();
  const items: AiBenefitItem[] = [];
  let keywordHit = false;
  for (const e of CATALOG) {
    const hit = kws.find((k) => e.words.some((w) => w.includes(k) || k.includes(w)));
    const reason = hit ? `‘${hit}’ 키워드와 관련 있어요.` : e.when(p);
    if (!reason) continue;
    if (hit) keywordHit = true;
    const { when: _w, words: _x, ...rest } = e;
    items.push({ ...rest, matchReason: reason, searchQuery: rest.searchQuery || `${region} 퇴원 환자 지원` });
  }
  // 키워드가 이미 기본 26개 제도에 있으면 그쪽으로 안내한다
  const basics = kws.length
    ? BENEFITS.filter((b) => kws.some((k) => squash(b.name + b.summary).includes(squash(k)))).map((b) => ({ id: b.id, name: b.name }))
    : [];
  return { items, basics, keywordHit };
}
