// 보험개발원 실손24 참여 요양기관 안내 서비스 (공공데이터포털 Open API)
// 엔드포인트: https://apis.data.go.kr/B552772/silson24/recuperation-institutions

export interface SilsonHospital {
  name: string;
  code?: string;
  address?: string;
  type?: string; // 상급종합, 종합병원, 병원 등
  participating: boolean; // 실손24 전산 청구 개시 여부
  source: "api" | "preset";
}

// 공모전 시연 및 API 일시 장애 대비 주요 참여 상급종합/종합병원 프리셋
export const KNOWN_PARTICIPATING_HOSPITALS: Omit<SilsonHospital, "source">[] = [
  { name: "서울대학교병원", code: "11100011", address: "서울특별시 종로구 대학로 101", type: "상급종합", participating: true },
  { name: "분당서울대학교병원", code: "31100018", address: "경기도 성남시 분당구 구미로173번길 82", type: "상급종합", participating: true },
  { name: "연세대학교의과대학세브란스병원", code: "11100020", address: "서울특별시 서대문구 연세로 50-1", type: "상급종합", participating: true },
  { name: "강남세브란스병원", code: "11100089", address: "서울특별시 강남구 언주로 211", type: "상급종합", participating: true },
  { name: "서울아산병원", code: "11100046", address: "서울특별시 송파구 올림픽로43길 88", type: "상급종합", participating: true },
  { name: "삼성서울병원", code: "11100054", address: "서울특별시 강남구 일원로 81", type: "상급종합", participating: true },
  { name: "가톨릭대학교 서울성모병원", code: "11100062", address: "서울특별시 서초구 반포대로 222", type: "상급종합", participating: true },
  { name: "가톨릭대학교 여의도성모병원", code: "11100071", address: "서울특별시 영등포구 63로 10", type: "종합병원", participating: true },
  { name: "국립암센터", code: "31100026", address: "경기도 일산동구 일산로 323", type: "종합병원", participating: true },
  { name: "고려대학교의과대학부속안암병원", code: "11100038", address: "서울특별시 성북구 고려대로 73", type: "상급종합", participating: true },
  { name: "고려대학교의과대학부속구로병원", code: "11100097", address: "서울특별시 구로구 구로동로 148", type: "상급종합", participating: true },
  { name: "한양대학교병원", code: "11100101", address: "서울특별시 성동구 왕십리로 222-1", type: "상급종합", participating: true },
  { name: "경희대학교병원", code: "11100119", address: "서울특별시 동대문구 경희대로 23", type: "상급종합", participating: true },
  { name: "아주대학교병원", code: "31100034", address: "경기도 수원시 영통구 월드컵로 164", type: "상급종합", participating: true },
  { name: "인하대학교의과대학부속병원", code: "22100010", address: "인천광역시 중구 인항로 27", type: "상급종합", participating: true },
  { name: "중앙대학교병원", code: "11100127", address: "서울특별시 동작구 흑석로 102", type: "상급종합", participating: true },
  { name: "이화여자대학교의과대학부속목동병원", code: "11100135", address: "서울특별시 양천구 안양천로 1071", type: "상급종합", participating: true },
  { name: "건국대학교병원", code: "11100143", address: "서울특별시 광진구 능동로 120-1", type: "상급종합", participating: true },
];

export const normalizeHospitalName = (s: string) =>
  s.replace(/\s+/g, "").replace(/의료법인|학교법인|재단법인|사단법인|사회복지법인/g, "").trim().toLowerCase();

// API 응답 캐시 (1시간 유지)
let cachedApiHospitals: SilsonHospital[] | null = null;
let lastCachedAt = 0;
const CACHE_TTL_MS = 60 * 60 * 1000;

export async function fetchSilsonFromApi(query: string, serviceKey: string): Promise<SilsonHospital[]> {
  const normQ = normalizeHospitalName(query);
  if (!normQ) return [];

  const now = Date.now();
  if (!cachedApiHospitals || now - lastCachedAt > CACHE_TTL_MS) {
    const key = serviceKey.trim();
    // 공공데이터 URL: serviceKey가 이미 인코딩되어 있을 수 있으므로 파라미터 직접 조립
    const url = `https://apis.data.go.kr/B552772/silson24/recuperation-institutions?serviceKey=${key}&dataType=JSON&pageNo=1&numOfRows=1000`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);

    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { Accept: "application/json" },
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        const rawItems = json?.response?.body?.items ?? [];
        const items = Array.isArray(rawItems) ? rawItems : [rawItems];

        cachedApiHospitals = items.map((item: Record<string, unknown>) => ({
          name: String(item.recuperationInstitutionName ?? item.yadmNm ?? "").trim(),
          code: String(item.encryptionRecuperationInstitutionNumber ?? item.ykiho ?? "").trim() || undefined,
          address: String(item.address ?? item.addr ?? "").trim() || undefined,
          type: String(item.recuperationInstitutionAssortmentCodeName ?? item.clCdNm ?? "").trim() || undefined,
          participating: String(item.openYn ?? "Y").toUpperCase() === "Y",
          source: "api" as const,
        })).filter((h: SilsonHospital) => h.name.length > 0);

        lastCachedAt = now;
      }
    } catch {
      // API 실패 시 기존 캐시 유지 또는 fallback
    } finally {
      clearTimeout(timer);
    }
  }

  if (cachedApiHospitals && cachedApiHospitals.length > 0) {
    return cachedApiHospitals.filter((h) => {
      const normItem = normalizeHospitalName(h.name);
      return normItem.includes(normQ) || normQ.includes(normItem);
    });
  }

  return [];
}

export async function searchSilsonHospitals(query: string, apiKey?: string): Promise<{
  query: string;
  hospitals: SilsonHospital[];
  hasApiKey: boolean;
}> {
  const q = query.trim();
  if (q.length < 2) {
    return { query: q, hospitals: [], hasApiKey: !!apiKey };
  }

  const normQ = normalizeHospitalName(q);
  const key = apiKey || process.env.SILSON24_SERVICE_KEY;

  if (key) {
    try {
      const apiHospitals = await fetchSilsonFromApi(q, key);
      if (apiHospitals.length > 0) {
        return { query: q, hospitals: apiHospitals, hasApiKey: true };
      }
    } catch {}
  }

  // API가 없거나 결과가 없을 때 프리셋 검색 (폴백)
  const matched = KNOWN_PARTICIPATING_HOSPITALS.filter((h) => {
    const n = normalizeHospitalName(h.name);
    return n.includes(normQ) || normQ.includes(n);
  }).map((h) => ({ ...h, source: "preset" as const }));

  return { query: q, hospitals: matched, hasApiKey: !!key };
}
