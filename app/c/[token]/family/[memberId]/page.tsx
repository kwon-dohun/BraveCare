import { notFound } from "next/navigation";
import BackLink from "@/components/BackLink";
import Avatar from "@/components/Avatar";
import TaskList from "@/components/TaskList";
import { adminPage } from "@/lib/page-auth";
import { openDeadlines, sortTasks, badgeFor } from "@/lib/priority";

export const metadata = { title: "맡은 일 · 씩씩케어" };

const SHOW_FIRST = 3;

// 가족 화면에서 구성원을 눌러 들어오는 화면. 일정 탭으로 넘어가지 않고 "< 가족"으로 바로 돌아간다.
export default async function MemberTasks(props: PageProps<"/c/[token]/family/[memberId]">) {
  const { token, memberId } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const m = data.members.find((x) => x.id === memberId);
  if (!m) notFound();
  const mine = m.id === actor.memberId;

  const pool = data.tasks.filter((t) => t.assignee_id === m.id && t.kind !== "question");
  const deadlines = openDeadlines(data.results);
  const open = pool.filter((t) => !t.done);
  const badges: Record<string, string> = {};
  for (const t of open) { const b = badgeFor(t, deadlines, data.today); if (b) badges[t.id] = b; }
  const sort = (l: typeof open) => sortTasks(l, deadlines, data.today);
  const upcoming = sort(open.filter((t) => !t.due_date || t.due_date >= data.today));
  const past = sort(open.filter((t) => t.due_date && t.due_date < data.today));
  const done = pool.filter((t) => t.done);
  const common = { members: data.members, auth, meId: actor.memberId, today: data.today, detailBase: `${base}/tasks`, badges, showOwner: false };

  const list = (tasks: typeof open) => (
    <>
      <TaskList tasks={tasks.slice(0, SHOW_FIRST)} {...common} />
      {tasks.length > SHOW_FIRST && (
        <details className="mt-2">
          <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {tasks.length - SHOW_FIRST}개 보기</summary>
          <div className="mt-2"><TaskList tasks={tasks.slice(SHOW_FIRST)} {...common} /></div>
        </details>
      )}
    </>
  );

  return (
    <>
      <BackLink href={`${base}/family`}>가족</BackLink>
      <div className="mt-3 flex items-center gap-3">
        <Avatar name={m.name} />
        <div className="min-w-0">
          <h1 className="text-title font-display">{mine ? "내가 맡은 일" : `${m.name}님이 맡은 일`}</h1>
          <p className="text-sm text-muted tabular-nums">남은 일 {open.length}개 · 완료 {done.length}개</p>
        </div>
      </div>

      {pool.length === 0 && (
        <p className="mt-5 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
          아직 맡은 일이 없어요. 일정 탭의 할 일에서 ‘내가 할게’를 누르거나 담당을 정하면 여기에 모여요.
        </p>
      )}

      {upcoming.length > 0 && (
        <section className="mt-6" aria-label="앞으로 할 일">
          <h2 className="mb-2 font-semibold">앞으로 할 일 <span className="tabular-nums">{upcoming.length}</span></h2>
          {list(upcoming)}
        </section>
      )}

      {past.length > 0 && (
        <section className="mt-6" aria-label="기한이 지난 일">
          <h2 className="mb-2 text-sm font-semibold text-warn">기한이 지난 일 <span className="tabular-nums">{past.length}</span></h2>
          {list(past)}
        </section>
      )}

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold">끝낸 일 <span className="tabular-nums">{done.length}</span></summary>
          <div className="mt-2"><TaskList tasks={done} {...common} /></div>
        </details>
      )}
    </>
  );
}
