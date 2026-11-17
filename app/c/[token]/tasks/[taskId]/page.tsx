import BackLink from "@/components/BackLink";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/page-auth";
import { KIND_LABEL } from "@/lib/timeline";
import { taskHelp } from "@/lib/task-help";
import CalSyncLink from "@/components/CalSyncLink";
import TaskForm from "./TaskForm";

export const metadata = { title: "할 일 수정 · 씩씩케어" };

export default async function TaskDetail(props: PageProps<"/c/[token]/tasks/[taskId]">) {
  const { token, taskId } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const t = data.tasks.find((x) => x.id === taskId);
  if (!t) notFound();
  const SOURCE: Record<string, string> = { template: "기본 템플릿", benefit: "지원 제도", doc: "퇴원 안내문", manual: "직접 입력" };

  return (
    <>
      <BackLink href={`${base}/tasks`}>할 일</BackLink>
      <h1 className="mt-2 text-title font-display">할 일 수정</h1>
      <p className="mt-1 text-sm text-muted">
        {KIND_LABEL[t.kind]} · 출처: {SOURCE[t.source] ?? t.source}
        {t.done && t.done_by ? ` · ${t.done_by} 완료` : ""}
      </p>
      {taskHelp(t.title, data.isSelfCare) && (
        <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm leading-relaxed text-accent"><span className="font-semibold">왜 해요? </span>{taskHelp(t.title, data.isSelfCare)}</p>
      )}
      {(data.isSelfCare || t.assignee_id === actor.memberId) && !t.done && t.due_date && (
        <CalSyncLink
          href={`/ics/${auth.k}/${auth.v}/${t.id}`}
          label="내 캘린더에 넣기 (알림 포함)"
          className="mt-3 flex items-center justify-center rounded-full bg-card px-5 py-3 text-sm font-semibold text-accent shadow-card"
        />
      )}
      {t.source_quote && <p className="mt-2 rounded-xl bg-background p-3 text-sm">안내문 원문: “{t.source_quote}”</p>}
      <TaskForm auth={auth} back={`${base}/tasks`} members={data.members} solo={data.isSelfCare} task={{ id: t.id, title: t.title, due_date: t.due_date, rel_day: t.rel_day, assignee_id: t.assignee_id, memo: t.memo, due_time: t.due_time, repeat: t.repeat }} />
    </>
  );
}
