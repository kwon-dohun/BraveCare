import { adminPage } from "@/lib/page-auth";
import { REASON_LABEL } from "@/lib/options";
import AiBenefitsExplorer from "@/components/AiBenefitsExplorer";
import BenefitsFilterView from "@/components/BenefitsFilterView";

export const metadata = { title: "지원 · 씩씩케어" };

export default async function Benefits(props: PageProps<"/c/[token]/benefits">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const v = typeof sp.v === "string" ? sp.v : "";
  const { data, auth, base } = await adminPage(token);
  const { results, status } = data;
  const high = results.filter((r) => r.verdict === "high");

  const reasonLabel = REASON_LABEL.find(([k]) => k === data.input.reason)?.[1] ?? "퇴원 후 회복";
  const region = `${data.input.sido} ${data.input.sigungu}`.trim();

  return (
    <>
      <h1 className="text-title font-display leading-snug">우리 가족이 받을 수 있는<br />지원 <span className="text-accent tabular-nums">{high.length}개</span></h1>
      <p className="mt-1 text-sm text-muted">공공 지원 {results.length}가지를 입력한 조건으로 가려냈어요. 특정 업체로 연결하지 않아요.</p>

      {/* 기본 26개 밖의 추가 확인처 (확인된 기관·제도만) */}
      <AiBenefitsExplorer auth={auth} region={region || null} reasonLabel={reasonLabel} base={base} />

      {/* 실시간 탭 필터 및 키워드 검색기 */}
      <BenefitsFilterView
        results={results}
        status={status}
        base={base}
        initialFilter={v}
      />

      <p className="mt-6 text-sm text-muted">최종 대상 여부는 운영 기관에서 결정해요. 각 제도 상세에서 문의처를 확인하세요.</p>
    </>
  );
}
