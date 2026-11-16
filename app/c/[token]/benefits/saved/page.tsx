import Icon, { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";
import { loadSaved } from "@/lib/load";
import { extraById } from "@/lib/ai-benefits";
import BenefitCard from "@/components/BenefitCard";
import SaveButton from "@/components/SaveButton";
import Mascot from "@/components/Mascot";

export const metadata = { title: "찜한 지원 · 씩씩케어" };

// 내가 찜한 지원: 기본 지원과 '더 알아볼 곳'을 한곳에 모아 다시 찾기 쉽게
export default async function SavedBenefits(props: PageProps<"/c/[token]/benefits/saved">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const saved = await loadSaved(actor.memberId);
  const basic = saved.flatMap((s) => {
    const r = s.startsWith("b:") ? data.results.find((x) => x.benefit.id === s.slice(2)) : undefined;
    return r ? [r] : [];
  });
  const extra = saved.flatMap((s) => {
    const e = s.startsWith("x:") ? extraById(s.slice(2)) : undefined;
    return e ? [e] : [];
  });
  const region = `${data.input.sido} ${data.input.sigungu}`.trim();

  return (
    <>
      <BackLink href={`${base}/benefits`}>지원 목록</BackLink>
      <h1 className="mt-2 text-title font-display">찜한 지원 <span className="text-accent tabular-nums">{basic.length + extra.length}</span></h1>
      <p className="mt-1 text-sm text-muted">하트를 누른 지원이 여기에 모여요. 찜 목록은 나만 볼 수 있어요.</p>

      {basic.length + extra.length === 0 && (
        <p className="mt-6 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
          <Mascot size={40} mood="rest" />아직 찜한 지원이 없어요. 지원 목록에서 하트를 눌러 보세요.
        </p>
      )}

      {basic.length > 0 && (
        <section className="mt-6" aria-labelledby="h-basic">
          <h2 id="h-basic" className="mb-2 text-sm font-semibold">지원 제도</h2>
          <ul className="space-y-3">
            {basic.map((r) => (
              <li key={r.benefit.id}>
                <BenefitCard r={r} href={`${base}/benefits/${r.benefit.id}`} status={data.status[r.benefit.id]} auth={auth} saved />
              </li>
            ))}
          </ul>
        </section>
      )}

      {extra.length > 0 && (
        <section className="mt-6" aria-labelledby="h-extra">
          <h2 id="h-extra" className="mb-2 text-sm font-semibold">더 알아볼 곳</h2>
          <ul className="space-y-3">
            {extra.map((e) => (
              <li key={e.id} className="relative rounded-xl bg-card p-4 shadow-card">
                <SaveButton auth={auth} item={`x:${e.id}`} saved className="absolute right-1 top-1" />
                <p className="pr-10 text-caption font-semibold text-muted">{e.category} · {e.organization}</p>
                <p className="mt-1 font-semibold">{e.title}</p>
                <p className="mt-1 text-sm text-muted">{e.summary}</p>
                <p className="mt-2 text-caption text-muted"><strong className="text-ink">확인처 ·</strong> {e.howToCheck}</p>
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(e.searchQuery || `${region} 퇴원 환자 지원`)}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent underline underline-offset-2"
                >
                  검색해서 확인하기 <Icon name="right" size={12} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
