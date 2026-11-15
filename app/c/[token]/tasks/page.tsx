import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import AddTask from "./AddTask";
import { PHASES, phaseOf } from "@/lib/timeline";

export const metadata = { title: "할 일 · 씩씩케어" };

const FILTERS = [["", "전체"], ["mine", "내 담당"], ["none", "담당자 없음"]] as const;

export default async function Tasks(props: PageProps<"/c/[token]/tasks">) {
  const { token } = await props.params;
  const f = (await props.searchParams).f;
  const { actor, data, auth, base } = await adminPage(token);
  const match = (t: (typeof data.tasks)[number]) => (f === "mine" ? t.assignee_id === actor.memberId : f === "none" ? !t.assignee_id : true);
  const open = data.tasks.filter((t) => !t.done && match(t));
  const done = data.tasks.filter((t) => t.done && match(t));

  // 지난 일은 맨 위에 한 묶음, 나머지는 타임라인 4단계로 묶는다.
  const LATE = "지금이라도 챙길 일";
  const groups = new Map<string, typeof open>([[LATE, []], ...PHASES.map((p) => [p, []] as [string, typeof open]), ["날짜 미정", []]]);
  for (const t of open) {
    const ph = phaseOf(t.rel_day, t.due_date, data.input.dischargeDate);
    groups.get(t.due_date && t.due_date < data.today ? LATE : ph === null ? "날짜 미정" : PHASES[ph])!.push(t);
  }
  const common = { members: data.members, auth, meId: actor.memberId, canAssign: true, today: data.today, detailBase: `${base}/tasks` };

  return (
    <>
      <h1 className="text-2xl font-bold">퇴원 타임라인</h1>
      <p className="mt-1 text-sm text-muted">퇴원 준비부터 정기 외래까지 챙길 일이에요. 의료 판단은 담당 의료진에게 확인하세요.</p>

      <Link href={`${base}/scan`} className="mt-4 flex items-center justify-center rounded-xl border border-accent px-5 py-3 font-bold text-accent">안내문·약봉투 촬영해서 할 일 추가</Link>

      <nav aria-label="할 일 필터" className="mt-4 flex gap-2">
        {FILTERS.map(([v, label]) => {
          const active = (f ?? "") === v;
          return (
            <Link key={label} href={v ? `${base}/tasks?f=${v}` : `${base}/tasks`} aria-current={active ? "true" : undefined}
              className={`flex items-center rounded-full border px-4 text-sm ${active ? "border-foreground bg-foreground font-medium text-white" : "border-line bg-card text-muted"}`}>
              {label}
            </Link>
          );
        })}
      </nav>

      {open.length === 0 && (
        <p className="mt-4 rounded-xl border border-line bg-card p-4 text-muted">
          {f === "none" ? "담당자 없는 할 일이 없어요. 잘 나눠졌어요" : f === "mine" ? "내가 맡은 남은 일이 없어요" : "남은 할 일이 없어요"}
        </p>
      )}
      {[...groups].filter(([, list]) => list.length).map(([label, list]) => (
        <section key={label} className="mt-5" aria-label={label}>
          <h2 className={`mb-2 text-sm font-bold ${label === LATE ? "text-warn" : "text-muted"}`}>{label} ({list.length})</h2>
          <TaskList tasks={list} {...common} />
        </section>
      ))}

      <AddTask auth={auth} />

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="flex cursor-pointer items-center font-bold">완료한 일 ({done.length})</summary>
          <div className="mt-3"><TaskList tasks={done} {...common} /></div>
        </details>
      )}
    </>
  );
}
