// 식약처 의약품 제품 허가정보(공공데이터포털). 전문·일반의약품 모두, 효능효과·용법용량·사용상의 주의사항 본문이 있다.
// 키는 Encoding·Decoding 어느 쪽으로 넣어도 되게 한 번 풀었다가 다시 인코딩한다.
const BASE = "https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService08";

interface Item { ITEM_NAME: string; ETC_OTC_CODE?: string; EE_DOC_DATA?: string; UD_DOC_DATA?: string; NB_DOC_DATA?: string; STORAGE_METHOD?: string; CHART?: string; ENTP_NAME?: string }

async function call(op: string, itemName: string, rows: number): Promise<Item[]> {
  const raw = process.env.DATA_GO_KR_KEY;
  if (!raw) return [];
  const url = `${BASE}/${op}?serviceKey=${encodeURIComponent(decodeURIComponent(raw))}&type=json&numOfRows=${rows}&item_name=${encodeURIComponent(itemName)}`;
  try {
    // 허가 정보는 자주 안 바뀌어 하루 캐시. 느리거나 막히면 없는 셈 치고 넘어간다(서류 흐름을 막지 않게)
    const r = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return [];
    const j = await r.json();
    const items = j?.body?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

// "다이크로짇정 25mg", "슈가메트서방정5/1000밀리그램", "다이크로짇정(히드로클로로티아지드)" → 제품 이름만
export const baseName = (n: string) =>
  n.replace(/\(.*?\)/g, " ").replace(/\d.*$/, "").replace(/[A-Za-z].*$/, "").trim().split(/\s+/)[0] ?? "";

// 두 글자 사이 편집 거리(오타 한두 글자를 잡는 데만 쓴다)
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

// 사진에서 읽은 약 이름이 허가 목록에 없으면, 앞부분이 같은 제품 중 한두 글자만 다른 이름을 제안한다
export function pickSuggestion(name: string, official: string[]): string | null {
  const b = baseName(name);
  const names = [...new Set(official.map(baseName).filter(Boolean))];
  if (b.length < 2 || names.includes(b)) return null;
  const best = names.map((n) => [n, editDistance(b, n)] as const).sort((x, y) => x[1] - y[1])[0];
  return best && best[1] <= 2 ? best[0] : null;
}

export async function suggestName(name: string): Promise<string | null> {
  const b = baseName(name);
  if (b.length < 3) return null;
  const list = await call("getDrugPrdtPrmsnInq08", b.slice(0, Math.max(2, b.length - 2)), 30); // 끝 글자 오타도 잡게 앞부분으로 찾는다
  return pickSuggestion(name, list.map((x) => x.ITEM_NAME));
}

const text = (xml = "") => xml.replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<ARTICLE title="([^"]+)"/g, "\n$1\n<").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ").replace(/\s*\n\s*/g, "\n").trim();

// 씩씩이 근거용: 효능·용법은 다, 주의사항은 앞부분(경고·금기)만. 허가 내용이지 이 환자 처방이 아니라는 걸 붙인다
export async function drugInfo(name: string): Promise<{ name: string; text: string } | null> {
  const b = baseName(name);
  if (b.length < 2) return null;
  const [it] = await call("getDrugPrdtPrmsnDtlInq08", b, 1);
  if (!it) return null;
  return {
    name: it.ITEM_NAME,
    text: [
      `제품명: ${it.ITEM_NAME} (${it.ETC_OTC_CODE ?? ""}, ${it.ENTP_NAME ?? ""})`,
      it.CHART && `모양: ${it.CHART}`,
      `효능효과: ${text(it.EE_DOC_DATA)}`,
      `용법용량(허가 기준, 실제 먹는 법은 처방을 따름): ${text(it.UD_DOC_DATA).slice(0, 800)}`,
      `사용상의 주의사항(앞부분): ${text(it.NB_DOC_DATA).slice(0, 1500)}`,
      it.STORAGE_METHOD && `보관: ${it.STORAGE_METHOD}`,
    ].filter(Boolean).join("\n"),
  };
}
