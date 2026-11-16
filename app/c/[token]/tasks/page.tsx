import Link from "next/link";
import { redirect } from "next/navigation";
import { adminPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import AddTask from "./AddTask";
import { openDeadlines, sortTasks, badgeFor } from "@/lib/priority";

export const metadata = { title: "할 일 · 씩씩케어" };

const SHOW_FIRST = 5; // 맡을 사람이 필요한 일은 처음 5개만 펼쳐 둔다(선택지를 줄인다)

// 할 일은 '누가 맡았나'로 세 구역: 내가 맡은 일 · 맡을 사람이 필요한 일 · 다른 가족이 맡은 일.
// 의료진에게 물어볼 것은 담당이 필요 없어서 따로 화면(/questions)에 있다.
export default async function Tasks(props: PageProps<"/c/[token]/tasks">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  if (sp.v === "q") redirect(`/c/${token}/questions`); // 예전 '물어볼 것' 탭 주소
  const f = sp.f === "none" || sp.f === "mine" ? sp.f : "";
  const { actor, data, auth, base } = await adminPage(token);
  const me = actor.memberId;
  const pool = data.tasks.filter((t) => t.kind !== "question");
  const open = pool.filter((t) => !t.done);
  const done = pool.filter((t) => t.done);
  const total = pool.length, finished = done.length;
  const qLeft = data.tasks.filter((t) => t.kind === "question" && !t.done).length;

  const deadlines = openDeadlines(data.results);
  const badges: Record<string, string> = {};
  for (const t of open) { const b = badgeFor(t, deadlines, data.today); if (b) badges[t.id] = b; }
  const sort = (l: typeof open) => sortTasks(l, deadlines, data.today);
  const common = { members: data.members, auth, meId: me, today: data.today, detailBase: `${base}/tasks`, badges };

  const mine = sort(open.filter((t) => t.assignee_id === me));
  const needOwner = sort(open.filter((t) => !t.assignee_id));
  const others = sort(open.filter((t) => t.assignee_id && t.assignee_id !== me));

  const head = (title: string, n: number, hint?: string, tone = "") => (
    <div className="mb-2 flex items-end justify-between gap-2">
      <div><h2 className={`font-semibold ${tone}`}>{title} <span className="tabular-nums">{n}</span></h2>{hint && <p className="text-xs text-muted">{hint}</p>}</div>
    </div>
  );

  return (
    <>
      <h1 className="font-display text-title">할 일</h1>

      {/* 진행 요약 */}
      <section className="mt-4 flex items-center gap-4 rounded-xl bg-card p-4 shadow-card" aria-label="진행 상황">
        <Mascot size={52} mood={total && finished === total ? "cheer" : "idle"} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{open.length ? `할 일 ${open.length}개가 남았어요` : "할 일을 모두 끝냈어요!"}</p>
          <div className="mt-2 h-2 rounded-full bg-line" role="progressbar" aria-label="완료 비율" aria-valuemin={0} aria-valuenow={finished} aria-valuemax={total}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${total ? Math.max(4, (finished / total) * 100) : 0}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted tabular-nums">{total}개 중 {finished}개 완료{needOwner.length > 0 ? ` · 맡을 사람이 필요한 일 ${needOwner.length}개` : ""}</p>
        </div>
      </section>

      {f && (
        <Link href={`${base}/tasks`} className="mt-3 flex items-center justify-between rounded-xl bg-card px-4 py-2 text-sm text-accent shadow-card">
          {f === "none" ? "맡을 사람이 필요한 일만 보는 중" : "내가 맡은 일만 보는 중"}<span className="font-semibold">전체 보기</span>
        </Link>
      )}
      {open.length === 0 && <p className="mt-4 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card"><Mascot size={40} mood="cheer" />남은 일이 없어요. 수고했어요!</p>}

      {f !== "none" && open.length > 0 && (
        <section className="mt-6" aria-label="내가 맡은 일">
          {head("내가 맡은 일", mine.length, mine.length ? "밀린 일과 급한 일이 위에 있어요" : undefined)}
          {mine.length ? <TaskList tasks={mine} {...common} /> : (
            <p className="rounded-xl bg-card p-4 text-sm text-muted shadow-card">{needOwner.length ? "아직 맡은 일이 없어요. 아래에서 ‘내가 할게’를 눌러 보세요." : "맡은 일이 없어요."}</p>
          )}
        </section>
      )}

      {f !== "mine" && needOwner.length > 0 && (
        <section className="mt-6" aria-label="맡을 사람이 필요한 일">
          {head("맡을 사람이 필요해요", needOwner.length, "‘내가 할게’를 누르면 바로 내 일이 돼요", "text-warn")}
          <TaskList tasks={needOwner.slice(0, SHOW_FIRST)} {...common} />
          {needOwner.length > SHOW_FIRST && (
            <details className="mt-2">
              <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {needOwner.length - SHOW_FIRST}개 보기</summary>
              <div className="mt-2"><TaskList tasks={needOwner.slice(SHOW_FIRST)} {...common} /></div>
            </details>
          )}
        </section>
      )}

      {f === "" && others.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold">다른 가족이 맡은 일 <span className="tabular-nums">{others.length}</span></summary>
          <p className="mt-1 text-xs text-muted">담당을 바꾸려면 항목을 눌러 들어가세요. 바꾸면 가족에게 알려줘요.</p>
          <div className="mt-2"><TaskList tasks={others} {...common} /></div>
        </details>
      )}

      <AddTask auth={auth} />

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold">완료한 일 ({done.length})</summary>
          <div className="mt-2"><TaskList tasks={done} {...common} showOwner={false} /></div>
        </details>
      )}
      <Link href={`${base}/questions`} className="mt-4 flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-card">
        <span>회진·외래 때 의료진에게 물어볼 것{qLeft ? ` ${qLeft}개` : ""}</span><Icon name="right" size={18} className="text-muted" />
      </Link>
      <Link href={`${base}/scan`} className="mt-2 flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-card">
        <span>안내문·약봉투를 찍으면 할 일을 자동으로 만들어요</span><Icon name="camera" size={18} className="text-muted" />
      </Link>
    </>
  );
}
