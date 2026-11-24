// 외래 때 의료진에게 보여줄 한 장 요약의 계산. 해석·판단은 하지 않고 기록한 값만 센다.

export interface Daily {
  check_date: string;
  med_morning: boolean; med_lunch: boolean; med_dinner: boolean;
  side_effect: boolean;
  temp: "normal" | "mild" | "high";
  temp_c?: number | null; // 미열·고열일 때 잰 체온(℃)
  wound_issue: boolean;
  pain: number; // 0~10
  bowel: "good" | "constipation" | "diarrhea";
  notes?: string | null;
  source_role?: "family" | "patient";
}

export const TEMP_LABEL = { normal: "정상", mild: "미열 (37.5도 이상)", high: "고열 (38도 이상)" } as const;
export const BOWEL_LABEL = { good: "원활", constipation: "변비·답답함", diarrhea: "설사" } as const;
export const PAIN_WORD = (n: number) => (n === 0 ? "없음" : n <= 3 ? "약함" : n <= 6 ? "보통" : n <= 8 ? "심함" : "매우 심함");

const mdKr = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`;
export const feverText = (f: { temp: string; c?: number | null }) => `${f.temp === "high" ? "고열" : "미열"}${f.c ? ` ${f.c}℃` : ""}`;

// 진료실에서 그대로 읽어도 되는 말하기 요약. 앱 안의 지표(기록률·복약률)는 빼고, 진료에 쓸 사실만 기록한 값 그대로 옮긴다.
export function speakScript(s: ReturnType<typeof summarize>, elapsed: number | null = null): string {
  if (!s.days) return "";
  const out: string[] = [];
  if (elapsed !== null && elapsed >= 0) out.push(`퇴원 ${elapsed}일째예요.`);
  const first = s.pain[0], last = s.pain.at(-1)!;
  out.push(s.pain.length > 1 && first.pain !== last.pain
    ? `통증은 0~10점 중 ${first.pain}점에서 ${last.pain}점으로 ${last.pain < first.pain ? "줄었어요" : "늘었어요"}.`
    : `통증은 0~10점 중 ${last.pain}점이에요.`);
  out.push(s.missed.length ? `약을 못 챙긴 때: ${s.missed.map((m) => `${mdKr(m.date)} ${m.slots.join("·")}`).join(", ")}.` : "약은 모두 챙겨 먹었어요.");
  const issues = [
    s.fevers.length && s.fevers.map((f) => `${mdKr(f.date)} ${feverText(f)}`).join(", "),
    s.wounds.length && `${s.wounds.map(mdKr).join(", ")} 수술 부위 진물·벌어짐`,
    s.sideEffects.length && `${s.sideEffects.map(mdKr).join(", ")} 약 먹고 불편함`,
    s.bowel.length && s.bowel.map((b) => `${mdKr(b.date)} ${BOWEL_LABEL[b.bowel]}`).join(", "),
  ].filter(Boolean);
  out.push(issues.length ? `다만 ${issues.join(" / ")}이 있었어요.` : "열, 상처, 약 부작용, 배변은 이상 없었어요.");
  return out.join(" ");
}

// 할 일 말투('~물어보기', '~문의하기')를 의사가 읽는 질문으로. 규칙에 안 맞으면 원문을 해치지 않고 '~에 대해 알려 주세요'로 둔다.
// 진료실에 가져갈 질문: 내가 적은 것과 퇴원 뒤 기본 질문 중 아직 답을 못 들은 것, 최대 5개
export const pickVisitQuestions = <T extends { kind: string; done: boolean; source: string; rel_day: number | null }>(tasks: T[]): T[] => {
  const asked = tasks.filter((t) => t.kind === "question" && !t.done);
  return [...asked.filter((t) => t.source === "manual"), ...asked.filter((t) => t.source !== "manual" && (t.rel_day ?? 0) > 0)].slice(0, 5);
};

export function askForm(title: string): string {
  const quoted = title.match(/['"‘“]([^'"’”]+[?？])['"’”]/);
  if (quoted) return quoted[1];
  const t = title.trim().replace(/^(회진|외래) 때\s*/, "").replace(/^(의사 선생님|의료진|주치의)(께|에게)\s*/, "");
  const body = t.replace(/\s*(?:을|를)?\s*(?:(?:병원|원무과|의료진|의사 선생님)(?:에|에게|께)\s*)?(?:물어보기|여쭤보기|문의하기|확인하기|확인해 보기|질문하기)$/, "");
  if (body === t) return /[요까나가]$/.test(t) ? `${t}?` : t;
  if (!body) return title;
  const ask = body.replace(/(한|인|은)지$/, "$1가요?").replace(/는지$/, "나요?");
  return ask !== body ? ask : `${body}에 대해 알려 주세요.`;
}

// 체온 입력 검증: 미열·고열을 골랐을 때만 35~42℃ 사이 값을 소수 첫째 자리까지 받는다
export function cleanTempC(raw: unknown, temp: string): number | null {
  const n = typeof raw === "string" ? Number(raw.replace(",", ".")) : Number(raw);
  return temp !== "normal" && raw !== "" && raw != null && Number.isFinite(n) && n >= 35 && n <= 42 ? Math.round(n * 10) / 10 : null;
}

export function summarize(checks: Daily[], from: string, today: string) {
  const list = [...checks].sort((a, b) => a.check_date.localeCompare(b.check_date));
  const span = Math.max(list.length, Math.round((Date.parse(today) - Date.parse(from)) / 86_400_000) + 1);
  const doses = list.length * 3;
  const taken = list.reduce((n, c) => n + +c.med_morning + +c.med_lunch + +c.med_dinner, 0);
  return {
    days: list.length,
    span, // 기록 대상 기간(일). 복약률은 '기록한 날' 기준이라 기록률을 같이 보여줘야 오해가 없다
    adherence: doses ? Math.round((taken / doses) * 100) : null,
    // 기록이 3일 미만이면 평균이 의미 없어서 일자별 값만 보여준다
    avgPain: list.length >= 3 ? Math.round((list.reduce((n, c) => n + c.pain, 0) / list.length) * 10) / 10 : null,
    maxPain: list.length ? Math.max(...list.map((c) => c.pain)) : null,
    pain: list.map((c) => ({ date: c.check_date, pain: c.pain })),
    fevers: list.filter((c) => c.temp !== "normal").map((c) => ({ date: c.check_date, temp: c.temp, c: c.temp_c ?? null })),
    missed: list.map((c) => ({ date: c.check_date, slots: ([!c.med_morning && "아침", !c.med_lunch && "점심", !c.med_dinner && "저녁"] as (string | false)[]).filter(Boolean) as string[] })).filter((m) => m.slots.length),
    wounds: list.filter((c) => c.wound_issue).map((c) => c.check_date),
    sideEffects: list.filter((c) => c.side_effect).map((c) => c.check_date),
    bowel: list.filter((c) => c.bowel !== "good").map((c) => ({ date: c.check_date, bowel: c.bowel })),
  };
}
