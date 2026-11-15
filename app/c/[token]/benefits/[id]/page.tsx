import { notFound } from "next/navigation";
import { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";
import { Badge } from "@/components/BenefitCard";
import { StatusPicker, DocsChecklist } from "@/components/StatusPicker";
import { dday } from "@/lib/format";
import { dayDiff } from "@/lib/benefits";

const STALE_DAYS = 90; // 마지막 확인일이 이보다 오래되면 "정보 확인 필요"

export default async function BenefitDetail(props: PageProps<"/c/[token]/benefits/[id]">) {
  const { token, id } = await props.params;
  const { data, auth, base } = await adminPage(token);
  const r = data.results.find((x) => x.benefit.id === id);
  if (!r) notFound();
  const b = r.benefit;
  const d = r.deadline;
  const stale = !b.lastVerified || dayDiff(data.today, b.lastVerified) > STALE_DAYS;
  const active = r.verdict !== "no" && d.state !== "closed";

  return (
    <>
      <BackLink href={`${base}/benefits`}>지원 목록</BackLink>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge verdict={r.verdict} needsIncome={r.needsIncome} />
        {d.state === "open" && <span className="font-medium text-warn">{dday(d.daysLeft!)} ({d.endDate}까지)</span>}
        {d.state === "closed" && <span className="text-muted">신청 기간 종료 ({d.endDate})</span>}
        {d.state === "unknown" && b.deadline && <span className="text-muted">퇴원일 확정 시 마감 계산</span>}
        {stale && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-sm text-warn">정보 확인 필요</span>}
      </div>
      <h1 className="mt-2 text-2xl font-semibold">{b.name}</h1>
      <p className="text-muted">{b.operator}</p>
      <p className="mt-3">{b.summary}</p>

      <section className="mt-5 rounded-xl bg-card shadow-card p-4">
        <h2 className="font-semibold">왜 이렇게 나왔나요?</h2>
        <p className="mt-1">{r.reason}</p>
      </section>

      {active && <div className="mt-5"><StatusPicker auth={auth} benefitId={b.id} current={data.status[b.id] ?? "none"} /></div>}

      <section className="mt-6">
        <h2 className="font-semibold">신청 방법</h2>
        <p className="mt-1">{r.apply.place}</p>
        {b.deadline && <p className="mt-1 text-sm text-muted">신청 기간: {b.deadline.toDaysAfter === 0 ? "퇴원 전까지" : `퇴원 후 ${b.deadline.toDaysAfter}일까지`}</p>}
        {r.apply.phone && active && (
          <a href={`tel:${r.apply.phone.replaceAll("-", "")}`} className="mt-3 flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink">
            {r.apply.phone} 전화 걸기
          </a>
        )}
        <a href={b.source.url} target="_blank" rel="noreferrer" className="mt-2 flex items-center justify-center rounded-xl bg-card shadow-card px-5 py-3">
          공식 안내 보기 ({b.source.label})
        </a>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">비용</h2>
        <p className="mt-1">{b.cost}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">필요 서류</h2>
        {active ? <DocsChecklist auth={auth} benefitId={b.id} docs={b.docs} checked={data.docsChecked[b.id] ?? []} /> : <ul className="mt-1 list-disc pl-5">{b.docs.map((x) => <li key={x}>{x}</li>)}</ul>}
      </section>

      <p className="mt-6 text-sm text-muted">
        정보 마지막 확인: {b.lastVerified ?? "공식 확인 전 초안이에요"}
        <br />최종 대상 여부는 운영 기관에서 결정돼요. 신청 전에 위 문의처에서 꼭 확인하세요.
      </p>
    </>
  );
}
