import Link from "next/link";
import { memberPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import Remember from "@/components/Remember";
import MyTask from "./MyTask";
import { dischargeLabel, dateLabel, heroLabel } from "@/lib/format";
import Icon from "@/components/Icon";
import Mascot, { Logo } from "@/components/Mascot";
import Avatar from "@/components/Avatar";

export const metadata = { title: "내 할 일 · 씩씩케어", robots: { index: false } }; // 주소가 곧 열쇠라 검색에 남기지 않는다

export default async function MemberHome(props: PageProps<"/m/[id]">) {
  const { id } = await props.params;
  const tab = (await props.searchParams).tab === "all" ? "all" : "mine";
  const { actor, data, auth } = await memberPage(id);
  const { today } = data;
  const hero = heroLabel(data.input.dischargeDate, today);
  const mine = data.tasks.filter((t) => t.assignee_id === actor.memberId);
  const open = mine.filter((t) => !t.done);
  const now = open.filter((t) => !t.due_date || t.due_date <= today);
  const later = open.filter((t) => t.due_date && t.due_date > today);
  const done = mine.filter((t) => t.done);
  const tabCls = (on: boolean) => `flex flex-1 items-center justify-center rounded-full text-sm transition-colors ${on ? "bg-accent-soft font-semibold text-accent" : "text-muted"}`;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-16 pt-6">
      <Remember path={`/m/${id}`} label={`${actor.name}님의 할 일`} />
      <header className="flex items-center justify-between">
        <Logo />
        <span className="flex items-center gap-1.5 rounded-full bg-card py-1 pl-1 pr-3 text-xs font-medium text-muted shadow-card"><Avatar name={actor.name} size={24} />{actor.name}님</span>
      </header>
      <section className="mt-4 flex items-start justify-between gap-3 overflow-hidden rounded-[1.75rem] bg-accent-soft p-5" aria-label="퇴원 일정">
        <div className="min-w-0">
          <h1 aria-label={dischargeLabel(data.input.dischargeDate, today)} className="text-[3.25rem] leading-none tracking-tight text-ink tabular-nums">{hero.big}</h1>
          <p className="mt-2.5 text-sm font-medium text-accent">{hero.sub}</p>
          <p className="mt-3 text-sm text-ink">{actor.name}님, 맡은 일을 여기서 챙겨요.</p>
        </div>
        <Mascot size={72} className="mascot-bob -mb-6 mt-2" />
      </section>

      {data.input.dischargeDate && today > data.input.dischargeDate && (
        <Link href={`/m/${id}/daily`} className="mt-4 flex items-center justify-between rounded-xl bg-card shadow-card px-4 py-3"><span>저녁 안부 체크 남기기</span><Icon name="right" size={18} className="text-muted" /></Link>
      )}

      <nav aria-label="보기" className="mt-4 flex rounded-full bg-card p-1 shadow-card">
        <Link href={`/m/${id}`} aria-current={tab === "mine" ? "page" : undefined} className={tabCls(tab === "mine")}>내 할 일 ({open.length})</Link>
        <Link href={`/m/${id}?tab=all`} aria-current={tab === "all" ? "page" : undefined} className={tabCls(tab === "all")}>가족 전체</Link>
      </nav>

      {tab === "mine" ? (
        <>
          <section className="mt-5" aria-labelledby="mh1">
            <h2 id="mh1" className="mb-2 font-semibold">지금 할 일</h2>
            {now.length ? (
              <ul className="space-y-3">{now.map((t) => <MyTask key={t.id} auth={auth} task={t} when={dateLabel(t.due_date, t.rel_day, today)} overdue={!!t.due_date && t.due_date < today} />)}</ul>
            ) : (
              <p className="rounded-xl bg-card shadow-card p-4 text-muted">
                {open.length ? "오늘은 할 일이 없어요" : mine.length ? "맡은 일을 모두 끝냈어요. 고마워요" : "아직 맡은 일이 없어요. '가족 전체'에서 할 수 있는 일을 골라 맡아보세요"}
              </p>
            )}
          </section>
          {later.length > 0 && (
            <section className="mt-6" aria-labelledby="mh2">
              <h2 id="mh2" className="mb-2 font-semibold">다가오는 일 ({later.length})</h2>
              <ul className="space-y-3">{later.map((t) => <MyTask key={t.id} auth={auth} task={t} when={dateLabel(t.due_date, t.rel_day, today)} overdue={false} />)}</ul>
            </section>
          )}
          {done.length > 0 && (
            <details className="mt-6">
              <summary className="flex cursor-pointer items-center font-semibold">완료한 일 ({done.length})</summary>
              <ul className="mt-3 space-y-3">{done.map((t) => <MyTask key={t.id} auth={auth} task={t} when={dateLabel(t.due_date, t.rel_day, today)} overdue={false} />)}</ul>
            </details>
          )}
        </>
      ) : (
        <section className="mt-5">
          <p className="mb-2 text-sm text-muted">가족 모두의 남은 할 일이에요. 담당자가 없는 일은 &lsquo;내가 할게&rsquo;로 맡을 수 있고, 내 담당만 체크할 수 있어요.</p>
          <TaskList tasks={data.tasks.filter((t) => !t.done)} members={data.members} auth={auth} meId={actor.memberId} canAssign={false} today={today} emptyText="남은 할 일이 없어요" />
        </section>
      )}
      <p className="mt-8 text-sm text-muted">이 화면 주소를 저장해두면 언제든 다시 열 수 있어요. 퇴원 정보는 초대한 가족(관리자)만 바꿀 수 있어요.</p>
    </main>
  );
}
