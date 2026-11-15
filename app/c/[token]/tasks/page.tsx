import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import AddTask from "./AddTask";
import { PHASES, phaseOf } from "@/lib/timeline";

export const metadata = { title: "할 일 · 씩씩케어" };

const FILTERS = [["", "모두"], ["mine", "내 담당"], ["none", "담당자 없음"]] as const;
// 단계 이름만으로는 감이 안 와서, 언제 하는 일인지 한 줄을 붙인다
const PHASE_HINT = ["입원 중에 끝내 두면 퇴원 날이 편해요", "계산·서류·약을 한 번에 챙기는 날", "집에 와서 2주, 첫 외래까지", "정기 외래와 남은 지원 정리"];

export default async function Tasks(props: PageProps<"/c/[token]/tasks">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const f = sp.f;
  const view = sp.v === "q" ? "q" : "todo";
  const { actor, data, auth, base } = await adminPage(token);
  const match = (t: (typeof data.tasks)[number]) => (f === "mine" ? t.assignee_id === actor.memberId : f === "none" ? !t.assignee_id : true);
  const isQ = (t: (typeof data.tasks)[number]) => t.kind === "question";
  const pool = data.tasks.filter((t) => (view === "q" ? isQ(t) : !isQ(t)));
  const open = pool.filter((t) => !t.done && match(t));
  const done = pool.filter((t) => t.done && match(t));
  const total = pool.length, finished = pool.filter((t) => t.done).length;
  const qCount = data.tasks.filter((t) => isQ(t) && !t.done).length;
  const todoCount = data.tasks.filter((t) => !isQ(t) && !t.done).length;

  // 지난 일은 맨 위에 한 묶음, 나머지는 타임라인 4단계로 묶는다.
  const LATE = "놓친 일";
  const groups = new Map<string, typeof open>([[LATE, []], ...PHASES.map((p) => [p, []] as [string, typeof open]), ["날짜 미정", []]]);
  for (const t of open) {
    const ph = phaseOf(t.rel_day, t.due_date, data.input.dischargeDate);
    groups.get(t.due_date && t.due_date < data.today ? LATE : ph === null ? "날짜 미정" : PHASES[ph])!.push(t);
  }
  const phaseTotal = (label: string) => pool.filter((t) => { const ph = phaseOf(t.rel_day, t.due_date, data.input.dischargeDate); return ph !== null && PHASES[ph] === label; });
  const common = { members: data.members, auth, meId: actor.memberId, canAssign: true, today: data.today, detailBase: `${base}/tasks` };
  const seg = (on: boolean) => `flex flex-1 items-center justify-center gap-1.5 rounded-full text-sm transition-colors ${on ? "bg-accent-soft font-semibold text-accent" : "text-muted"}`;
  const q = (v: string, ff = f) => `${base}/tasks?${new URLSearchParams({ ...(v === "q" ? { v } : {}), ...(typeof ff === "string" && ff ? { f: ff } : {}) })}`;

  return (
    <>
      <h1 className="font-display text-title">할 일</h1>

      <nav aria-label="보기" className="mt-4 flex rounded-full bg-card p-1 shadow-card">
        <Link href={q("todo")} aria-current={view === "todo" ? "page" : undefined} className={seg(view === "todo")}>할 일 <span className="tabular-nums">{todoCount}</span></Link>
        <Link href={q("q")} aria-current={view === "q" ? "page" : undefined} className={seg(view === "q")}>의료진에게 물어볼 것 <span className="tabular-nums">{qCount}</span></Link>
      </nav>

      {/* 진행 요약 */}
      <section className="mt-3 flex items-center gap-4 rounded-xl bg-card p-4 shadow-card" aria-label="진행 상황">
        <Mascot size={52} mood={total && finished === total ? "cheer" : "idle"} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {view === "q" ? (qCount ? `물어볼 질문 ${qCount}개가 남았어요` : "질문을 모두 확인했어요") : todoCount ? `할 일 ${todoCount}개가 남았어요` : "할 일을 모두 끝냈어요!"}
          </p>
          <div className="mt-2 h-2 rounded-full bg-line" role="progressbar" aria-label="완료 비율" aria-valuemin={0} aria-valuenow={finished} aria-valuemax={total}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${total ? Math.max(4, (finished / total) * 100) : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted tabular-nums">{total}개 중 {finished}개 완료</p>
        </div>
      </section>

      {view === "q" && (
        <p className="mt-3 flex gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
          <Icon name="help" size={18} className="mt-0.5" />
          <span>회진이나 외래 때 이 화면을 보여주며 하나씩 물어보세요. 답을 들으면 체크하고, 눌러서 답을 메모해 두면 가족도 볼 수 있어요.</span>
        </p>
      )}

      <nav aria-label="담당 필터" className="mt-4 flex gap-1.5">
        {FILTERS.map(([v, label]) => {
          const active = (f ?? "") === v;
          return (
            <Link key={label} href={q(view, v)} aria-current={active ? "true" : undefined}
              className={`flex h-8 min-h-0 items-center rounded-full px-3 text-xs ${active ? "bg-foreground font-semibold text-white" : "bg-card text-muted shadow-card"}`}>
              {label}
            </Link>
          );
        })}
      </nav>

      {open.length === 0 && (
        <p className="mt-4 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
          <Mascot size={40} mood="cheer" />
          {f === "none" ? "담당자 없는 일이 없어요. 잘 나눠졌어요" : f === "mine" ? "내가 맡은 남은 일이 없어요" : "남은 일이 없어요. 수고했어요!"}
        </p>
      )}
      {[...groups].filter(([, list]) => list.length).map(([label, list]) => {
        const pt = phaseTotal(label);
        const pi = PHASES.indexOf(label as (typeof PHASES)[number]);
        return (
          <section key={label} className="mt-6" aria-label={label}>
            <div className="mb-2 flex items-end justify-between gap-2">
              <div>
                <h2 className={`font-semibold ${label === LATE ? "text-warn" : ""}`}>{label}</h2>
                <p className="text-xs text-muted">{label === LATE ? "날짜는 지났지만 지금 해도 괜찮아요" : pi >= 0 ? PHASE_HINT[pi] : "날짜를 정하면 일정에 들어가요"}</p>
              </div>
              {pi >= 0 && <span className="shrink-0 text-xs text-muted tabular-nums">{pt.filter((t) => t.done).length}/{pt.length} 완료</span>}
            </div>
            <TaskList tasks={list} {...common} />
          </section>
        );
      })}

      {view === "todo" && <AddTask auth={auth} />}

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold">완료한 일 ({done.length})</summary>
          <div className="mt-2"><TaskList tasks={done} {...common} /></div>
        </details>
      )}
      <Link href={`${base}/scan`} className="mt-4 flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-card">
        <span>안내문·약봉투를 찍으면 할 일을 자동으로 만들어요</span><Icon name="camera" size={18} className="text-muted" />
      </Link>
    </>
  );
}
