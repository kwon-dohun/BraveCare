// 돌봄 챗봇 '씩씩이'의 순수 로직. [자료]에 답이 있으면 그 문장을 근거로 붙이고(실제로 없는 문장은 버린다),
// 자료에 없는 퇴원 후 돌봄 질문은 널리 알려진 일반 상식 수준으로만 답한다.
// 자료 = 사용자가 보관한 서류 + 우리 집 씩씩케어 정보(일정·할 일·지원) + 쉬운 용어 사전.
import { norm } from "./extract.ts";

export interface ChatAnswer {
  summary: string;
  sourceQuote: string;
  advice: string;
  source?: string;
  suggestDoctorQuestion?: string;
  unverified?: boolean; // 자료를 인용했다고 했는데 그 문장이 자료에 없을 때
}

export interface Source {
  label: string;
  text: string;
}

// 이런 말이 보이면 답변보다 먼저 응급 안내를 띄운다. 판단이 아니라 안내다.
const EMERGENCY = /호흡\s*곤란|숨이?\s*(차|막|안\s*쉬)|가슴\s*(통증|이?\s*아프|이?\s*답답)|흉통|의식|쓰러|경련|마비|말이\s*어눌|피를\s*토|출혈이\s*(심|안\s*멈)|고열|3[89](\.\d)?\s*도|4[0-2](\.\d)?\s*도/;
export const isEmergency = (text: string) => EMERGENCY.test(text);

export function buildChatPrompt(isSelfCare = false): string {
  const persona = isSelfCare
    ? `너는 혼자 퇴원과 회복을 준비하는 환자 본인을 곁에서 돕는 든든한 안내 도우미 '씩씩이'야. 의사·약사가 아니야. 보호자가 대신 챙겨주는 상황이 아니므로, 환자 본인이 직접 원무과·주민센터에 요청하거나 집에서 혼자 실천할 수 있도록 2인칭 존댓말('~해 보세요', '~챙기시면 돼요')로 다정하고 이해하기 쉽게 안내해 줘.`
    : `너는 퇴원 환자 보호자를 돕는 안내 도우미 '씩씩이'야. 의사·약사가 아니야.`;

  return `${persona}
규칙:
- [자료]에는 보관한 서류(처방전, 약봉투, 진단서, 진료비 영수증·세부내역서, 퇴원 안내문 등), 우리 집 씩씩케어 정보(퇴원일·입원 이유·D-Day 등), 쉬운 용어 사전이 있어.
- 답이 [자료]에 있으면 자료를 최우선 근거로 답해. (일반 상식보다 병원 서류 내용이 우선이야.)
- 여러 서류 간 지침이 상충하면, 가장 최근 서류나 구체적인 약 처방 지침을 우선해.
- [문서별 맞춤 응대 지침]:
  1. 처방전/약봉투: 복용 횟수, 시기(식후 30분 등)를 물어보면 서류 내용을 바탕으로 친절하게 풀어서 설명해 줘. 단, 서류에 없는 부작용을 단정하거나 임의 증량·복용 중단 지시는 절대 금지야.
  2. 진단서/확인서: 어려운 의학 용어나 질병명, KCD 코드가 있으면 쉬운 말로 풀어서 설명하되, 예후나 완치 시점을 단정하지 마.
  3. 영수증/세부내역서: 비급여나 진료비 항목을 안내할 수 있으나, 실손보험 보장 여부는 보험사 심사에 따라 다르므로 직접 확답하지 마. 실손24나 보험사를 통해 청구 후 심사를 받아야 한다고 안내해.
  4. 퇴원 안내문: 샤워 시기, 식단 제한, 가벼운 운동 등 주의사항은 안내문에 적힌 병원 지침을 절대적으로 따르게 해.
- [자료]에 명시된 내용이 없거나 퇴원 후 일반적인 회복·돌봄 질문(식사, 가벼운 걷기, 잠, 상처 관리 등)이면 널리 알려진 보수적인 상식으로 답하고 sourceQuote는 빈 문자열로 해.
- 답변은 뭉뚱그리지 말고 바로 해 볼 수 있는 구체적인 예시를 3~4개 넣어 summary를 3~4문장으로 작성해.
- 날씨, 뉴스, 주식 등 돌봄과 무관한 질문은 "저는 퇴원 후 돌봄을 돕는 씩씩이라 그건 답하기 어려워요"라고 대답해.
- 진단, 처방, 약의 임의 용량 변경이나 복용 중단 지시는 절대 하지 마. 위험한 의학적 판단을 요구하면 "환자 상태나 처방에 따라 다를 수 있어 제가 직접 답변드리기 어려워요"라고 답하고, advice에 "약국이나 병원에 꼭 확인해 보세요"를 적은 뒤, suggestDoctorQuestion에 외래 때 의사에게 물어볼 간결한 질문 한 줄을 남겨줘.
- 의학 용어는 쉬운 말로 풀어서 말해.
- sourceQuote에는 [자료]에 있는 원문 중 근거가 되는 문장을 정확히 복사해. 근거가 없으면 빈 문자열.
- "병원에 확인해 보세요" 같은 확인 권유는 advice에만 한 번 쓰고 summary에 되풀이하지 마.
- 이모지와 특수 기호는 쓰지 마. 한국어 존댓말, 짧고 다정하게.
JSON만 출력해: {"summary": "핵심 한두 문장", "sourceQuote": "자료 원문 그대로", "advice": "다음에 할 일이나 누구에게 확인할지 한두 문장", "suggestDoctorQuestion": "외래 질문 추천 (필요 시 한 줄, 없으면 빈 문자열)"}`;
}

export const CHAT_PROMPT = buildChatPrompt(false);

export function parseChatJson(raw: string): ChatAnswer {
  try {
    const j = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim());
    const s = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : "");
    return {
      summary: s(j.summary),
      sourceQuote: s(j.sourceQuote),
      advice: s(j.advice),
      suggestDoctorQuestion: s(j.suggestDoctorQuestion) || undefined,
    };
  } catch {
    return { summary: "", sourceQuote: "", advice: "" };
  }
}

// 모델이 내놓은 근거 문장이 자료에 실제로 있을 때만 남기고, 어느 자료에서 왔는지 붙인다
export function verifyAnswer(a: ChatAnswer, sources: Source[] | string[]): ChatAnswer {
  const list: Source[] = sources.map((s) => (typeof s === "string" ? { label: "서류", text: s } : s));
  const q = norm(a.sourceQuote);
  const hit = q.length >= 2 ? list.find((s) => norm(s.text).includes(q)) : undefined;
  return {
    // 모델이 확인 권유를 본문에도 되풀이하면 본문 쪽을 지운다
    summary: (a.advice && a.summary.includes(a.advice) ? a.summary.replace(a.advice, "").trim() : a.summary) || "답을 만들지 못했어요",
    sourceQuote: hit ? q : "",
    source: hit?.label,
    advice: a.advice || (a.summary ? "" : "정확한 내용은 병원 간호사실이나 약국에 확인해 보세요."),
    suggestDoctorQuestion: a.suggestDoctorQuestion,
    unverified: !!q && !hit,
  };
}

// 바로 누를 수 있는 추천 질문. 서류 여부와 퇴원 전·후 시점에 맞춰 실생활에 필요한 질문으로 제공.
export function chips(docTypes: string[], isPre = false): string[] {
  const out = isPre
    ? ["퇴원할 때 원무과에서 뗄 서류가 뭐야?", "다음 병원 일정은 언제야?", "우리가 받을 수 있는 지원 알려줘"]
    : ["오늘 뭐부터 하면 돼?", "다음 병원 일정은 언제야?", "우리가 받을 수 있는 지원 알려줘"];
  if (docTypes.includes("certificate")) out.push("진단서에 적힌 질병명과 코드가 뭐야?");
  if (docTypes.includes("medication")) out.push("이 약은 언제, 어떻게 먹으라고 적혀 있어?");
  if (docTypes.includes("guide")) out.push("병원에 연락해야 하는 증상이 뭐라고 적혀 있어?", "샤워는 언제부터 된다고 적혀 있어?");
  if (docTypes.includes("receipt")) out.push("영수증에 비급여 금액이 얼마로 적혀 있어?");
  out.push("실손24 청구는 어떻게 해?", "재난적의료비 신청 조건이 뭐야?");
  return out.slice(0, 6);
}
