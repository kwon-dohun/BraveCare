// 퇴원 안내문 추출의 순수 로직. 모델 출력은 믿지 않고, 원문(transcript)에 실제로 있는 문장만 통과시킨다.

export type DocKind = "schedule" | "medication" | "caution" | "contact";
export interface RawItem { kind: DocKind; text: string }
export interface DocItem extends RawItem {
  date: string | null; // 문장에서 한 개로 분명히 읽힌 날짜만. 모호하면 null
  needsCheck: boolean; // 일정인데 날짜가 불분명하면 사용자가 직접 입력하기 전까지 반영 불가
}

export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export type DocType = "receipt" | "medication" | "guide" | "message" | "other";
export const DOC_TYPES: DocType[] = ["receipt", "medication", "guide", "message", "other"];
export const DOC_TYPE_LABEL: Record<DocType, string> = { receipt: "영수증", medication: "약봉투·처방전", guide: "퇴원 안내문", message: "병원 문자", other: "기타 서류" };

// 주민등록번호 뒷자리는 저장하지 않는다
export const maskIds = (s: string) => s.replace(/(\d{6})\s*-\s*[1-8]\d{6}/g, "$1-*******");

export const EXTRACT_PROMPT = `너는 병원에서 받은 서류(퇴원 안내문, 약봉투·처방전, 영수증) 사진을 글자 그대로 옮겨 적는 도구야. 의료 판단·해석·요약·보충 설명은 절대 하지 마.
1) transcript: 사진에 보이는 글자를 있는 그대로 옮겨 적어. 읽기 어려운 부분은 지어내지 말고 건너뛰어.
2) items: transcript 안의 문장 중 할 일이 될 만한 것을 골라. 각 항목은
   - kind: "schedule"(외래·검사 등 일정) | "medication"(복약) | "caution"(주의사항) | "contact"(문의처·전화번호)
   - text: transcript에 있는 문장을 한 글자도 바꾸지 않고 그대로 복사한 것. 숫자(복용량, 날짜, 전화번호)도 원문 그대로.
3) docType: "receipt"(진료비 영수증·세부내역서) | "medication"(약봉투·처방전·복약안내) | "guide"(퇴원 안내문·예약증) | "other"
JSON만 출력해: {"docType": "...", "transcript": "...", "items": [{"kind": "...", "text": "..."}]}
병원 서류가 아니거나 글자를 읽을 수 없으면 {"docType": "other", "transcript": "", "items": []}.`;

export function parseModelJson(raw: string): { docType: DocType; transcript: string; items: RawItem[] } {
  const body = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    const j = JSON.parse(body);
    const items = Array.isArray(j.items) ? j.items : [];
    return {
      docType: DOC_TYPES.includes(j.docType) ? j.docType : "other",
      transcript: typeof j.transcript === "string" ? j.transcript : "",
      items: items.filter((i: RawItem) => i && typeof i.text === "string" && ["schedule", "medication", "caution", "contact"].includes(i.kind)),
    };
  } catch {
    return { docType: "other", transcript: "", items: [] };
  }
}

// 병원 문자·알림톡을 붙여넣은 글에서 날짜가 있는 줄을 일정 후보로 뽑는다. AI를 쓰지 않는다.
export function itemsFromText(text: string, today: string): DocItem[] {
  const lines = text.split(/\r?\n/).map(norm).filter((l) => l.length >= 2);
  const dated = lines.filter((l) => parseDate(l, today));
  // 날짜가 줄마다 나뉘어 있지 않으면 글 전체를 한 항목으로 보고 사용자가 날짜를 넣게 한다
  const picked = dated.length ? dated : lines.length ? [norm(text).slice(0, 200)] : [];
  return toDocItems(picked.map((t) => ({ kind: "schedule" as const, text: t })), today);
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
