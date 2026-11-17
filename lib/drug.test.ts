import test from "node:test";
import assert from "node:assert/strict";
import { baseName, pickSuggestion, editDistance } from "./drug.ts";

test("약 이름: 용량·성분 괄호·영문을 떼고 제품 이름만", () => {
  assert.equal(baseName("다이크로짇정 25mg"), "다이크로짇정");
  assert.equal(baseName("슈가메트서방정5/1000밀리그램"), "슈가메트서방정");
  assert.equal(baseName("다이크로짇정(히드로클로로티아지드)"), "다이크로짇정");
  assert.equal(baseName("알마겔정 Almagel Tab 500mg"), "알마겔정");
});

test("약 이름 제안: 허가 목록과 한두 글자 다를 때만, 정확히 있으면 제안 안 함", () => {
  assert.equal(editDistance("다이크로진정", "다이크로짇정"), 1);
  assert.equal(pickSuggestion("다이크로진정 25mg", ["다이크로짇정(히드로클로로티아지드)"]), "다이크로짇정");
  assert.equal(pickSuggestion("다이크로짇정 25mg", ["다이크로짇정(히드로클로로티아지드)"]), null);
  assert.equal(pickSuggestion("타이레놀정", ["다이크로짇정"]), null); // 너무 다르면 제안 안 함
  assert.equal(pickSuggestion("다이크로진정", []), null);
});
