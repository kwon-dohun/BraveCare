import { memberPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import { dischargeLabel } from "@/lib/format";

export const metadata = { title: "내 할 일 · 퇴원노트" };

export default async function MemberHome(props: PageProps<"/m/[id]">) {
  const { id } = await props.params;
  const { actor, data, auth } = await memberPage(id);
  const mine = data.tasks.filter((t) => t.assignee_id === actor.memberId);
  const open = mine.filter((t) => !t.done);
  const done = mine.filter((t) => t.done);
  const others = data.tasks.filter((t) => t.assignee_id !== actor.memberId && !t.done);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-16 pt-6">
      <p className="text-sm text-muted">{actor.name}님, 안녕하세요</p>
      <h1 className="mt-1 text-3xl font-bold">{dischargeLabel(data.input.dischargeDate, data.today)}</h1>

      <section className="mt-6">
        <h2 className="mb-2 font-bold">내가 맡은 일 ({open.length})</h2>
        <TaskList tasks={open} members={data.members} auth={auth} meId={actor.memberId} canAssign={false} today={data.today} emptyText="아직 맡은 일이 없어요. 가족이 나눠주면 여기에 나와요" />
      </section>

      {done.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-bold">완료한 일 ({done.length})</h2>
          <TaskList tasks={done} members={data.members} auth={auth} meId={actor.memberId} canAssign={false} today={data.today} />
        </section>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer font-bold">다른 가족이 맡은 일 보기 ({others.length})</summary>
        <div className="mt-3"><TaskList tasks={others} members={data.members} auth={auth} meId={actor.memberId} canAssign={false} today={data.today} /></div>
      </details>
      <p className="mt-8 text-sm text-muted">이 페이지 링크를 저장해두면 언제든 다시 열 수 있어요. 케이스 정보는 관리자만 바꿀 수 있어요.</p>
    </main>
  );
}
