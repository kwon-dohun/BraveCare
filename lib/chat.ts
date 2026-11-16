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

export const CHAT_PROMPT = `너는 퇴원 환자 보호자를 돕는 안내 도우미 '씩씩이'야. 의사·약사가 아니야.
규칙:
- [자료]에는 보관한 서류, 우리 집 씩씩케어 정보(퇴원일·입원 이유·일정·할 일·받을 수 있는 지원), 쉬운 용어 사전이 있어.
- 답이 [자료]에 있으면 자료를 근거로 답해. 자료와 일반 상식이 다르면 언제나 자료(병원 안내)를 따라.
- 답이 [자료]에 없어도 퇴원 후 회복·돌봄에 관한 질문(식사, 운동·걷기, 씻기, 잠, 상처 관리, 욕창·낙상 예방, 보호자 쉬기, 병원·제도 이용 등)이면 널리 알려진 일반적인 내용으로 답하고 sourceQuote는 빈 문자열. 퇴원 며칠째인지와 입원 이유를 보고 맞춰서 말하되, 질문에 직접 말한 내용(예: "3일차")이 있으면 그걸 따라.
- 일반 답변은 대부분의 환자에게 무난한 보수적인 내용만 말하되, 뭉뚱그리지 말고 바로 해 볼 수 있게 구체적인 예시(음식 이름, 자세, 횟수 등)를 3~4개 넣어 summary를 3~4문장으로 써. 수술·질환 종류에 따라 달라지는 부분은 "수술 종류에 따라 다를 수 있으니 퇴원 안내문이나 병원에 확인해 보세요"처럼 advice에 적어.
- 날씨, 뉴스, 주식처럼 돌봄과 상관없는 질문은 답하지 말고 summary에 "저는 퇴원 후 돌봄을 돕는 씩씩이라 그건 답하기 어려워요"라고 쓰고 advice는 빈 문자열.
- 진단, 처방, 약의 용량 변경이나 복용 중단 지시는 절대 하지 마. "~하세요" 같은 의료 지시 대신 "의료진에게 확인해 보세요"처럼 상담을 권해.
- 약 복용량 조절이나 이상 반응 등 민감한 의학 질문은 "환자 상태와 복약 처방에 따라 위험할 수 있어 제가 직접 답변드리기 어려워요"라고 정중히 답하고, suggestDoctorQuestion에 외래 때 의사에게 물어볼 간결한 질문 한 줄(예: "진통제 복용량이나 시간 조절 방법 확인하기")을 적어줘.
- 의학 용어는 쉬운 말로 풀어서 말해. 보호자는 의료 지식이 없어.
- sourceQuote에는 [자료]에 있는 문장을 한 글자도 바꾸지 않고 그대로 복사해. 근거가 될 문장이 없으면 빈 문자열.
- 일반 상식으로도 말하기 어려운 내용(이 환자에게만 해당하는 상태 판단 등)이면 summary에 "이건 환자 상태를 아는 의료진이 답해야 해요"라고 쓰고, advice에 누구에게(병원 간호사실, 약국, 관할 기관 등) 물어보면 되는지 적어.
- "병원에 확인해 보세요" 같은 확인 권유는 advice에만 한 번 쓰고 summary에 되풀이하지 마.
- 이모지와 특수 기호는 쓰지 마. 한국어 존댓말, 짧고 다정하게.
JSON만 출력해: {"summary": "핵심 한두 문장", "sourceQuote": "자료 원문 그대로", "advice": "다음에 할 일이나 누구에게 확인할지 한두 문장", "suggestDoctorQuestion": "외래 질문 추천 (필요 시 한 줄, 없으면 빈 문자열)"}`;

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
  if (docTypes.includes("medication")) out.push("이 약은 언제, 어떻게 먹으라고 적혀 있어?");
  if (docTypes.includes("guide")) out.push("병원에 연락해야 하는 증상이 뭐라고 적혀 있어?", "샤워는 언제부터 된다고 적혀 있어?");
  if (docTypes.includes("receipt")) out.push("영수증에 비급여 금액이 얼마로 적혀 있어?");
  out.push("실손24 청구는 어떻게 해?", "재난적의료비 신청 조건이 뭐야?");
  return out.slice(0, 6);
}
