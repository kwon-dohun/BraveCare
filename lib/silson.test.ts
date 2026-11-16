import test from "node:test";
import assert from "node:assert/strict";
import { searchSilsonHospitals, normalizeHospitalName, KNOWN_PARTICIPATING_HOSPITALS } from "./silson.ts";

test("실손24: 병원명 정규화 - 띄어쓰기 및 법인 접두사 제거", () => {
  assert.equal(normalizeHospitalName("  서울 아산 병원 "), "서울아산병원");
  assert.equal(normalizeHospitalName("학교법인 연세대학교 세브란스병원"), "연세대학교세브란스병원");
  assert.equal(normalizeHospitalName("의료법인 서울성모병원"), "서울성모병원");
});

test("실손24: 2글자 미만 검색은 빈 결과 반환", async () => {
  const res = await searchSilsonHospitals("아");
  assert.equal(res.hospitals.length, 0);
});

test("실손24: 주요 참여 상급종합병원 프리셋 검색 (API 키 없이도 시연 보장)", async () => {
  const asan = await searchSilsonHospitals("아산병원");
  assert.ok(asan.hospitals.length > 0);
  assert.ok(asan.hospitals.some((h) => h.name.includes("아산")));
  assert.equal(asan.hospitals[0].participating, true);

  const snu = await searchSilsonHospitals("서울대");
  assert.ok(snu.hospitals.length > 0);
  assert.ok(snu.hospitals.some((h) => h.name.includes("서울대")));

  const severance = await searchSilsonHospitals("세브란스");
  assert.ok(severance.hospitals.length > 0);
  assert.ok(severance.hospitals.some((h) => h.name.includes("세브란스")));
});

test("실손24: 미참여 병원 검색 시 빈 결과", async () => {
  const unknown = await searchSilsonHospitals("우리동네미참여의원12345");
  assert.equal(unknown.hospitals.length, 0);
});
