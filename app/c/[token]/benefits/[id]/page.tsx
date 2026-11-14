import { notFound } from "next/navigation";
import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { Badge } from "@/components/BenefitCard";
import StatusPicker from "@/components/StatusPicker";
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
  const stale = dayDiff(data.today, b.lastVerified) > STALE_DAYS;

  return (
    <>
      <Link href={`${base}/benefits`} className="flex items-center text-muted">‹ 지원 목록</Link>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge verdict={r.verdict} />
        {d.state === "open" && <span className="font-medium text-warn">{dday(d.daysLeft!)} ({d.endDate}까지)</span>}
        {d.state === "closed" && <span className="text-muted">신청 기간 종료</span>}
        {d.state === "unknown" && b.deadline && <span className="text-muted">퇴원일 확정 시 마감 계산</span>}
        {stale && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-sm text-warn">정보 확인 필요</span>}
      </div>
      <h1 className="mt-2 text-2xl font-bold">{b.name}</h1>
      <p className="text-muted">{b.operator}</p>
      <p className="mt-3">{b.summary}</p>

      <section className="mt-5 rounded-xl border border-line bg-card p-4">
        <h2 className="font-bold">왜 이렇게 나왔나요?</h2>
        <p className="mt-1">{r.reason}</p>
      </section>

      <section className="mt-5">
        <h2 className="font-bold">비용</h2>
        <p>{b.cost}</p>
      </section>

      <section className="mt-5">
        <h2 className="font-bold">신청 방법</h2>
        <p>{r.apply.place}</p>
        {r.apply.phone && (
          <a href={`tel:${r.apply.phone.replaceAll("-", "")}`} className="mt-2 flex items-center justify-center rounded-xl bg-accent px-5 py-3 text-lg font-bold text-white">
            {r.apply.phone} 전화 걸기
          </a>
        )}
      </section>

      <section className="mt-5">
        <h2 className="font-bold">필요 서류</h2>
        <ul className="mt-1 list-disc pl-5">{b.docs.map((x) => <li key={x}>{x}</li>)}</ul>
      </section>

      {r.verdict !== "no" && (
        <section className="mt-6">
          <StatusPicker auth={auth} benefitId={b.id} current={data.status[b.id] ?? "none"} />
          <p className="mt-1 text-sm text-muted">‘신청함’으로 바꾸면 가족 활동에 공유돼요.</p>
        </section>
      )}

      <p className="mt-6 text-sm text-muted">
        출처: <a className="underline" href={b.source.url} target="_blank" rel="noreferrer">{b.source.label}</a> · 마지막 확인 {b.lastVerified}
        <br />최종 대상 여부는 운영 기관에서 결정돼요.
      </p>
    </>
  );
}
