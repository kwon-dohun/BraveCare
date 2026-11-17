import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import AddBenefitTask from "@/components/AddBenefitTask";
import ApplyGuide from "@/components/ApplyGuide";
import { applyWays, benefitIdOfTask, callScript } from "@/lib/benefit-task";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadSaved } from "@/lib/load";
import SaveButton from "@/components/SaveButton";
import { Badge } from "@/components/BenefitCard";
import { StatusPicker, DocsChecklist } from "@/components/StatusPicker";
import { dday, krDate, krDateYear, dotDate } from "@/lib/format";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 first:pt-0 last:pb-0">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-0.5 text-callout leading-relaxed">{children}</dd>
    </div>
  );
}

export default async function BenefitDetail(props: PageProps<"/c/[token]/benefits/[id]">) {
  const { token, id } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const r = data.results.find((x) => x.benefit.id === id);
  if (!r) notFound();
  const b = r.benefit;
  const d = r.deadline;
  const active = r.verdict !== "no" && d.state !== "closed";
  const linked = data.tasks.find((t) => benefitIdOfTask(t) === b.id); // 이 지원과 이어진 할 일
  const period = b.deadline ? (b.deadline.toDaysAfter === 0 ? "퇴원 전까지" : `퇴원 후 ${b.deadline.toDaysAfter}일까지`) : "따로 정해진 기한이 없어요";
  const ways = applyWays(r.apply.place, r.apply.phone);
  const script = active
    ? callScript({ name: b.name, reason: data.input.reason, dischargeDate: data.input.dischargeDate ?? null, today: data.today, selfCare: data.isSelfCare, check: r.verdict === "check" })
    : null;

  return (
    <>
      <BackLink href={`${base}/benefits`}>지원 목록</BackLink>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge verdict={r.verdict} needsIncome={r.needsIncome} demoted={r.demoted} />
        {d.state === "open" && <span className="font-medium text-warn">{dday(d.daysLeft!)} ({krDateYear(d.endDate!)}까지)</span>}
        {d.state === "closed" && <span className="text-muted">신청 기간 종료 ({krDateYear(d.endDate!)})</span>}
        {d.state === "unknown" && b.deadline && <span className="text-muted">퇴원일 확정 시 마감 계산</span>}
      </div>
      <div className="mt-2 flex items-start justify-between gap-2">
        <h1 className="text-title font-display">{b.name}</h1>
        <SaveButton auth={auth} item={`b:${b.id}`} saved={(await loadSaved(actor.memberId)).includes(`b:${b.id}`)} className="-mr-2 shrink-0" />
      </div>
      <p className="text-muted">{b.operator}</p>
      <p className="mt-3">{b.summary}</p>

      {/* 한눈에: 해당 여부·혜택·기간·방식을 먼저, 바로 할 일로 넣는 버튼까지 첫 화면에 */}
      <section className="mt-5 rounded-xl bg-card p-4 shadow-card">
        <dl className="divide-y divide-line">
          <Row label="나는 해당될까요?">{r.reason}</Row>
          <Row label="혜택·비용">{b.cost}</Row>
          <Row label="신청 기간">{period}{d.state === "open" ? ` · ${krDateYear(d.endDate!)}까지` : ""}</Row>
          {ways.length > 0 && (
            <Row label="신청 방식">{ways.map((w) => (w === "전화" ? "전화 문의" : `${w} 신청`)).join(" · ")}</Row>
          )}
        </dl>
        {active && (
          <div className="mt-3 border-t border-line pt-3">
            {linked ? (
              <Link href={`${base}/tasks/${linked.id}`} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-muted">할 일에 있어요</p>
                  <p className="font-semibold">{linked.done ? "신청을 마쳤어요" : linked.due_date ? `${krDate(linked.due_date)}까지 신청하기` : "신청하기"}</p>
                </div>
                <Icon name="right" size={18} className="shrink-0 text-muted" />
              </Link>
            ) : (
              <>
                <AddBenefitTask auth={auth} benefitId={b.id} />
                <p className="mt-1.5 text-center text-xs text-muted">일정에 날짜가 생기고, 신청 방법과 서류를 할 일에서 챙겨요</p>
              </>
            )}
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">신청 방법</h2>
        <ApplyGuide place={r.apply.place} phone={active ? r.apply.phone : undefined} script={script} sourceUrl={b.source.url} sourceLabel={b.source.label} />
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">필요 서류</h2>
        {active ? (
          <DocsChecklist
            auth={auth}
            benefitId={b.id}
            docs={b.docs}
            checked={data.docsChecked[b.id] ?? []}
            packetChecked={data.packet}
            docsHref={`${base}/docs`}
          />
        ) : (
          <ul className="mt-1 list-disc pl-5">
            {b.docs.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        )}
      </section>

      {active && <div className="mt-6"><StatusPicker auth={auth} benefitId={b.id} current={data.status[b.id] ?? "none"} /></div>}

      <p className="mt-6 text-sm text-muted">
        정보 마지막 확인: {b.lastVerified ? dotDate(b.lastVerified) : "공식 확인 전 초안이에요"}
        <br />최종 대상 여부는 운영 기관에서 결정돼요. 신청 전에 위 문의처에서 꼭 확인하세요.
      </p>
    </>
  );
}
