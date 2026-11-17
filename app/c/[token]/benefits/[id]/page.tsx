import Link from "next/link";
import { notFound } from "next/navigation";
import Icon from "@/components/Icon";
import AddBenefitTask from "@/components/AddBenefitTask";
import { benefitIdOfTask } from "@/lib/benefit-task";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadSaved } from "@/lib/load";
import SaveButton from "@/components/SaveButton";
import { Badge } from "@/components/BenefitCard";
import { StatusPicker, DocsChecklist } from "@/components/StatusPicker";
import { dday, krDate, krDateYear, dotDate } from "@/lib/format";

export default async function BenefitDetail(props: PageProps<"/c/[token]/benefits/[id]">) {
  const { token, id } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const r = data.results.find((x) => x.benefit.id === id);
  if (!r) notFound();
  const b = r.benefit;
  const d = r.deadline;
  const active = r.verdict !== "no" && d.state !== "closed";
  const linked = data.tasks.find((t) => benefitIdOfTask(t) === b.id); // 이 지원과 이어진 할 일

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

      <section className="mt-5 rounded-xl bg-card shadow-card p-4">
        <h2 className="font-semibold">왜 이렇게 나왔나요?</h2>
        <p className="mt-1">{r.reason}</p>
      </section>

      <section className="mt-6">
        <h2 className="font-semibold">비용</h2>
        <p className="mt-1">{b.cost}</p>
      </section>

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

      {active && (
        <section className="mt-6 rounded-xl bg-card shadow-card p-4">
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
              <p className="font-semibold">신청할 계획이세요?</p>
              <p className="mt-0.5 text-sm text-muted">할 일에 넣으면 날짜가 일정에 생기고, 신청 방법과 필요 서류를 할 일에서 바로 챙길 수 있어요.</p>
              <div className="mt-3"><AddBenefitTask auth={auth} benefitId={b.id} /></div>
            </>
          )}
        </section>
      )}

      {active && <div className="mt-6"><StatusPicker auth={auth} benefitId={b.id} current={data.status[b.id] ?? "none"} /></div>}

      <p className="mt-6 text-sm text-muted">
        정보 마지막 확인: {b.lastVerified ? dotDate(b.lastVerified) : "공식 확인 전 초안이에요"}
        <br />최종 대상 여부는 운영 기관에서 결정돼요. 신청 전에 위 문의처에서 꼭 확인하세요.
      </p>
    </>
  );
}
