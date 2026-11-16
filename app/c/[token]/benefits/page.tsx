import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { loadSaved } from "@/lib/load";
import Icon from "@/components/Icon";
import { REASON_LABEL } from "@/lib/options";
import AiBenefitsExplorer from "@/components/AiBenefitsExplorer";
import BenefitsFilterView from "@/components/BenefitsFilterView";

export const metadata = { title: "지원 · 씩씩케어" };

export default async function Benefits(props: PageProps<"/c/[token]/benefits">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const v = typeof sp.v === "string" ? sp.v : "";
  const { actor, data, auth, base } = await adminPage(token);
  const { status } = data;
  // '해당 없음'은 보여주지 않는다: 다른 지역 제도처럼 나와 상관없는 것이 내 목록에 있으면 오해를 산다
  const results = data.results.filter((r) => r.verdict !== "no");
  const high = results.filter((r) => r.verdict === "high");
  const saved = await loadSaved(actor.memberId);

  const reasonLabel = REASON_LABEL.find(([k]) => k === data.input.reason)?.[1] ?? "퇴원 후 회복";
  const region = `${data.input.sido} ${data.input.sigungu}`.trim();

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-title font-display leading-snug">우리 가족이 받을 수 있는<br />지원 <span className="text-accent tabular-nums">{high.length}개</span></h1>
        <Link href={`${base}/benefits/saved`} className="flex shrink-0 flex-col items-center gap-0.5 rounded-2xl bg-card px-3 py-2 text-caption font-semibold text-muted shadow-card">
          <Icon name="like" size={22} className={saved.length ? "fill-current text-[#e0517a]" : ""} />
          찜 <span className="tabular-nums">{saved.length}</span>
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">입력한 조건으로 대상이 될 수 있는 지원 {results.length}개를 골랐어요. 특정 업체로 연결하지 않아요. 마음에 드는 지원은 하트로 찜해 두세요.</p>

      {/* 기본 26개 밖의 추가 확인처 (확인된 기관·제도만) */}
      <AiBenefitsExplorer auth={auth} region={region || null} reasonLabel={reasonLabel} base={base} savedExtra={saved.filter((s) => s.startsWith("x:"))} />

      {/* 실시간 탭 필터 및 키워드 검색기 */}
      <BenefitsFilterView
        results={results}
        status={status}
        base={base}
        auth={auth}
        saved={saved}
        initialFilter={v}
      />

      <p className="mt-6 text-sm text-muted">최종 대상 여부는 운영 기관에서 결정해요. 각 제도 상세에서 문의처를 확인하세요.</p>
    </>
  );
}
