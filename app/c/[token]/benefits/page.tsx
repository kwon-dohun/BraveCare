import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import BenefitCard from "@/components/BenefitCard";

export const metadata = { title: "지원 · 씩씩케어" };

// 할 일 화면의 필터 칩과 같은 모양. 기본은 전체를 판정별로 묶어 보여준다.
const FILTERS = [["", "전체"], ["high", "가능성 높음"], ["check", "확인 필요"], ["no", "해당 없음"]] as const;

export default async function Benefits(props: PageProps<"/c/[token]/benefits">) {
  const { token } = await props.params;
  const v = (await props.searchParams).v;
  const { data, base } = await adminPage(token);
  const { results, status } = data;
  const high = results.filter((r) => r.verdict === "high");
  const check = results.filter((r) => r.verdict === "check");
  const no = results.filter((r) => r.verdict === "no");
  const count = { "": results.length, high: high.length, check: check.length, no: no.length };
  const card = (r: (typeof results)[number]) => <li key={r.benefit.id}><BenefitCard r={r} href={`${base}/benefits/${r.benefit.id}`} status={status[r.benefit.id]} /></li>;
  const noRow = (r: (typeof results)[number]) => <li key={r.benefit.id} className="px-4 py-3"><p className="font-medium">{r.benefit.name}</p><p className="text-sm text-muted">{r.reason}</p></li>;

  return (
    <>
      <h1 className="text-2xl font-extrabold leading-snug">우리 가족이 받을 수 있는<br />지원 <span className="text-accent tabular-nums">{high.length}개</span></h1>
      <p className="mt-1 text-sm text-muted">공공 지원 {results.length}가지를 입력한 조건으로 가려냈어요. 특정 업체로 연결하지 않아요.</p>

      <nav aria-label="지원 필터" className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5">
        {FILTERS.map(([k, label]) => {
          const active = (v ?? "") === k;
          return (
            <Link key={label} href={k ? `${base}/benefits?v=${k}` : `${base}/benefits`} aria-current={active ? "true" : undefined}
              className={`flex shrink-0 items-center rounded-full border px-4 text-sm ${active ? "border-foreground bg-foreground font-medium text-white" : "border-line bg-card text-muted"}`}>
              {label} <span className="ml-1 tabular-nums">{count[k]}</span>
            </Link>
          );
        })}
      </nav>

      {v === "high" || v === "check" ? (
        <ul className="mt-5 space-y-3">{(v === "high" ? high : check).map(card)}</ul>
      ) : v === "no" ? (
        <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-card">{no.map(noRow)}</ul>
      ) : (
        <>
          <section className="mt-5">
            <h2 className="mb-2 font-bold">대상 가능성 높음 ({high.length})</h2>
            <ul className="space-y-3">{high.length ? high.map(card) : <li className="text-muted">아직 없어요</li>}</ul>
          </section>
          <section className="mt-6">
            <h2 className="mb-2 font-bold">확인 필요 ({check.length})</h2>
            <ul className="space-y-3">{check.length ? check.map(card) : <li className="text-muted">없어요</li>}</ul>
          </section>
          {no.length > 0 && (
            <details className="mt-6 rounded-xl border border-line bg-card">
              <summary className="cursor-pointer p-4 font-bold">해당 없음 ({no.length})</summary>
              <ul className="divide-y divide-line border-t border-line">{no.map(noRow)}</ul>
            </details>
          )}
        </>
      )}
      <p className="mt-6 text-sm text-muted">최종 대상 여부는 운영 기관에서 결정해요. 각 제도 상세에서 문의처를 확인하세요.</p>
    </>
  );
}
