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

export const EXTRACT_PROMPT = `너는 병원에서 받은 서류(진단서·소견서·입퇴원확인서, 퇴원 안내문, 약봉투·처방전, 영수증) 사진을 글자 그대로 옮겨 적는 도구야. 의료 판단·해석·요약·보충 설명은 절대 하지 마.
1) transcript: 사진에 보이는 글자를 있는 그대로 옮겨 적어. 진단명, 질병분류기호(질병코드), 입원·퇴원·진단 날짜, 의사 소견, 복약 방법, 검사/외래 일정, 비용 내역 등을 빠짐없이 적어. 사진이 흐리거나 글자가 없는 사물/얼굴 사진이면 빈 문자열("")로 둬.
2) items: transcript 안의 문장 중 가족 캘린더 일정이나 할 일이 될 만한 것을 골라. (진단서나 영수증처럼 외래/검사 일정이 없으면 items는 빈 배열 []로 둬). 각 항목은:
   - kind: "schedule"(외래·검사 등 방문 일정) | "medication"(복약) | "caution"(주의사항) | "contact"(문의처·전화번호)
   - text: transcript에 있는 문장을 한 글자도 바꾸지 않고 그대로 복사한 것. 숫자(복용량, 날짜, 전화번호)도 원문 그대로.
3) docType: "certificate"(진단서·소견서·입퇴원확인서) | "guide"(퇴원 안내문·외래예약증) | "medication"(약봉투·처방전·복약안내) | "receipt"(진료비 영수증·세부내역서) | "other"
4) fields: 서류 종류에 맞는 칸을 채워. 칸 이름은 아래 것만 쓰고, 값은 transcript에 있는 글자를 한 글자도 바꾸지 않고 복사해. 서류에 없으면 빈 문자열.
   - medication: "조제일", "며칠분", "약국"
   - receipt: "진료 기간", "합계", "본인부담", "비급여", "병원"
   - certificate: "병명", "질병코드", "진단일", "발병일"
   - guide: "외래 일정", "주의사항", "문의"
5) meds: docType이 medication일 때만, 약마다 {"name": 약 이름(한글 이름, 원문 그대로), "how": 그 약을 먹는 법(원문 그대로, 없으면 빈 문자열)}. 다른 서류면 빈 배열.
   - 원문에 없는 내용, 해석, 계산은 넣지 마.
JSON만 출력해: {"docType": "...", "transcript": "...", "items": [{"kind": "...", "text": "..."}], "fields": {"칸 이름": "값"}, "meds": [{"name": "...", "how": "..."}]}
병원 서류가 아니거나 글자를 읽을 수 없으면 {"docType": "other", "transcript": "", "items": [], "fields": {}, "meds": []}.`;

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
  const f = (raw.fields && typeof raw.fields === "object" ? raw.fields : {}) as Record<string, unknown>;
  const values = Object.fromEntries(FIELD_LABELS[type].map((k) => [k, inT(str(f[k], 120))]));
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

export function parseModelJson(raw: string): { docType: DocType; transcript: string; items: RawItem[]; fields: unknown; meds: unknown } {
  const body = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
  try {
    const j = JSON.parse(body);
    const items = Array.isArray(j.items) ? j.items : [];
    return {
      docType: DOC_TYPES.includes(j.docType) ? j.docType : "other",
      transcript: typeof j.transcript === "string" ? j.transcript : "",
      items: items.filter((i: RawItem) => i && typeof i.text === "string" && ["schedule", "medication", "caution", "contact"].includes(i.kind)),
      fields: j.fields,
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

export function toDocItems(items: RawItem[], today: string): DocItem[] {
  return items.map((i) => {
    const date = parseDate(i.text, today);
    return { ...i, date, needsCheck: i.kind === "schedule" && !date };
  });
}


