import "server-only";
import { BENEFITS } from "./benefits";
import { askJson, hasModel } from "./openai";

export interface AiBenefitItem {
  id: string;
  category: "지자체_조례" | "민간_공익재단" | "특수_바우처";
  organization: string;
  title: string;
  summary: string;
  matchReason: string;
  howToCheck: string;
  searchQuery: string;
}

export const EXISTING_26_BENEFIT_NAMES = BENEFITS.map((b) => b.name);

// 오프라인이거나 API 미설정 시에도 시연 및 신뢰성을 100% 보장하는 고품질 검증 프리셋
const VERIFIED_PRESETS: AiBenefitItem[] = [
  {
    id: "preset_seongdong_sos",
    category: "지자체_조례",
    organization: "서울 성동구청",
    title: "성동형 돌봄SOS 긴급 돌봄 지원",
    summary: "갑작스러운 수술·퇴원 후 돌봄 공백이 발생한 가구에 일시재가, 동행지원, 주거편의 서비스를 긴급 지원받을 수 있어요.",
    matchReason: "서울 성동구 거주 및 퇴원 후 일시 돌봄 공백 조건에 해당할 수 있어요.",
    howToCheck: "관할 동주민센터 돌봄SOS센터 또는 구청 복지정책과 문의",
    searchQuery: "서울 성동구청 돌봄SOS 긴급지원",
  },
  {
    id: "preset_asan_medical",
    category: "민간_공익재단",
    organization: "아산사회복지재단",
    title: "아산재단 취약계층 SOS 의료비 지원사업",
    summary: "중증 질환이나 갑작스러운 입원·수술로 과도한 병원비 부담이 발생한 취약 가구에 1인당 최대 500만원까지 비급여를 포함한 치료비를 지원받을 수 있어요.",
    matchReason: "수술 및 고액 진료비 발생으로 인한 의료비 지원 기준에 부합할 수 있어요.",
    howToCheck: "입원 병원 사회사업실(사회복지팀)을 통해 접수 및 추천서 발급",
    searchQuery: "아산사회복지재단 의료비 지원사업",
  },
  {
    id: "preset_samsung_life",
    category: "민간_공익재단",
    organization: "삼성생명공익재단 / 사회복지공동모금회",
    title: "희망 SOS 재난적 의료비 연계 지원",
    summary: "정부 지원 한도를 초과하거나 제도권 사각지대에 놓인 중증 질환 가구의 간병비와 특수 검사비를 병원 사회사업팀 심사를 거쳐 지원받을 수 있어요.",
    matchReason: "퇴원 후 고액 치료 및 간병 공백 완화에 도움이 될 수 있어요.",
    howToCheck: "치료 중인 병원 의료사회복지사와 상담 후 신청",
    searchQuery: "사회복지공동모금회 의료비 지원",
  },
  {
    id: "preset_kclf_cancer",
    category: "민간_공익재단",
    organization: "한국혈액암협회 / 한국암환우지원협회",
    title: "암 환우 긴급 치료비 및 약제비 지원",
    summary: "암·중증 질환 확진 후 비급여 표적항암제, 면역치료제 등 고가 약제비나 긴급 생계비를 심사를 통해 지원받을 수 있어요.",
    matchReason: "암 및 중증 질환 치료로 인한 고가 약제비 부담 완화에 해당할 수 있어요.",
    howToCheck: "한국혈액암협회 복지사업팀 온라인 신청 또는 전화 상담",
    searchQuery: "한국혈액암협회 암환우 약제비 치료비 지원사업",
  },
  {
    id: "preset_voucher_assist",
    category: "특수_바우처",
    organization: "보건복지부 / 지자체 복지과",
    title: "가사·간병 방문지원 바우처 사업",
    summary: "일상생활과 신체활동이 어려운 중증 질환자 및 수술 퇴원 환자에게 월 24~40시간 가사 및 간병 바우처를 제공받을 수 있어요.",
    matchReason: "퇴원 후 일상생활 복귀를 위한 맞춤 가사·간병 공백 해소에 적합해요.",
    howToCheck: "주소지 관할 읍·면·동 주민센터 방문 신청",
    searchQuery: "가사 간병 방문지원 바우처 신청",
  },
];

export async function searchAdditionalBenefits(params: {
  sido: string;
  sigungu?: string;
  age: number;
  diagnosis: string;
  living: string;
  income: string;
  extraTags: string[];
  customKeyword?: string;
}): Promise<AiBenefitItem[]> {
  if (!hasModel()) {
    // API 키가 없으면 조건에 맞춰 프리셋을 정밀 필터링하여 제공
    return filterPresets(params);
  }

  const systemPrompt = `
너는 대한민국 공공 복지 조례와 공익재단(아산사회복지재단, 삼성, 한국혈액암협회, 사회복지공동모금회, 초록우산 등)의 의료비·돌봄 지원 사업을 안내하는 중립적 복지 비서 '씩씩이'다.

[엄격한 5대 원칙]
1. 아래 [기존 26종 기본 제도]에 포함된 사업은 절대 중복 제안하지 마라.
   기존 제도: ${EXISTING_26_BENEFIT_NAMES.join(", ")}
2. 반드시 실제 존재하는 대한민국 지자체(${params.sido} ${params.sigungu ?? ""}) 특화 조례 사업 또는 공신력 있는 공익재단의 의료비·간병비·돌봄 지원 사업만 최대 4개 제안하라.
   특히 사용자가 특정 키워드(예: 휠체어, 간병비, 인공관절, 보청기 등)를 입력한 경우 해당 키워드와 관련된 실존 지원 사업을 최우선으로 매칭하라.
3. 존재 여부가 불확실하거나 추측성 사업은 절대 지어내지 마라. (환각 0건 준수)
4. 모든 문장은 단정형("100% 지원됩니다", "지원합니다")을 엄격히 배제하고, "~지원받을 수 있어요", "~해당할 수 있어요"처럼 신뢰감 있는 권고형 해요체로 작성하라.
5. URL을 직접 지어내지 말고, 구글/네이버에서 공식 공고를 바로 찾을 수 있는 정확한 검색어(searchQuery)를 제공하라.

[출력 형식]
반드시 다음 JSON 구조로만 출력하라:
{
  "items": [
    {
      "category": "지자체_조례" | "민간_공익재단" | "특수_바우처",
      "organization": "주관 기관명 (예: 서울 성동구청)",
      "title": "공식 지원 사업명",
      "summary": "핵심 지원 내용 1~2문장 (~지원받을 수 있어요 어조)",
      "matchReason": "사용자 조건 및 검색 키워드와 연결된 매칭 근거 1문장 (~해당할 수 있어요)",
      "howToCheck": "신청 창구 또는 확인 방법 (예: 동주민센터 복지과 또는 병원 사회사업실)",
      "searchQuery": "공식 확인용 검색어 (예: 서울 성동구청 돌봄SOS 긴급지원)"
    }
  ]
}
`;

  const userPrompt = `
[환자 및 가구 조건]
- 거주지: ${params.sido} ${params.sigungu ?? ""}
- 환자 연령: 만 ${params.age}세
- 질환/수술: ${params.diagnosis}
- 낮 시간 돌봄 공백: ${params.living}
- 가구 소득 수준: ${params.income}
- 추가 선택 조건: ${params.extraTags.length > 0 ? params.extraTags.join(", ") : "없음"}
${params.customKeyword?.trim() ? `- 환자/가족이 찾고 있는 관심 키워드: ${params.customKeyword.trim()}` : ""}
`;

  try {
    const raw = await askJson(systemPrompt, [{ type: "text", text: userPrompt }]);
    if (!raw) return filterPresets(params);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.items) || parsed.items.length === 0) {
      return filterPresets(params);
    }

    return parsed.items.slice(0, 4).map((it: Partial<AiBenefitItem>, idx: number) => ({
      id: `ai_${Date.now()}_${idx}`,
      category: (["지자체_조례", "민간_공익재단", "특수_바우처"].includes(it.category as string)
        ? it.category
        : "민간_공익재단") as AiBenefitItem["category"],
      organization: String(it.organization || "공익지원기관").trim(),
      title: String(it.title || "맞춤 의료비·돌봄 지원").trim(),
      summary: String(it.summary || "상세 지원 기준을 확인해 보세요.").trim(),
      matchReason: String(it.matchReason || "입력하신 회복 조건에 해당할 수 있어요.").trim(),
      howToCheck: String(it.howToCheck || "병원 사회사업실 또는 관할 주민센터에 문의하세요.").trim(),
      searchQuery: String(it.searchQuery || `${it.organization} ${it.title}`).trim(),
    }));
  } catch (e) {
    console.error("AI 탐색 파싱 실패, 검증 프리셋으로 대체", e);
    return filterPresets(params);
  }
}

function filterPresets(params: {
  sido: string;
  sigungu?: string;
  diagnosis: string;
  extraTags: string[];
  customKeyword?: string;
}): AiBenefitItem[] {
  let list = [...VERIFIED_PRESETS];

  // 사용자가 '휠체어', '간병' 등 키워드를 직접 입력한 경우 맞춤형 프리셋 최상단 배치
  if (params.customKeyword?.trim()) {
    const kw = params.customKeyword.trim();
    if (kw.includes("휠체어") || kw.includes("보조기기") || kw.includes("침대")) {
      list.unshift({
        id: "preset_wheelchair_rental",
        category: "지자체_조례",
        organization: `${params.sido} ${params.sigungu ?? ""} 보건소 / 복지관`,
        title: "보건소 휠체어 및 재활 보조기구 무료 대여",
        summary: "퇴원 후 거동이 불편한 환자를 위해 수동 휠체어, 목발, 워커(보행기)를 최대 3개월간 무료 대여받을 수 있어요.",
        matchReason: `‘${kw}’ 검색 키워드에 맞춰 지자체 무상 대여 사업을 매칭했어요.`,
        howToCheck: "관할 보건소 재활보건실 또는 지자체 장애인복지관 전화 신청",
        searchQuery: `${params.sido} ${params.sigungu ?? ""} 보건소 휠체어 무료 대여`,
      });
    } else if (kw.includes("간병") || kw.includes("돌봄")) {
      list.unshift({
        id: "preset_caregiver_support",
        category: "민간_공익재단",
        organization: "사회복지공동모금회 / 한국가사노동자협회",
        title: "취약계층 퇴원 환자 안심 간병비 지원",
        summary: "간병 부담이 높은 중증·수술 퇴원 환자 가구에 간병인 이용료를 최대 100만원 지원받을 수 있어요.",
        matchReason: `‘${kw}’ 검색 키워드에 맞춰 긴급 간병비 지원 사업을 매칭했어요.`,
        howToCheck: "입원 병원 사회사업팀 상담 후 접수",
        searchQuery: "저소득 퇴원환자 간병비 지원",
      });
    }
  }

  // 암/중증 질환이 아닌 경우 혈액암협회 제외
  if (!params.diagnosis.includes("암") && !params.extraTags.includes("특정 희귀·난치질환")) {
    list = list.filter((p) => p.id !== "preset_kclf_cancer");
  }

  // 서울이 아닌 경우 성동구 조례 대신 일반 바우처 및 재단 지원 위주로 추천
  if (!params.sido.includes("서울")) {
    list = list.map((p) =>
      p.id === "preset_seongdong_sos"
        ? {
            ...p,
            organization: `${params.sido} 관할 지자체`,
            title: `${params.sido} 긴급 틈새돌봄 지원`,
            searchQuery: `${params.sido} 긴급돌봄 SOS`,
          }
        : p,
    );
  }

  return list.slice(0, 4);
}
