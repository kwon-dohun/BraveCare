import test from "node:test";
import assert from "node:assert/strict";
import { baseName, pickSuggestions, editDistance } from "./drug.ts";

test("약 이름: 용량·성분 괄호·영문을 떼고 제품 이름만", () => {
  assert.equal(baseName("다이크로짇정 25mg"), "다이크로짇정");
  assert.equal(baseName("슈가메트서방정5/1000밀리그램"), "슈가메트서방정");
  assert.equal(baseName("다이크로짇정(히드로클로로티아지드)"), "다이크로짇정");
  assert.equal(baseName("알마겔정 Almagel Tab 500mg"), "알마겔정");
});

test("약 이름 제안: 허가 목록과 한두 글자 다를 때만, 정확히 있으면 제안 안 함", () => {
  assert.equal(editDistance("다이크로진정", "다이크로짇정"), 1);
  assert.deepEqual(pickSuggestions("다이크로진정 25mg", ["다이크로짇정(히드로클로로티아지드)"]), ["다이크로짇정"]);
  assert.deepEqual(pickSuggestions("다이크로짇정 25mg", ["다이크로짇정(히드로클로로티아지드)"]), []);
  assert.deepEqual(pickSuggestions("타이레놀정", ["다이크로짇정"]), []); // 너무 다르면 제안 안 함
  assert.deepEqual(pickSuggestions("다이크로진정", []), []);
});

test("약 이름 후보: 가까운 순으로 여러 개, 같은 제품 이름은 한 번만, 최대 3개", () => {
  const list = ["프로프정", "모프졸정10mg", "모프졸정20mg", "모프롤정", "오프몬정", "모프졸캡슐", "아주다른약"];
  assert.deepEqual(pickSuggestions("오프졸정", list), ["모프졸정", "오프몬정", "모프롤정"]);
  assert.deepEqual(pickSuggestions("모프졸정", list), []); // 이미 허가 이름이면 제안 안 함
});

test("DUR: 서류함 약끼리 병용금기·효능군중복, 65세 이상만 노인주의", async () => {
  const { durFindings } = await import("./drug.ts");
  const met = { name: "슈가메트서방정", ingr: "[M244179]메트포르민염산염", taboo: [{ MIXTURE_INGR_KOR_NAME: "이오헥솔", MIXTURE_CLASS_NAME: "X선조영제", PROHBT_CONTENT: "유산 산성증" }], elderly: [], effect: [] };
  const a = { name: "가약정", ingr: "[M1]아세트아미노펜", taboo: [{ MIXTURE_INGR_KOR_NAME: "졸피뎀", MIXTURE_CLASS_NAME: "최면진정제", PROHBT_CONTENT: "호흡 억제" }], elderly: [{ PROHBT_CONTENT: "낙상 위험" }], effect: [{ EFFECT_NAME: "해열진통소염제" }] };
  const b = { name: "나약정", ingr: "[M2]졸피뎀타르타르산염/[M1]아세트아미노펜", taboo: [], elderly: [], effect: [{ EFFECT_NAME: "해열진통소염제" }] };
  const f = durFindings([met, a, b], false);
  assert.ok(f.includes("함께 먹으면 안 되는 조합(병용금기): 가약정 + 나약정 — 호흡 억제"));
  assert.ok(f.includes("슈가메트서방정과 함께 쓰면 안 되는 약 종류(병용금기): X선조영제"));
  assert.ok(f.includes("같은 효능군 약이 겹침(효능군중복, 해열진통소염제): 가약정, 나약정"));
  assert.ok(!f.some((x) => x.startsWith("노인주의")));
  assert.ok(durFindings([a], true).includes("노인주의: 가약정 — 낙상 위험"));
});
