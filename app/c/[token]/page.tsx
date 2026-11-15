import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { dischargeLabel, dateLabel } from "@/lib/format";
import BenefitCard from "@/components/BenefitCard";
import TaskList from "@/components/TaskList";
import Remember from "@/components/Remember";

export default async function Home(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const isNew = (await props.searchParams).new === "1";
  const { actor, data, auth, base } = await adminPage(token);
  const { input, today, tasks, members, results, status, activity } = data;

  // 마감이 가장 임박한 미신청 지원 1개. 마감 있는 지원이 없으면 가능성 높은 미신청 지원 1개.
  const open = results.filter((r) => r.verdict !== "no" && r.deadline.state !== "closed" && (status[r.benefit.id] ?? "none") === "none");
  const urgent = open.filter((r) => r.deadline.state === "open").sort((a, b) => a.deadline.daysLeft! - b.deadline.daysLeft!)[0] ?? open.find((r) => r.verdict === "high");

  // 오늘 할 일: 오늘까지인 미완료(밀린 일 포함). 퇴원일 미정이면 가장 앞선 일부터.
  const todo = tasks.filter((t) => !t.done && (t.due_date ? t.due_date <= today : !input.dischargeDate));
  const next = tasks.find((t) => !t.done && t.due_date && t.due_date > today);
  const unassigned = tasks.filter((t) => !t.done && !t.assignee_id).length;
  const doneCount = tasks.filter((t) => t.done).length;

  return (
    <>
      <Remember path={base} label={`${actor.name}님의 퇴원노트`} />
      <header className="flex items-start justify-between">
        <p className="text-sm text-muted">{actor.name}님 가족의 퇴원노트</p>
        <Link href={`${base}/settings`} className="-mr-2 -mt-2 flex items-center px-2 text-sm text-muted underline">설정</Link>
      </header>

      <section className="mt-2 rounded-2xl bg-foreground p-5 text-white" aria-label="퇴원 일정">
        <h1 className="text-3xl font-bold">{dischargeLabel(input.dischargeDate, today)}</h1>
        <p className="mt-1 text-sm opacity-80">
          {input.dischargeDate ? `퇴원 예정일 ${input.dischargeDate}` : "퇴원일이 정해지면 설정에서 입력해주세요. 날짜와 마감을 계산해드려요."}
          {" · "}할 일 {doneCount}/{tasks.length} 완료
        </p>
      </section>

      {isNew && (
        <section className="mt-4 rounded-xl border border-accent bg-accent-soft p-4">
          <p className="font-bold">퇴원노트가 만들어졌어요</p>
          <p className="mt-1 text-sm">로그인이 없어서 <b>이 주소가 곧 열쇠</b>예요. 이 기기에서는 첫 화면에서 다시 열 수 있고, 다른 기기에서 쓰려면 설정에서 주소를 복사해두세요.</p>
          <Link href={`${base}/scan`} className="mt-3 flex items-center justify-center rounded-xl bg-accent px-4 py-3 font-bold text-white">병원에서 받은 퇴원 안내문 촬영하기</Link>
        </section>
      )}

      <section className="mt-6" aria-labelledby="h-urgent">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="h-urgent" className="font-bold">{urgent?.deadline.state === "open" ? "마감이 가장 가까운 지원" : "먼저 확인해볼 지원"}</h2>
          <Link href={`${base}/benefits`} className="flex items-center text-sm text-muted underline">전체 보기</Link>
        </div>
        {urgent ? (
          <BenefitCard r={urgent} href={`${base}/benefits/${urgent.benefit.id}`} status={status[urgent.benefit.id]} />
        ) : (
          <p className="rounded-xl border border-line bg-card p-4 text-muted">확인이 필요한 지원을 모두 살펴봤어요</p>
        )}
      </section>

      <section className="mt-6" aria-labelledby="h-today">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="h-today" className="font-bold">오늘 할 일{todo.length > 3 ? ` (${todo.length}개 중 3개)` : ""}</h2>
          <Link href={`${base}/tasks`} className="flex items-center text-sm text-muted underline">전체 보기</Link>
        </div>
        <TaskList
          tasks={todo.slice(0, 3)} members={members} auth={auth} meId={actor.memberId} canAssign today={today} detailBase={`${base}/tasks`}
          emptyText={next ? `오늘은 할 일이 없어요. 다음 할 일은 ${dateLabel(next.due_date, next.rel_day, today)}이에요` : "오늘은 할 일이 없어요"}
        />
        {unassigned > 0 && (
          <Link href={`${base}/tasks?f=none`} className="mt-2 flex items-center rounded-xl bg-warn-soft px-4 text-warn">담당자 없는 할 일 {unassigned}개 · 가족과 나누기 ›</Link>
        )}
      </section>

      <section className="mt-6" aria-labelledby="h-act">
        <h2 id="h-act" className="mb-2 font-bold">가족 최근 활동</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {activity.slice(0, 3).map((a) => <li key={a.id} className="px-4 py-3 text-sm">{a.text}</li>)}
        </ul>
        {members.length < 2 && (
          <Link href={`${base}/family`} className="mt-3 flex items-center justify-center rounded-xl border border-accent px-5 py-3 font-bold text-accent">가족 초대해서 나누기</Link>
        )}
      </section>
    </>
  );
}
