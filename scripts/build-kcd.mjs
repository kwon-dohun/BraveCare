// 심평원 상병마스터 CSV(공공데이터포털, CP949) → lib/kcd-data.json  { "S720": ["대퇴골 경부의 골절"], ... }
// 이용허락범위: 공공저작물 출처표시(제1유형) — 화면에 "출처: 건강보험심사평가원 상병마스터"를 표시한다. 차기 등록 예정 2026-11-30.
// 사용: node scripts/build-kcd.mjs <csv 경로>   (연 1회 새 파일이 나오면 다시 돌린다)
import fs from "node:fs";

const src = process.argv[2];
if (!src) throw new Error("사용법: node scripts/build-kcd.mjs <상병마스터.csv>");
const text = new TextDecoder("euc-kr").decode(fs.readFileSync(src));

// 따옴표 안의 쉼표를 지키는 한 줄 파서
const cells = (line) => {
  const out = [];
  let cur = "", q = false;
  for (const ch of line) {
    if (ch === '"') q = !q;
    else if (ch === "," && !q) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out;
};

const table = {};
for (const line of text.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const [code, name] = cells(line);
  if (!code || !name) continue;
  const names = (table[code.trim().toUpperCase()] ??= []);
  if (!names.includes(name.trim())) names.push(name.trim());
}
fs.writeFileSync(new URL("../lib/kcd-data.json", import.meta.url), JSON.stringify(table));
console.log("코드", Object.keys(table).length);
