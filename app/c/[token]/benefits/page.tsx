import { adminPage } from "@/lib/page-auth";
import BenefitCard from "@/components/BenefitCard";

export const metadata = { title: "지원 · 씩씩케어" };

export default async function Benefits(props: PageProps<"/c/[token]/benefits">) {
  const { token } = await props.params;
  const { data, base } = await adminPage(token);
  const { results, status } = data;
  const high = results.filter((r) => r.verdict === "high");
  const check = results.filter((r) => r.verdict === "check");
  const no = results.filter((r) => r.verdict === "no");
  const card = (r: (typeof results)[number]) => <li key={r.benefit.id}><BenefitCard r={r} href={`${base}/benefits/${r.benefit.id}`} status={status[r.benefit.id]} /></li>;

  return (
    <>
      <h1 className="text-2xl font-bold">우리 가족 조건에 맞는 지원</h1>
      <p className="mt-1 text-sm text-muted">공공 지원 {results.length}가지를 입력한 조건으로 가려냈어요. 특정 업체로 연결하지 않아요.</p>
      <section className="mt-5">
        <h2 className="mb-2 font-bold">대상 가능성 높음 ({high.length})</h2>
        <ul className="space-y-3">{high.length ? high.map(card) : <li className="text-muted">아직 없어요</li>}</ul>
      </section>
      <section className="mt-6">
        <h2 className="mb-2 font-bold">확인 필요 ({check.length})</h2>
        <ul className="space-y-3">{check.length ? check.map(card) : <li className="text-muted">없어요</li>}</ul>
      </section>
      {no.length > 0 && (
        <details className="mt-6 rounded-xl border border-line bg-card p-4">
          <summary className="cursor-pointer font-bold">해당 없음 ({no.length})</summary>
          <ul className="mt-3 space-y-3">
            {no.map((r) => (
              <li key={r.benefit.id}><p className="font-medium">{r.benefit.name}</p><p className="text-sm text-muted">{r.reason}</p></li>
            ))}
          </ul>
        </details>
      )}
      <p className="mt-6 text-sm text-muted">최종 대상 여부는 운영 기관에서 결정해요. 각 제도 상세에서 문의처를 확인하세요.</p>
    </>
  );
}
