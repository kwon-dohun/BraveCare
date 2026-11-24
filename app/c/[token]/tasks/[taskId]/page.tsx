import BackLink from "@/components/BackLink";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/page-auth";
import { REPEAT_LABEL } from "@/lib/timeline";
import { weekday } from "@/lib/calendar";
import { dateLabel, krDate, krTime } from "@/lib/format";
import TaskActions from "./TaskActions";
import CalSyncLink from "@/components/CalSyncLink";
import EditTask from "./EditTask";
import Link from "next/link";
import { DocsChecklist } from "@/components/StatusPicker";
import { benefitIdOfTask, callScript } from "@/lib/benefit-task";
import { taskLink } from "@/lib/task-link";
import ApplyGuide from "@/components/ApplyGuide";
import Icon from "@/components/Icon";

export const metadata = { title: "할 일 · 씩씩케어" };

export default async function TaskDetail(props: PageProps<"/c/[token]/tasks/[taskId]">) {
  const { token, taskId } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const t = data.tasks.find((x) => x.id === taskId);
  if (!t) notFound();
  const SOURCE: Record<string, string> = { template: "기본 템플릿", benefit: "지원 제도", doc: "퇴원 안내문", manual: "직접 입력" };

  const owner = data.members.find((m) => m.id === t.assignee_id)?.name;
  const day = t.due_date ? `${t.due_date === data.today ? "오늘 · " : ""}${krDate(t.due_date)} (${weekday(t.due_date)})` : dateLabel(null, t.rel_day, data.today);
  const when = [day, t.due_time ? krTime(t.due_time) : "", t.repeat ? `${REPEAT_LABEL[t.repeat]} 반복` : ""].filter(Boolean).join(" · ");
  const late = !t.done && !!t.due_date && t.due_date < data.today;
  const bid = benefitIdOfTask(t);
  const br = bid ? data.results.find((r) => r.benefit.id === bid) : undefined; // 이 할 일이 신청하려는 지원
  const script = br ? callScript({ name: br.benefit.name, reason: data.input.reason, dischargeDate: data.input.dischargeDate ?? null, today: data.today, selfCare: data.isSelfCare, check: br.verdict === "check" }) : null;
  const rows: [string, string][] = [
    ["날짜", when || "정하지 않음"],
    ...(data.alone ? [] : [["담당", t.assignee_id === actor.memberId ? "나" : owner ?? "아직 없어요"] as [string, string]]),
    ...(t.memo ? [[t.kind === "question" ? "들은 답" : "메모", t.memo] as [string, string]] : []),
    ...(t.done || late ? [["상태", t.done ? `끝냈어요${t.done_by ? ` (${t.done_by})` : ""}` : br ? "정한 날이 지났어요" : "날짜가 지났어요"] as [string, string]] : []), // 평소의 "할 일"은 말해 주는 게 없어서 뺀다
  ];

  // 먼저 무엇을 언제 누가 하는지 보여주고, 고치기는 제목 옆 수정 버튼(아래에서 올라오는 창)으로 둔다
  return (
    <>
      <BackLink href={`${base}/tasks`}>할 일</BackLink>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h1 className={`text-title font-display ${t.done ? "text-muted line-through" : ""}`}>{t.title}</h1>
        <EditTask maxDate={br && br.deadline.state === "open" ? br.deadline.endDate : undefined} auth={auth} back={`${base}/tasks`} members={data.members} solo={data.alone} task={{ id: t.id, title: t.title, due_date: t.due_date, rel_day: t.rel_day, assignee_id: t.assignee_id, memo: t.memo, due_time: t.due_time, repeat: t.repeat }} sourceLabel={SOURCE[t.source] ?? t.source} />
      </div>
      <dl className="mt-4 divide-y divide-line rounded-xl bg-card px-4 shadow-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-3">
            <dt className="w-12 shrink-0 text-sm text-muted">{k}</dt>
            <dd className={`min-w-0 flex-1 text-callout ${k === "상태" && late ? "font-semibold text-warn" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {!br && !t.done && taskLink(t.title) && (
        <Link href={`${base}${taskLink(t.title)!.path}`} className="mt-3 flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-card">
          <span className="text-sm font-semibold">{taskLink(t.title)!.label}</span>
          <Icon name="right" size={18} className="text-muted" />
        </Link>
      )}
      {t.source_quote && <p className="mt-3 rounded-xl bg-background p-3 text-sm">안내문 원문: “{t.source_quote}”</p>}
      {br && (
        <>
          <section className="mt-6">
            <h2 className="font-semibold">챙길 서류</h2>
            <DocsChecklist auth={auth} benefitId={br.benefit.id} docs={br.benefit.docs} checked={data.docsChecked[br.benefit.id] ?? []} packetChecked={data.packet} docsHref={`${base}/docs`} />
          </section>
          <section className="mt-6">
            <h2 className="font-semibold">신청 방법</h2>
            <ApplyGuide soft place={br.apply.place} phone={t.done ? undefined : br.apply.phone} script={t.done ? null : script} sourceUrl={br.benefit.source.url} sourceLabel={br.benefit.source.label} />
          </section>
        </>
      )}
      <TaskActions auth={auth} id={t.id} done={t.done} note={br ? "끝내면 지원 상태가 ‘신청함’으로 바뀌어요" : undefined} canClaim={!data.alone && !t.assignee_id} help={{ title: t.title, when: when || "날짜 미정", memo: t.memo }} mine={!data.alone && t.assignee_id === actor.memberId} />
      {(data.alone || t.assignee_id === actor.memberId) && !t.done && t.due_date && (
        <CalSyncLink
          href={`/ics/${auth.k}/${auth.v}/${t.id}`}
          label="내 캘린더에 넣기 (알림 포함)"
          className="mt-2 flex items-center justify-center rounded-full bg-card px-5 py-3 text-sm font-semibold text-accent shadow-card"
        />
      )}
      {br && (
        <Link href={`${base}/benefits/${br.benefit.id}`} className="mt-4 flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-card">
          <span className="text-sm font-semibold">지원 상세 보기</span>
          <Icon name="right" size={18} className="text-muted" />
        </Link>
      )}
    </>
  );
}
