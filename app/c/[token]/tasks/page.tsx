import { adminPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import AddTask from "./AddTask";
import Link from "next/link";

export const metadata = { title: "할 일 · 퇴원노트" };

export default async function Tasks(props: PageProps<"/c/[token]/tasks">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const open = data.tasks.filter((t) => !t.done);
  const done = data.tasks.filter((t) => t.done);

  return (
    <>
      <h1 className="text-2xl font-bold">퇴원 타임라인</h1>
      <p className="mt-1 text-sm text-muted">병원에 확인할 질문은 ‘병원에 확인’ 표시가 붙어요. 의료 판단은 담당 의료진에게 확인하세요.</p>
      <Link href={`${base}/scan`} className="mt-4 flex items-center justify-center rounded-xl border border-accent px-5 py-3 font-bold text-accent">퇴원 안내문 촬영해서 할 일 추가</Link>
      <div className="mt-4"><TaskList tasks={open} members={data.members} auth={auth} meId={actor.memberId} canAssign today={data.today} /></div>
      <AddTask auth={auth} />
      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-bold">완료한 일 ({done.length})</summary>
          <div className="mt-3"><TaskList tasks={done} members={data.members} auth={auth} meId={actor.memberId} canAssign today={data.today} /></div>
        </details>
      )}
    </>
  );
}
