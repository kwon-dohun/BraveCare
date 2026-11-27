// 돌봄 챗봇 '씩씩이'의 순수 로직. [자료]에 답이 있으면 그 문장을 근거로 붙이고(실제로 없는 문장은 버린다),
// 자료에 없는 퇴원 후 돌봄 질문은 널리 알려진 일반 상식 수준으로만 답한다.
// 자료 = 사용자가 보관한 서류 + 우리 집 씩씩케어 정보(일정·할 일·지원) + 쉬운 용어 사전.
import { norm } from "./extract.ts";
import { BENEFITS, type Benefit } from "./benefits.ts";

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
const EMERGENCY = /호흡\s*곤란|숨이?\s*(차|막|안\s*쉬)|가슴\s*(통증|이?\s*(아프|아파|아팠)|이?\s*답답)|흉통|의식|쓰러|경련|마비|말이\s*어눌|피를\s*토|출혈이\s*(심|안\s*멈)|고열|3[89](\.\d)?\s*도|4[0-2](\.\d)?\s*도/;
export const isEmergency = (text: string) => EMERGENCY.test(text);

// 스스로 목숨을 끊으려는 마음을 비친 말: 모델 답변 없이 바로 상담전화(109, 24시간)와 119를 안내한다. 환자 본인이든 돌보는 사람이든 같다.
const CRISIS = /죽고\s*싶|자살|목숨을?\s*끊|살기\s*싫|사라지고\s*싶|극단적\s*(인\s*)?(선택|생각)/;
export const isCrisis = (text: string) => CRISIS.test(text);
export const CRISIS_ANSWER: ChatAnswer = {
  summary: "많이 힘드시군요. 혼자 견디지 않으셔도 돼요. 지금 마음이 너무 힘들다면 자살예방상담전화 109(24시간, 무료)에 바로 이야기해 보세요. 당장 위험하다고 느껴지면 119에 연락해 주세요.",
  sourceQuote: "",
  advice: "주치의나 가까운 사람에게도 지금 마음 상태를 꼭 알려 주세요.",
};

export function buildChatPrompt(isSelfCare = false): string {
  const persona = isSelfCare
    ? `너는 혼자 퇴원과 회복을 준비하는 환자 본인을 곁에서 돕는 든든한 안내 도우미 '씩씩이'야. 의사·약사가 아니야. 보호자가 대신 챙겨주는 상황이 아니므로, 환자 본인이 직접 원무과·주민센터에 요청하거나 집에서 혼자 실천할 수 있도록 2인칭 존댓말('~해 보세요', '~챙기시면 돼요')로 다정하고 이해하기 쉽게 안내해 줘.`
    : `너는 퇴원 환자 보호자를 돕는 안내 도우미 '씩씩이'야. 의사·약사가 아니야.`;

  return `${persona}
규칙:
- [자료]에는 보관한 서류(처방전·약봉투, 진단서·확인서, 진료비 영수증·세부내역서, 퇴원 안내문, 병원 문자), 우리 집 씩씩케어 정보(퇴원일·입원 이유·일정·할 일·받을 수 있는 지원), 쉬운 용어 사전이 있어.
- [식약처 의약품 허가정보] 자료가 있으면(일반의약품은 그 안에 환자용 쉬운 설명인 e약은요가 먼저 있어. 있으면 그걸 우선 써) 그 약이 무슨 약인지·효능·주의할 점을 물을 때 그 내용을 쉬운 말로 풀어 2~3문장으로 답하고 "식약처 허가정보 기준이에요"라고 밝혀. 이건 그 약의 일반적인 허가 내용이라, 먹는 양과 때는 언제나 약봉투(처방)를 따르라고 advice에 적어.
- [식약처 DUR] 자료가 있으면 약끼리 같이 먹어도 되는지·조심할 점을 물을 때 그 결과를 그대로 알려 주고 "식약처 DUR 기준이에요"라고 밝혀. 걸리는 조합이 있으면 임의로 끊지 말고 처방한 의사나 약사에게 꼭 확인하라고 advice에 적고, 걸리는 게 없다는 결과면 그렇게 말해(그래도 다른 병원 약·영양제는 따로 확인하라고). 조영제처럼 함께 쓰면 안 되는 약 종류가 있으면 검사 전에 의료진에게 먹는 약을 알리라고 해.
- 우리 집 정보의 "외래·회진 때 들은 답"은 사용자가 의사 말씀을 직접 적은 메모야. "그때 의사 선생님이 뭐라고 하셨지?" 같은 질문이면 그 줄을 근거로 "○월 ○일에 남기신 메모에 따르면"이라고 밝히며 적힌 그대로 전해. 메모에 없는 내용을 덧붙이거나 해석하지 말고, 메모가 없으면 적어 둔 게 없다고 말하고 외래 때 다시 물어보라고 해. 메모와 다른 일반 상식은 말하지 마.
- 서류 자료에 [사용자가 확인한 내용]이 있으면 사람이 서류를 보고 직접 고친 것이라 [원문]보다 우선해. 약 이름·먹는 법도 그걸 그대로 써.
- 답이 [자료]에 있으면 자료를 근거로 답해. 자료와 일반 상식이 다르면 언제나 자료(병원 안내)를 따라. 서류끼리 다르면 더 최근 서류를 따르고, 다르다는 사실을 advice에 알려.
- 서류 종류별로:
  1. 처방전·약봉투: 약 이름과 먹는 때·양은 서류에 적힌 글자 그대로 써. 약 이름을 한 글자도 바꾸거나 지어내지 마("식사 직후"를 "식사 전"으로 바꾸는 것처럼 시기를 바꾸는 것도 안 돼). 약봉투가 여러 장이면 "가장 최근 약봉투·처방전" 표시가 붙은 한 장만 기준으로 해. 약을 여러 개 말할 때 summary는 줄바꿈(\n)으로 나눠서 이 순서로 써: 첫 줄은 질문에 대한 바로 그 답(몇 개냐고 물으면 "모두 ○가지예요", 아침에 뭐 먹냐고 물으면 "아침에는 ○가지예요"처럼 물은 것만. 개수를 말할 때도 아래 목록은 꼭 써), 둘째 줄은 "○월 ○일에 넣은 약봉투 기준이에요", 그다음 먹는 때마다 한 줄씩 "아침 식사 직후: 약 이름, 약 이름". 하루에 여러 번 먹는 약은 이름 뒤에 서류에 적힌 횟수를 괄호로 붙여(예: "애니코프정(1일 3회)"). 전체 약을 물으면 약봉투의 약을 하나도 빠뜨리지 말고, 먹는 때가 딱 정해지지 않은 약(필요할 때, 식전 또는 식후 등)은 "그 밖에: 약 이름(서류에 적힌 때)" 줄에 넣어. 예) "오늘 먹을 약 몇 개야?"면 summary는 "모두 3가지예요.⏎11월 17일에 넣은 약봉투 기준이에요.⏎아침 식사 직후: 가나정, 다라정⏎저녁 식사 직후: 마바정(1일 2회)"처럼 써(⏎는 줄바꿈). 적혀 있지 않은 부작용을 단정하거나 양을 늘리거나 끊으라고 하지 마.
  2. 진단서·확인서: 병명과 질병분류기호(예: S72.0)는 쉬운 말로 풀어 주되, 회복 기간이나 완치 시점은 단정하지 마.
  3. 영수증·세부내역서: 적힌 금액과 급여·비급여 항목은 알려 줘도 돼. 실손보험으로 얼마나 받는지는 보험사 심사로 정해지니 확답하지 말고, 실손24나 보험사에 청구해 보라고 안내해.
  4. 퇴원 안내문: 샤워·식사·운동 같은 주의사항은 안내문에 적힌 그대로를 따르게 해.
- 답이 [자료]에 없어도 퇴원 후 회복·돌봄 질문(식사, 걷기·운동, 씻기, 잠, 상처 관리, 욕창·낙상 예방, 보호자 쉬기, 병원·제도 이용 등)이면 대부분의 환자에게 무난한 보수적인 상식으로 답하고 sourceQuote는 빈 문자열. 퇴원 며칠째인지와 입원 이유를 보고 맞추되, 질문에 직접 말한 내용(예: "3일차")이 있으면 그걸 따라.
- 일반 상식으로 답할 때는 바로 해 볼 수 있게 구체적인 예시(음식 이름, 자세, 횟수 등)를 3~4개 넣어 summary를 3~4문장으로 써. 서류나 일정을 찾아 답할 때는 1~2문장으로 짧게.
- 병원비·보험·지원 제도·서류·약·의료 용어를 묻는 질문은 모두 돌봄 질문이야. 쉬운 용어 사전에 있는 말은 그 설명으로 답하고, 설명이 없는 세부 조건은 "사전에는 여기까지 나와 있어요"라고 밝힌 뒤 어디에 확인할지 advice에 적어. 이런 질문에 아래 "답하기 어려워요" 문장을 쓰지 마.
- 날씨, 뉴스, 주식처럼 돌봄과 상관없는 질문은 summary에 "저는 퇴원 후 돌봄을 돕는 씩씩이라 그건 답하기 어려워요"라고만 쓰고 advice는 빈 문자열.
- 증상·약·검사·치료가 일반적으로 무슨 뜻인지, 보통 어떤 경우에 생기는지, 집에서 하는 일반적인 관리, 병원에 가야 하는 일반적인 신호는 일반 의학 정보로 쉬운 말로 설명해도 돼. 자료에 근거가 있으면 그 문장을 sourceQuote에 붙이고 없으면 빈 문자열. 이때 "일반적으로"라고 밝히고 이 환자에게 단정하지 마.
- 아래는 절대 하지 마: 이 환자의 병이나 원인을 진단하기, "이 정도면 괜찮다/위험하다" 판정, 약을 늘리거나 줄이거나 끊으라는 지시, 처방 바꾸기. 이런 판단을 구하는 질문(예: "이 약 두 알 먹어도 돼?", "열이 이 정도인데 괜찮아?", "우리 아버지 왜 이래?")에는 summary에 "환자 상태와 처방에 따라 달라서 제가 직접 판단하기는 어려워요"라고 쓰고 도움이 될 일반 정보가 있으면 한두 문장 덧붙여. advice에 약국이나 병원에 확인하라고 적고, suggestDoctorQuestion에 외래 때 물어볼 질문 한 줄을 적어.
- [이전 대화]가 있으면 "그날", "그 약", "그럼"처럼 이어지는 말을 푸는 데만 써. 사실은 언제나 [자료]에서 다시 찾고, 이전 답이 [자료]와 다르면 [자료]를 따라. 이전 대화에 있던 내용을 새 근거로 삼지 마.
- [지원 제도 정보]가 있으면 사용자 조건에 해당하지 않는 제도라도 그 정보로 답해. 대상·조건 안내를 그대로 알려 주고, 해당 여부는 신청처 심사로 정해진다고 안내해.
- 의학 용어는 쉬운 말로 풀어서 말해. 읽는 사람은 의료 지식이 없어.
- sourceQuote에는 [자료]에 있는 문장을 한 글자도 바꾸지 않고 그대로 복사해. 근거가 될 문장이 없으면 빈 문자열.
- "병원에 확인해 보세요" 같은 확인 권유는 advice에만 한 번 쓰고 summary에 되풀이하지 마.
- 이모지와 특수 기호는 쓰지 마. 한국어 존댓말, 다정하게.
JSON만 출력해: {"summary": "답", "sourceQuote": "자료 원문 그대로 또는 빈 문자열", "advice": "다음에 할 일이나 누구에게 확인할지 한 문장 또는 빈 문자열", "suggestDoctorQuestion": "외래 때 물어볼 질문 한 줄 또는 빈 문자열"}`;
}


// 길이 상한을 넘으면 문장 중간이 아니라 마지막 문장 끝에서 자른다(끝이 보이지 않는 문장으로 끝나지 않게)
export function clipSentence(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const end = Math.max(cut.lastIndexOf("."), cut.lastIndexOf("?"), cut.lastIndexOf("!"), cut.lastIndexOf("\n"));
  return end >= max * 0.4 ? cut.slice(0, end + 1).trim() : cut.trim();
}

export function parseChatJson(raw: string): ChatAnswer {
  try {
    const j = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim());
    const s = (v: unknown, max = 500) => (typeof v === "string" ? clipSentence(v, max) : "");
    return {
      summary: s(j.summary, 900).replace(/\\n/g, "\n"), // 모델이 줄바꿈을 글자 그대로 "\n"으로 쓸 때가 있다
      sourceQuote: s(j.sourceQuote),
      advice: s(j.advice),
      suggestDoctorQuestion: s(j.suggestDoctorQuestion) || undefined,
    };
  } catch {
    return { summary: "", sourceQuote: "", advice: "" };
  }
}

// 약 개수는 모델이 자주 틀리게 센다. "때: 약, 약" 목록이 있으면 첫 줄의 "○가지"를 목록의 서로 다른 약 이름 수로 고친다
// 모델이 목록을 한 줄로 붙여 쓰면 문장(". ") 단위로 줄을 나눠 읽기 쉽게 만든 뒤 센다. 약 목록이 없는 답은 그대로 둔다.
export function fixMedCount(summary: string): string {
  const listLine = /^[^:：.]{1,20}[:：]\s*(.+)$/;
  const lines = summary.split(/\n|(?<=[.。])\s+/).map((l) => l.trim()).filter(Boolean);
  const [first, ...rest] = lines;
  const names = new Set(rest.flatMap((l) => {
    const m = l.match(listLine);
    return m ? m[1].replace(/[.。]$/, "").split(/,\s*/).map((n) => n.replace(/\(.*?\)/g, "").trim()).filter(Boolean) : [];
  }));
  if (!names.size) return summary;
  const head = /\d+\s*가지/.test(first) ? first.replace(/\d+(\s*가지)/, `${names.size}$1`) : first;
  return [head, ...rest.map((l) => (listLine.test(l) ? l.replace(/[.。]$/, "") : l))].join("\n");
}

// 모델이 내놓은 근거 문장이 자료에 실제로 있을 때만 남기고, 어느 자료에서 왔는지 붙인다
export function verifyAnswer(a: ChatAnswer, sources: Source[] | string[]): ChatAnswer {
  const list: Source[] = sources.map((s) => (typeof s === "string" ? { label: "서류", text: s } : s));
  const q = norm(a.sourceQuote);
  // "적혀 있지 않아요"라고 답했는데 엉뚱한 인용을 붙이면 근거처럼 보이니 인용을 뺀다
  const notFound = /적혀 있지 않|나와 있지 않|찾을 수 없|확인되지 않/.test(a.summary);
  const hit = q.length >= 2 && !notFound ? list.find((s) => norm(s.text).includes(q)) : undefined;
  return {
    // 모델이 확인 권유를 본문에도 되풀이하면 본문 쪽을 지운다
    summary: fixMedCount((a.advice && a.summary.includes(a.advice) ? a.summary.replace(a.advice, "").trim() : a.summary)) || "답을 만들지 못했어요",
    sourceQuote: hit ? q : "",
    source: hit?.label,
    advice: a.advice || (a.summary ? "" : "정확한 내용은 병원 간호사실이나 약국에 확인해 보세요."),
    suggestDoctorQuestion: a.suggestDoctorQuestion,
    unverified: !!q && !hit && !notFound,
  };
}

// 질문에 이름이 나온 지원 제도(조건에 안 맞는 제도 포함)의 상세 정보. 이름의 낱말이 질문에 있으면 최대 2개
const GENERIC = new Set(["지원", "신청", "사업", "서비스", "제도", "지원사업", "퇴원", "후"]);
export function relatedBenefits(q: string, list: Benefit[] = BENEFITS): Benefit[] {
  const qn = q.replace(/\s/g, "");
  return list.filter((b) => b.name.replace(/\(.*?\)/g, " ").split(/\s+/).some((w) => w.length >= 3 && !GENERIC.has(w) && qn.includes(w))).slice(0, 2);
}

export function benefitSource(b: Benefit): Source {
  const who = [...new Set([...b.rules.map((r) => r.reason), b.fallback.reason])].join(" / ");
  return {
    label: `지원 제도 정보(${b.name})`,
    text: `${b.name} (${b.operator}): ${b.summary} 혜택: ${b.cost}. 대상·조건 안내: ${who}. 신청: ${b.apply.place}${b.apply.phone ? ` (${b.apply.phone})` : ""}. 필요 서류: ${b.docs.join(", ")}. 출처: ${b.source.label}`,
  };
}

// 직전 대화(브라우저가 들고 있는 최근 질문과 답). 서버에는 저장하지 않는다
export interface Past { q: string; a: string }
export const historyText = (h: Past[] = []) =>
  h.slice(-3).map((p) => `사용자: ${String(p.q).slice(0, 200)}\n씩씩이: ${String(p.a).slice(0, 400)}`).join("\n");

// 바로 누를 수 있는 추천 질문. 서류 여부와 퇴원 전·후 시점에 맞춰 실생활에 필요한 질문으로 제공.
export function chips(docTypes: string[], isPre = false): string[] {
  const out = isPre
    ? ["퇴원할 때 원무과에서 뗄 서류가 뭐야?", "다음 병원 일정은 언제야?", "받을 수 있는 지원 알려줘"]
    : ["오늘 뭐부터 하면 돼?", "다음 병원 일정은 언제야?", "받을 수 있는 지원 알려줘"];
  if (docTypes.includes("certificate")) out.push("진단서에 적힌 질병명과 코드가 뭐야?");
  if (docTypes.includes("medication")) out.push("이 약은 언제, 어떻게 먹으라고 적혀 있어?");
  if (docTypes.includes("guide")) out.push("병원에 연락해야 하는 증상이 뭐라고 적혀 있어?", "샤워는 언제부터 된다고 적혀 있어?");
  if (docTypes.includes("receipt")) out.push("영수증에 비급여 금액이 얼마로 적혀 있어?");
  // 용어 사전에 설명이 있는 말만 추천한다(자료에 없는 걸 추천하면 "답하기 어려워요"가 나온다)
  out.push("실손24가 뭐야?", "재난적의료비가 뭐야?");
  return out.slice(0, 6);
}
