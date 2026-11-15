import Link from "next/link";
import { notFound } from "next/navigation";
import { adminPage } from "@/lib/page-auth";
import { KIND_LABEL } from "@/lib/timeline";
import TaskForm from "./TaskForm";

export const metadata = { title: "할 일 수정 · 씩씩케어" };

export default async function TaskDetail(props: PageProps<"/c/[token]/tasks/[taskId]">) {
  const { token, taskId } = await props.params;
  const { data, auth, base } = await adminPage(token);
  const t = data.tasks.find((x) => x.id === taskId);
  if (!t) notFound();
  const SOURCE: Record<string, string> = { template: "기본 템플릿", benefit: "지원 제도", doc: "퇴원 안내문", manual: "직접 입력" };

  return (
    <>
      <Link href={`${base}/tasks`} className="flex items-center text-muted">‹ 타임라인</Link>
      <h1 className="mt-2 text-2xl font-bold">할 일 수정</h1>
      <p className="mt-1 text-sm text-muted">
        {KIND_LABEL[t.kind]} · 출처: {SOURCE[t.source] ?? t.source}
        {t.done && t.done_by ? ` · ${t.done_by} 완료` : ""}
      </p>
      {t.source_quote && <p className="mt-2 rounded-xl bg-background p-3 text-sm">안내문 원문: “{t.source_quote}”</p>}
      <TaskForm auth={auth} back={`${base}/tasks`} members={data.members} task={{ id: t.id, title: t.title, due_date: t.due_date, rel_day: t.rel_day, assignee_id: t.assignee_id, memo: t.memo }} />
    </>
  );
}
