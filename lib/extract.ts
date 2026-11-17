// 퇴원 안내문 추출의 순수 로직. 모델 출력은 믿지 않고, 원문(transcript)에 실제로 있는 문장만 통과시킨다.

export type DocKind = "schedule" | "medication" | "caution" | "contact";
export interface RawItem { kind: DocKind; text: string }
export interface DocItem extends RawItem {
  date: string | null; // 문장에서 한 개로 분명히 읽힌 날짜만. 모호하면 null
  needsCheck: boolean; // 일정인데 날짜가 불분명하면 사용자가 직접 입력하기 전까지 반영 불가
}

export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

export type DocType = "receipt" | "medication" | "guide" | "certificate" | "message" | "other";
export const DOC_TYPES: DocType[] = ["receipt", "medication", "guide", "certificate", "message", "other"];
export const DOC_TYPE_LABEL: Record<DocType, string> = { receipt: "영수증", medication: "약봉투·처방전", guide: "퇴원 안내문", certificate: "진단서·확인서", message: "병원 문자", other: "기타 서류" };

// 주민등록번호 뒷자리는 저장하지 않는다
export const maskIds = (s: string) => s.replace(/(\d{6})\s*-\s*[1-8]\d{6}/g, "$1-*******");

// 유효한 의료/행정 서류인지 검증하는 서버 방어선 (셀카, 사물, 일상 사진 원천 차단)
export const MEDICAL_KEYWORDS_REGEX =
  /병원|의원|의료|진료|처방|영수증|진단|소견|환자|질병|입원|퇴원|외래|복약|투약|약국|약제|조제|검사|급여|비급여|본인부담|원무|수술|치료|재활|상병|질환|주치의|병동|간호|예약|접수|복용|식후|식전|취침|\d\s*(mg|ml|mL|정|캡슐|포)|보험|청구|소독|드레싱|실밥|주사/;

// shortcut: 키워드 사전 판별이라 낯선 서식은 놓칠 수 있다. 오탐이 실제로 보이면 모델의 docType 판단을 같이 본다
export function validateTranscript(transcript: string, verifiedItems = 0): boolean {
  const t = norm(transcript);
  if (verifiedItems > 0) return true; // 원문에서 확인된 일정·복약 문장이 있으면 서류로 본다
  if (t.length < 15) return false;
  return MEDICAL_KEYWORDS_REGEX.test(t);
}

// 출력을 짧게: 같은 글을 두 번 쓰지 않도록 일정·복약 줄은 transcript 안에서 줄 앞 표시(@일정 등)로 고른다.
// 항목은 서버가 그 줄을 그대로 떼어 내므로 원문과 다를 수 없다. docType을 맨 앞에 두어 화면이 빨리 종류를 알 수 있게 한다.
export const EXTRACT_PROMPT = `너는 병원 서류(진단서·소견서·입퇴원확인서, 퇴원 안내문, 약봉투·처방전, 영수증) 사진의 글자를 그대로 옮겨 적는 도구야. 의료 판단·해석·요약·보충은 절대 하지 마. 아래 JSON만, 키 순서대로 출력해.
{"docType": "...", "transcript": "...", "fields": {}, "meds": []}
1) docType: "certificate"(진단서·소견서·입퇴원확인서) | "guide"(퇴원 안내문·외래예약증) | "medication"(약봉투·처방전·복약안내) | "receipt"(진료비 영수증·세부내역서) | "other". 병원 서류가 아니거나 글자를 읽을 수 없으면 docType "other", transcript "".
2) transcript: 보이는 글자를 있는 그대로 줄 단위로 옮겨 적고 줄은 \\n으로 나눠. 진단명, 질병코드, 입원·퇴원·진단 날짜, 의사 소견, 복약 방법, 검사·외래 일정, 비용, 문의처를 빠짐없이. 숫자(복용량·날짜·전화번호)도 원문 그대로.
   가족 캘린더 일정이나 할 일이 될 줄은 그 줄 맨 앞에 표시를 붙여. 표시는 내용이 담긴 줄 자체에만 붙이고, "외래 예약"·"주의사항" 같은 제목 줄에는 붙이지 마. 표시 뒤에는 그 줄을 한 글자도 바꾸지 말고 그대로 써. 해당 없는 줄에는 표시를 붙이지 마. 진단서·영수증처럼 일정이 없으면 표시도 없어.
   예) "@일정 2026-11-27 오전 10시 정형외과 외래" | "@복약 아스피린 100mg 하루 1회 식후" | "@주의 2주간 샤워 금지" | "@연락 병동 02-123-4567"
   표시는 @일정(외래·검사 등 방문 일정), @복약(약 이름과 복용법이 있는 줄: 약봉투는 약 한 줄마다), @주의(주의사항), @연락(문의처·전화번호) 네 가지뿐이야.
3) fields: 서류 종류에 맞는 칸만 쓰고 값은 transcript의 글자를 그대로 복사해. 서류에 없으면 빈 문자열.
   - medication: "조제일", "며칠분", "약국"
   - receipt: "진료 기간", "합계", "본인부담", "비급여", "병원"
   - certificate: "병명", "질병코드", "진단일", "발병일"
   - guide: 쓰지 마(서버가 채워)
4) meds: docType이 medication일 때만, 약마다 {"name": 약 이름(원문 그대로), "how": 먹는 법(원문 그대로, 없으면 "")}. 다른 서류면 [].`;

// ---- 서류 종류별 양식 ----
// 찍은 뒤 사용자가 확인하는 칸. 사람이 확인한 값이 씩씩이의 첫째 근거가 된다.
export const FIELD_LABELS: Record<DocType, string[]> = {
  medication: ["조제일", "며칠분", "약국"],
  receipt: ["진료 기간", "합계", "본인부담", "비급여", "병원"],
  certificate: ["병명", "질병코드", "진단일", "발병일"],
  guide: ["외래 일정", "주의사항", "문의"],
  message: [],
  other: [],
};
export const hasForm = (t: DocType) => FIELD_LABELS[t].length > 0;
export interface Med { name: string; how: string }
export interface DocFields { values: Record<string, string>; meds: Med[] }

const str = (v: unknown, max: number) => (typeof v === "string" ? norm(v).slice(0, max) : "");

// AI가 채운 칸: 원문에 그대로 있는 값만 남기고, 없으면 빈칸(= '못 읽었어요')으로 둔다
export function verifyFields(transcript: string, type: DocType, raw: { fields?: unknown; meds?: unknown }): DocFields {
  const t = norm(transcript);
  const inT = (v: string) => (v && t.includes(v) ? v : "");
  // 여러 줄 값(퇴원 안내문 칸)은 원문에 있는 줄만 남긴다
  const lines = (v: unknown, max: number) => (typeof v === "string" ? v.split("\n").map(norm).filter((p) => p && t.includes(p)).join("\n").slice(0, max) : "");
  const f = (raw.fields && typeof raw.fields === "object" ? raw.fields : {}) as Record<string, unknown>;
  const values = Object.fromEntries(FIELD_LABELS[type].map((k) => [k, lines(f[k], k === "주의사항" ? 800 : 300)]));
  const seen = new Set<string>();
  const meds = type !== "medication" || !Array.isArray(raw.meds) ? [] : raw.meds.flatMap((m) => {
    const name = inT(str(m?.name, 60));
    if (!name || seen.has(name)) return [];
    seen.add(name);
    return [{ name, how: inT(str(m?.how, 120)) }];
  }).slice(0, 30);
  return { values, meds };
}

// 사람이 고친 칸: 사람이 근거라 원문 대조는 하지 않고, 양식에 있는 칸·길이만 지킨다
export function cleanFields(type: DocType, raw: unknown): DocFields {
  const r = (raw && typeof raw === "object" ? raw : {}) as { values?: Record<string, unknown>; meds?: unknown };
  const values = Object.fromEntries(FIELD_LABELS[type].map((k) => [k, str(r.values?.[k], 120)]));
  const meds = type !== "medication" || !Array.isArray(r.meds) ? [] : r.meds.map((m) => ({ name: str(m?.name, 60), how: str(m?.how, 120) })).filter((m) => m.name).slice(0, 30);
  return { values, meds };
}

export const missingCount = (type: DocType, f: DocFields) =>
  FIELD_LABELS[type].filter((k) => !f.values[k]).length + f.meds.filter((m) => !m.how).length + (type === "medication" && !f.meds.length ? 1 : 0);

// 씩씩이 자료·서류함 미리보기에 쓰는 줄. 사람이 확인했으면 그 사실을 붙인다
export function fieldLines(type: DocType, f: DocFields): string[] {
  return [
    ...f.meds.map((m) => `${m.name}: ${m.how || "먹는 법 못 읽음"}`),
    ...FIELD_LABELS[type].filter((k) => f.values[k]).map((k) => `${k}: ${f.values[k]}`),
  ];
}

const TAG: Record<string, DocKind> = { 일정: "schedule", 복약: "medication", 주의: "caution", 연락: "contact" };
// 줄 앞 표시(@일정 등)를 떼어 항목으로 모으고, 표시를 뗀 원문을 돌려준다
export function splitTagged(raw: string): { transcript: string; items: RawItem[] } {
  const items: RawItem[] = [];
  const lines = raw.split(/\r?\n/).map((line) => {
    const m = line.match(/^\s*@(일정|복약|주의|연락)\S*\s+(.+)$/);
    if (!m) return line;
    items.push({ kind: TAG[m[1]], text: m[2] });
    return m[2];
  });
  return { transcript: lines.join("\n"), items };
}

// 모델이 표시를 빠뜨려도 놓치지 않게, 줄 모양만 보고 확실한 것은 코드가 직접 항목으로 만든다(항목은 항상 원문 줄 그대로)
const DATE_LIKE = /\d{4}\s*[-./년]\s*\d{1,2}\s*[-./월]\s*\d{1,2}|\d{1,2}\s*월\s*\d{1,2}\s*일|(?<![\d.:])\d{1,2}\s*\/\s*\d{1,2}(?![\d:.])/;
const VISIT_WORD = /외래|예약|내원|재진|검사|방문/;
const CAUTION = /마세요|마시고|마십시오|금지|삼가|피하세요|즉시 (내원|병원)/;
const PHONE = /0\d{1,2}[-\s]\d{3,4}[-\s]\d{4}/;
const DOSE = /\d\s*(mg|ml|mL|g|㎎|정|캡슐|포)/;
const HOW = /식후|식전|취침|하루|1일|\d\s*회/;
export function itemsFromLines(transcript: string): RawItem[] {
  return transcript.split(/\r?\n/).map(norm).flatMap((text): RawItem[] => {
    if (PHONE.test(text)) return [{ kind: "contact", text }];
    if (DATE_LIKE.test(text) && VISIT_WORD.test(text)) return [{ kind: "schedule", text }];
    if (CAUTION.test(text)) return [{ kind: "caution", text }];
    if (DOSE.test(text) && HOW.test(text)) return [{ kind: "medication", text }];
    return [];
  });
}

// 퇴원 안내문의 칸은 모델이 다시 쓰지 않고, 고른 줄을 그대로 모아 채운다(출력을 줄이고 원문과 어긋날 일을 없앤다)
const guideFields = (items: RawItem[]) => {
  const pick = (k: DocKind) => items.filter((i) => i.kind === k).map((i) => i.text).join("\n");
  return { "외래 일정": pick("schedule"), "주의사항": pick("caution"), "문의": pick("contact") };
};

const docTypeOf = (j: { docType?: unknown }): DocType => (DOC_TYPES.includes(j.docType as DocType) ? (j.docType as DocType) : "other");

export function parseModelJson(raw: string): { docType: DocType; transcript: string; items: RawItem[]; fields: unknown; meds: unknown } {
  const body = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    const j = JSON.parse(body);
    const tagged = splitTagged(typeof j.transcript === "string" ? j.transcript : "");
    const items = [...tagged.items, ...(docTypeOf(j) === "certificate" || docTypeOf(j) === "receipt" ? [] : itemsFromLines(tagged.transcript)), ...(Array.isArray(j.items) ? j.items : [])];
    const docType: DocType = DOC_TYPES.includes(j.docType) ? j.docType : "other";
    return {
      docType,
      transcript: tagged.transcript,
      items: items.filter((i: RawItem) => i && typeof i.text === "string" && ["schedule", "medication", "caution", "contact"].includes(i.kind)),
      fields: docType === "guide" ? guideFields(verifyItems(tagged.transcript, items.filter((i: RawItem) => i && typeof i.text === "string"))) : j.fields,
      meds: j.meds,
    };
  } catch {
    return { docType: "other", transcript: "", items: [], fields: {}, meds: [] };
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

// 한 줄에 일정이 여럿("11/27 외래 / 12/18 CT")이면 구분자로 나눠 날짜마다 항목을 만든다. 나눈 조각은 원문의 일부다.
export function splitMultiDate(i: RawItem, today: string): RawItem[] {
  if (i.kind !== "schedule" || parseDate(i.text, today)) return [i];
  const parts = i.text.split(/\s+[/;·|]\s+|\s*[;·|]\s*|\s{2,}/).filter((p) => parseDate(p, today));
  return parts.length > 1 ? parts.map((text) => ({ ...i, text })) : [i];
}

export function toDocItems(items: RawItem[], today: string): DocItem[] {
  return items.flatMap((i) => splitMultiDate(i, today)).map((i) => {
    const date = parseDate(i.text, today);
    return { ...i, date, needsCheck: i.kind === "schedule" && !date };
  });
}



// 모델이 글자를 쓰는 동안 화면에 보여줄 진짜 진행 상황: 서류 종류가 정해진 때, 옮겨 적은 글자 수, 칸을 채우기 시작한 때
export type ScanProgress = { docType?: DocType; chars: number; sorting: boolean };
export function progressOf(acc: string): ScanProgress {
  const t = acc.indexOf('"transcript"');
  const q = t < 0 ? -1 : acc.indexOf('"', acc.indexOf(":", t) + 1);
  const f = acc.indexOf('"fields"');
  return {
    docType: acc.match(/"docType"\s*:\s*"(\w+)"/)?.[1] as DocType | undefined,
    chars: q < 0 ? 0 : (f > q ? f : acc.length) - q - 1,
    sorting: f > 0,
  };
}

