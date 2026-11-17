import BackLink from "@/components/BackLink";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/page-auth";
import { KIND_LABEL, REPEAT_LABEL } from "@/lib/timeline";
import { EVENT_STYLE, KIND, weekday } from "@/lib/calendar";
import { dateLabel, krDate, krTime } from "@/lib/format";
import TaskActions from "./TaskActions";
import { taskHelp } from "@/lib/task-help";
import CalSyncLink from "@/components/CalSyncLink";
import TaskForm from "./TaskForm";

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
  const help = taskHelp(t.title, data.isSelfCare);
  const rows: [string, string][] = [
    ["날짜", when || "정하지 않음"],
    ...(data.alone ? [] : [["담당", t.assignee_id === actor.memberId ? "나" : owner ?? "아직 없어요"] as [string, string]]),
    ...(t.memo ? [["메모", t.memo] as [string, string]] : []),
    ["상태", t.done ? `끝냈어요${t.done_by ? ` (${t.done_by})` : ""}` : late ? "날짜가 지났어요" : "할 일"],
  ];

  // 먼저 무엇을 언제 누가 하는지 보여주고, 고치기는 접어 둔다
  return (
    <>
      <BackLink href={`${base}/tasks`}>할 일</BackLink>
      <div className="mt-3"><span className={`inline-block rounded-full px-2.5 py-0.5 text-caption font-semibold ${EVENT_STYLE[KIND[t.kind]].chip}`}>{KIND_LABEL[t.kind]}</span></div>
      <h1 className={`mt-2 text-title font-display ${t.done ? "text-muted line-through" : ""}`}>{t.title}</h1>
      <dl className="mt-4 divide-y divide-line rounded-xl bg-card px-4 shadow-card">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-3">
            <dt className="w-12 shrink-0 text-sm text-muted">{k}</dt>
            <dd className={`min-w-0 flex-1 text-callout ${k === "상태" && late ? "font-semibold text-warn" : ""}`}>{v}</dd>
          </div>
        ))}
      </dl>
      {help && <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm leading-relaxed text-accent"><span className="font-semibold">왜 해요? </span>{help}</p>}
      {t.source_quote && <p className="mt-3 rounded-xl bg-background p-3 text-sm">안내문 원문: “{t.source_quote}”</p>}
      <TaskActions auth={auth} id={t.id} done={t.done} canClaim={!data.alone && !t.assignee_id} />
      {(data.alone || t.assignee_id === actor.memberId) && !t.done && t.due_date && (
        <CalSyncLink
          href={`/ics/${auth.k}/${auth.v}/${t.id}`}
          label="내 캘린더에 넣기 (알림 포함)"
          className="mt-2 flex items-center justify-center rounded-full bg-card px-5 py-3 text-sm font-semibold text-accent shadow-card"
        />
      )}
      <details className="mt-6 rounded-xl bg-card shadow-card">
        <summary className="cursor-pointer px-4 py-3 font-semibold">내용 고치기</summary>
        <div className="px-4 pb-4">
          <p className="text-xs text-muted">출처: {SOURCE[t.source] ?? t.source}</p>
          <TaskForm auth={auth} back={`${base}/tasks`} members={data.members} solo={data.alone} task={{ id: t.id, title: t.title, due_date: t.due_date, rel_day: t.rel_day, assignee_id: t.assignee_id, memo: t.memo, due_time: t.due_time, repeat: t.repeat }} />
        </div>
      </details>
    </>
  );
}
