// 진단서의 질병코드를 심평원 상병마스터(한국표준질병사인분류 KCD)와 맞춰 본다.
// 코드는 영문·숫자라 병명(흐린 한자어)보다 사진에서 정확히 읽힌다. 그래서 코드로 공식 병명을 찾아 사람이 확인하게 한다. 자동으로 바꾸지는 않는다.
export type KcdTable = Record<string, string[]>;
export interface KcdHit { code: string; names: string[]; exact: boolean }

// "S72.00", "s72.0O" → "S7200". 첫 글자는 영문, 뒤는 숫자라서 O→0, I·l→1 로 읽은 흔한 오류만 바로잡는다.
export function normCode(raw: string): string {
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.slice(0, 1) + s.slice(1).replace(/O/g, "0").replace(/[IL]/g, "1");
}

// 정확히 있으면 exact, 없으면 한 자리씩 줄여 상위 코드(S7200 → S720)를 찾는다. 3자리(S72) 아래로는 내려가지 않는다. 못 찾으면 null(= 없는 코드)
export function findKcd(table: KcdTable, raw: string): KcdHit | null {
  const full = normCode(raw);
  if (!/^[A-Z]\d{2,}/.test(full)) return null;
  for (let n = full.length; n >= 3; n--) {
    const code = full.slice(0, n);
    if (table[code]) return { code, names: table[code], exact: n === full.length };
  }
  return null;
}

export async function kcdLookup(raw: string): Promise<KcdHit | null> {
  const table = (await import("./kcd-data.json")).default as KcdTable;
  return findKcd(table, raw);
}
