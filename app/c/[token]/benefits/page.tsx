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
        <h1 className="text-title font-display leading-snug">
          {high.length ? <>{data.isSelfCare ? "내가" : "우리 가족이"}<br />받을 수 있는 지원</>
            : results.length ? <>확인해 볼 지원</>
            : <>지금 조건에 꼭 맞는<br />공공 지원은 아직 없어요</>}
        </h1>
        <Link href={`${base}/benefits/saved`} className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-card px-3.5 text-sm font-semibold text-muted shadow-card">
          <Icon name="like" size={18} className={saved.length ? "fill-current text-[#e0517a]" : ""} />
          찜 <span className="tabular-nums">{saved.length}</span>
        </Link>
      </div>
      <p className="mt-1 text-sm text-muted">
        {high.length ? "입력한 조건으로 골랐어요. 특정 업체로 연결하지 않아요."
          : results.length ? "입력한 조건만으로는 확실히 대상이라고 말하기 어렵지만, 나이·소득·사는 곳에 따라 받을 수 있는 지원이에요. 잘 모르겠으면 주민센터나 129에 물어보면 돼요."
          : "입력한 나이·소득·돌봄 상황으로는 전국 공통 지원 중 맞는 것이 없어요. 아래 '더 알아볼 곳'에서 지역 자체 지원을 확인해 보고, 상황이 바뀌면 설정에서 고치면 다시 찾아 드려요."}
      </p>

      {/* 실시간 탭 필터 및 키워드 검색기 (검증된 47종 맞춤 지원 목록) */}
      <BenefitsFilterView
        results={results}
        status={status}
        base={base}
        auth={auth}
        saved={saved}
        initialFilter={v}
      />

      {/* 기본 지원 밖에서 더 알아볼 곳 (AI 추가 지원 탐색기) */}
      <div className="mt-8">
        <AiBenefitsExplorer auth={auth} region={region || null} reasonLabel={reasonLabel} base={base} savedExtra={saved.filter((s) => s.startsWith("x:"))} />
      </div>

      <p className="mt-6 text-sm text-muted">최종 대상 여부는 운영 기관에서 결정해요. 각 제도 상세에서 문의처를 확인하세요.</p>
    </>
  );
}
