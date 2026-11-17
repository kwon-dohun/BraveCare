// 외래 때 의료진에게 보여줄 한 장 요약의 계산. 해석·판단은 하지 않고 기록한 값만 센다.

export interface Daily {
  check_date: string;
  med_morning: boolean; med_lunch: boolean; med_dinner: boolean;
  side_effect: boolean;
  temp: "normal" | "mild" | "high";
  wound_issue: boolean;
  pain: number; // 0~10
  bowel: "good" | "constipation" | "diarrhea";
  notes?: string | null;
  source_role?: "family" | "patient";
}

export const TEMP_LABEL = { normal: "정상", mild: "미열 (37.5도 이상)", high: "고열 (38도 이상)" } as const;
export const BOWEL_LABEL = { good: "원활", constipation: "변비·답답함", diarrhea: "설사" } as const;
export const PAIN_WORD = (n: number) => (n === 0 ? "없음" : n <= 3 ? "약함" : n <= 6 ? "보통" : n <= 8 ? "심함" : "매우 심함");

// 진료실에서 그대로 읽어도 되는 말하기 요약. 기록한 값만 문장으로 옮기고 해석은 하지 않는다.
export function speakScript(s: ReturnType<typeof summarize>): string {
  if (!s.days) return "";
  const md = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일`;
  const out = [`퇴원 후 ${s.span}일 중 ${s.days}일을 기록했어요.`];
  if (s.adherence !== null) out.push(`기록한 날 기준으로 약은 ${s.adherence}% 챙겨 먹었어요.`);
  if (s.avgPain !== null) out.push(`통증은 평균 ${s.avgPain}점, 가장 심할 때 ${s.maxPain}점이었어요.`);
  else out.push(`통증은 ${s.pain.map((p) => `${md(p.date)} ${p.pain}점`).join(", ")}이었어요.`);
  const issues = [
    s.fevers.length && `${s.fevers.map((f) => `${md(f.date)} ${f.temp === "high" ? "고열" : "미열"}`).join(", ")}`,
    s.wounds.length && `${s.wounds.map(md).join(", ")} 수술 부위 진물·벌어짐`,
    s.sideEffects.length && `${s.sideEffects.map(md).join(", ")} 약 먹고 불편함`,
    s.bowel.length && `${s.bowel.map((b) => `${md(b.date)} ${BOWEL_LABEL[b.bowel]}`).join(", ")}`,
  ].filter(Boolean);
  out.push(issues.length ? `다만 ${issues.join(" / ")}이 있었어요.` : "열, 상처, 약 부작용, 배변은 기록한 날 모두 이상 없었어요.");
  return out.join(" ");
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
    fevers: list.filter((c) => c.temp !== "normal").map((c) => ({ date: c.check_date, temp: c.temp })),
    wounds: list.filter((c) => c.wound_issue).map((c) => c.check_date),
    sideEffects: list.filter((c) => c.side_effect).map((c) => c.check_date),
    bowel: list.filter((c) => c.bowel !== "good").map((c) => ({ date: c.check_date, bowel: c.bowel })),
  };
}
