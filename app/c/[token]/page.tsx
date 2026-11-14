import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { dischargeLabel, dateLabel } from "@/lib/format";
import BenefitCard from "@/components/BenefitCard";
import TaskList from "@/components/TaskList";

export default async function Home(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const { input, today, tasks, members, results, status, activity } = data;

  // 마감이 가장 임박한 미신청 지원 1개. 마감 있는 지원이 없으면 가능성 높은 미신청 지원 1개.
  const open = results.filter((r) => r.verdict !== "no" && (status[r.benefit.id] ?? "none") === "none");
  const urgent = open.filter((r) => r.deadline.state === "open").sort((a, b) => a.deadline.daysLeft! - b.deadline.daysLeft!)[0] ?? open.find((r) => r.verdict === "high");

  const todo = tasks.filter((t) => !t.done && (t.due_date ? t.due_date <= today : true));
  const todayTasks = todo.slice(0, 3);
  const next = tasks.find((t) => !t.done && t.due_date && t.due_date > today);
  const unassigned = tasks.filter((t) => !t.done && !t.assignee_id).length;

  return (
    <>
      <p className="text-sm text-muted">{actor.name}님 가족의 퇴원노트</p>
      <h1 className="mt-1 text-3xl font-bold">{dischargeLabel(input.dischargeDate, today)}</h1>

      <section className="mt-6" aria-labelledby="h-urgent">
        <h2 id="h-urgent" className="mb-2 font-bold">{urgent?.deadline.state === "open" ? "마감이 가장 가까운 지원" : "먼저 확인해볼 지원"}</h2>
        {urgent ? (
          <BenefitCard r={urgent} href={`${base}/benefits/${urgent.benefit.id}`} status={status[urgent.benefit.id]} />
        ) : (
          <p className="rounded-xl border border-line bg-card p-4 text-muted">신청하지 않은 지원이 없어요</p>
        )}
      </section>

      <section className="mt-6" aria-labelledby="h-today">
        <h2 id="h-today" className="mb-2 font-bold">오늘 할 일</h2>
        <TaskList
          tasks={todayTasks} members={members} auth={auth} meId={actor.memberId} canAssign today={today}
          emptyText={next ? `오늘은 할 일이 없어요. 다음 할 일은 ${dateLabel(next.due_date, next.rel_day, today)}이에요` : "오늘은 할 일이 없어요"}
        />
        {unassigned > 0 && (
          <Link href={`${base}/tasks`} className="mt-2 flex items-center text-warn underline">담당자 없는 할 일 {unassigned}개 나누기</Link>
        )}
      </section>

      <section className="mt-6" aria-labelledby="h-act">
        <h2 id="h-act" className="mb-2 font-bold">가족 최근 활동</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {activity.slice(0, 3).map((a) => <li key={a.id} className="px-4 py-3 text-sm">{a.text}</li>)}
        </ul>
        {members.length < 2 && (
          <Link href={`${base}/family`} className="mt-3 flex items-center justify-center rounded-xl bg-accent px-5 py-3 font-bold text-white">가족 초대하기</Link>
        )}
      </section>
    </>
  );
}
