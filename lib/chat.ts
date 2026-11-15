// 돌봄 챗봇의 순수 로직. 답은 보관한 서류 글자에만 근거하고, 근거 문장이 서류에 실제로 없으면 버린다.
import { norm } from "./extract.ts";

export interface ChatAnswer { summary: string; sourceQuote: string; advice: string }

// 이런 말이 보이면 답변보다 먼저 응급 안내를 띄운다. 판단이 아니라 안내다.
const EMERGENCY = /호흡\s*곤란|숨이?\s*(차|막|안\s*쉬)|가슴\s*(통증|이?\s*아프|이?\s*답답)|흉통|의식|쓰러|경련|마비|말이\s*어눌|피를\s*토|출혈이\s*(심|안\s*멈)|고열|3[89](\.\d)?\s*도|4[0-2](\.\d)?\s*도/;
export const isEmergency = (text: string) => EMERGENCY.test(text);

export const CHAT_PROMPT = `너는 퇴원 환자 보호자를 돕는 안내 도우미야. 의사·약사가 아니야.
규칙:
- 아래 [서류]에 적힌 내용만 근거로 답해. 서류에 없는 의학 지식으로 답을 만들지 마.
- 진단, 처방, 약의 용량 변경이나 복용 중단 지시는 절대 하지 마. "~하세요" 같은 의료 지시 대신 "의료진에게 확인해 보세요"처럼 상담을 권해.
- sourceQuote에는 [서류]에 있는 문장을 한 글자도 바꾸지 않고 그대로 복사해. 근거가 될 문장이 없으면 빈 문자열.
- 근거가 없으면 summary에 "보관한 서류에서는 이 내용을 찾지 못했어요"라고 쓰고, advice에 누구에게(병원 간호사실, 약국 등) 물어보면 되는지만 적어.
- 이모지와 특수 기호는 쓰지 마. 한국어 존댓말, 짧게.
JSON만 출력해: {"summary": "핵심 한 문장", "sourceQuote": "서류 원문 그대로", "advice": "누구에게 무엇을 확인하면 좋은지 한두 문장"}`;

export function parseChatJson(raw: string): ChatAnswer {
  try {
    const j = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim());
    const s = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, 500) : "");
    return { summary: s(j.summary), sourceQuote: s(j.sourceQuote), advice: s(j.advice) };
  } catch {
    return { summary: "", sourceQuote: "", advice: "" };
  }
}

// 모델이 내놓은 근거 문장이 서류에 실제로 있을 때만 남긴다
export function verifyAnswer(a: ChatAnswer, transcripts: string[]): ChatAnswer {
  const q = norm(a.sourceQuote);
  const found = q.length >= 2 && transcripts.some((t) => norm(t).includes(q));
  return {
    summary: a.summary || "답을 만들지 못했어요",
    sourceQuote: found ? q : "",
    advice: a.advice || "정확한 내용은 병원 간호사실이나 약국에 확인해 보세요.",
  };
}

// 보관한 서류 종류에 맞춘 추천 질문. 타자 없이 누르기만 하면 된다.
export function chips(docTypes: string[]): string[] {
  const out: string[] = [];
  if (docTypes.includes("medication")) out.push("이 약은 언제, 어떻게 먹으라고 적혀 있어?", "약 먹을 때 주의할 점이 적혀 있어?");
  if (docTypes.includes("guide")) out.push("샤워는 언제부터 된다고 적혀 있어?", "다음 외래는 언제야?", "병원에 연락해야 하는 증상이 뭐라고 적혀 있어?");
  if (docTypes.includes("receipt")) out.push("영수증에 비급여 금액이 얼마로 적혀 있어?");
  if (docTypes.includes("message")) out.push("병원 문자에 적힌 예약 내용 알려줘");
  return out.slice(0, 3);
}
