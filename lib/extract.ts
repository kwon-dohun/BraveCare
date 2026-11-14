// 퇴원 안내문 추출의 순수 로직. 모델 출력은 믿지 않고, 원문(transcript)에 실제로 있는 문장만 통과시킨다.

export type DocKind = "schedule" | "medication" | "caution" | "contact";
export interface RawItem { kind: DocKind; text: string }
export interface DocItem extends RawItem {
  date: string | null; // 문장에서 한 개로 분명히 읽힌 날짜만. 모호하면 null
  needsCheck: boolean; // 일정인데 날짜가 불분명하면 사용자가 직접 입력하기 전까지 반영 불가
}

export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export const EXTRACT_PROMPT = `너는 병원 퇴원 안내문 사진을 글자 그대로 옮겨 적는 도구야. 의료 판단·해석·요약·보충 설명은 절대 하지 마.
1) transcript: 사진에 보이는 글자를 있는 그대로 옮겨 적어. 읽기 어려운 부분은 지어내지 말고 건너뛰어.
2) items: transcript 안의 문장 중 할 일이 될 만한 것을 골라. 각 항목은
   - kind: "schedule"(외래·검사 등 일정) | "medication"(복약) | "caution"(주의사항) | "contact"(문의처·전화번호)
   - text: transcript에 있는 문장을 한 글자도 바꾸지 않고 그대로 복사한 것. 숫자(복용량, 날짜, 전화번호)도 원문 그대로.
JSON만 출력해: {"transcript": "...", "items": [{"kind": "...", "text": "..."}]}
퇴원 안내문이 아니거나 글자를 읽을 수 없으면 {"transcript": "", "items": []}.`;

export function parseModelJson(raw: string): { transcript: string; items: RawItem[] } {
  const body = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    const j = JSON.parse(body);
    const items = Array.isArray(j.items) ? j.items : [];
    return {
      transcript: typeof j.transcript === "string" ? j.transcript : "",
      items: items.filter((i: RawItem) => i && typeof i.text === "string" && ["schedule", "medication", "caution", "contact"].includes(i.kind)),
    };
  } catch {
    return { transcript: "", items: [] };
  }
}

// 원문에 없는 항목은 버린다. 중복도 제거.
export function verifyItems(transcript: string, items: RawItem[]): RawItem[] {
  const t = norm(transcript);
  const seen = new Set<string>();
  return items
    .map((i) => ({ ...i, text: norm(i.text) }))
    .filter((i) => i.text.length >= 2 && t.includes(i.text) && !seen.has(i.text) && !!seen.add(i.text));
}

// 날짜를 하나만, 분명하게 읽었을 때만 돌려준다. today 기준 가장 가까운 연도를 고른다.
export function parseDate(text: string, today: string): string | null {
  const found = new Set<string>();
  const add = (y: number | null, m: number, d: number) => {
    if (m < 1 || m > 12 || d < 1 || d > 31) return;
    const base = Number(today.slice(0, 4));
    const years = y ? [y < 100 ? 2000 + y : y] : [base - 1, base, base + 1];
    const best = years
      .map((yy) => `${yy}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`)
      .filter((iso) => new Date(iso).getUTCDate() === d) // 2/30 같은 날짜 제거
      .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(today)) - Math.abs(Date.parse(b) - Date.parse(today)))[0];
    if (best) found.add(best);
  };
  for (const m of text.matchAll(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?/g)) add(+m[1], +m[2], +m[3]);
  const noYear = text.replace(/(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?/g, " ");
  for (const m of noYear.matchAll(/(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) add(null, +m[1], +m[2]);
  for (const m of noYear.matchAll(/(?<![\d.:])(\d{1,2})\s*[/.]\s*(\d{1,2})(?![\d:.])/g)) add(null, +m[1], +m[2]);
  return found.size === 1 ? [...found][0] : null;
}

export function toDocItems(items: RawItem[], today: string): DocItem[] {
  return items.map((i) => {
    const date = parseDate(i.text, today);
    return { ...i, date, needsCheck: i.kind === "schedule" && !date };
  });
}
