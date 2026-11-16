import { BackLink } from "@/components/Icon";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";
import TaskList from "@/components/TaskList";
import { adminPage } from "@/lib/page-auth";
import { PHASES, phaseOf } from "@/lib/timeline";
import AddQuestion from "../report/AddQuestion";

export const metadata = { title: "물어볼 것 · 씩씩케어" };

// 단계 이름만으로는 감이 안 와서, 언제 하는 일인지 한 줄을 붙인다
const PHASE_HINT = ["입원 중에 끝내 두면 퇴원 날이 편해요", "계산·서류·약을 한 번에 챙기는 날", "집에 와서 2주, 첫 외래까지", "정기 외래와 남은 지원 정리"];

// 의료진에게 물어볼 것. 회진·외래 때 보여주는 화면이라 담당 개념 없이 체크와 답 메모만 둔다.
// 데일리 체크와 외래 리포트가 같은 질문을 쓴다(리포트에는 이 중 일부가 큰 글씨로 나온다).
export default async function Questions(props: PageProps<"/c/[token]/questions">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const pool = data.tasks.filter((t) => t.kind === "question");
  const open = pool.filter((t) => !t.done);
  const done = pool.filter((t) => t.done);

  const LATE = "지난 질문";
  const groups = new Map<string, typeof open>([[LATE, []], ...PHASES.map((p) => [p, []] as [string, typeof open]), ["날짜 미정", []]]);
  for (const t of open) {
    const ph = phaseOf(t.rel_day, t.due_date, data.input.dischargeDate);
    groups.get(t.due_date && t.due_date < data.today ? LATE : ph === null ? "날짜 미정" : PHASES[ph])!.push(t);
  }
  const common = { members: data.members, auth, meId: actor.memberId, today: data.today, detailBase: `${base}/tasks`, showOwner: false };

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 font-display text-title">의료진에게 물어볼 것</h1>
      <p className="mt-1 flex gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
        <Icon name="help" size={18} className="mt-0.5 shrink-0" />
        <span>회진이나 외래 때 이 화면을 보여주며 하나씩 물어보세요. 답을 들으면 체크하고, 눌러서 답을 메모해 두면 가족도 볼 수 있어요. 데일리 체크를 하다 떠오른 것도 여기에 적어 두세요.</span>
      </p>

      <p className="mt-4 text-sm text-muted tabular-nums">{open.length ? `남은 질문 ${open.length}개` : "질문을 모두 확인했어요"} · 전체 {pool.length}개</p>
      <AddQuestion auth={auth} />

      {open.length === 0 && <p className="mt-4 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card"><Mascot size={40} mood="cheer" />질문을 모두 확인했어요. 수고했어요!</p>}
      {[...groups].filter(([, list]) => list.length).map(([label, list]) => {
        const pi = PHASES.indexOf(label as (typeof PHASES)[number]);
        return (
          <section key={label} className="mt-6" aria-label={label}>
            <div className="mb-2">
              <h2 className={`font-semibold ${label === LATE ? "text-warn" : ""}`}>{label}</h2>
              <p className="text-xs text-muted">{label === LATE ? "날짜는 지났지만 지금 물어봐도 괜찮아요" : pi >= 0 ? PHASE_HINT[pi] : "날짜를 정하면 일정에 들어가요"}</p>
            </div>
            <TaskList tasks={list} {...common} />
          </section>
        );
      })}

      {done.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer font-semibold">확인한 질문 ({done.length})</summary>
          <div className="mt-2"><TaskList tasks={done} {...common} /></div>
        </details>
      )}
    </>
  );
}
