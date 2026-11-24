import BackLink from "@/components/BackLink";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";
import TaskList from "@/components/TaskList";
import QuestionAnswer from "@/components/QuestionAnswer";
import { krDate } from "@/lib/format";
import { adminPage } from "@/lib/page-auth";
import AddQuestion from "../report/AddQuestion";
import AddHeardNote from "@/components/AddHeardNote";
import { HEARD_NOTE } from "@/lib/brief";

export const metadata = { title: "물어볼 것 · 씩씩케어" };

// 의료진에게 물어볼 것. 회진·외래 때 보여주는 화면이라 담당 개념 없이 체크와 답 메모만 둔다.
// 데일리 체크와 외래 리포트가 같은 질문을 쓴다(리포트에는 이 중 일부가 큰 글씨로 나온다).
export default async function Questions(props: PageProps<"/c/[token]/questions">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const pool = data.tasks.filter((t) => t.kind === "question" && t.title !== HEARD_NOTE); // 질문 없이 적은 들은 말은 질문 수에 세지 않는다
  const heardNotes = data.tasks.filter((t) => t.kind === "question" && t.title === HEARD_NOTE && t.done);
  const open = pool.filter((t) => !t.done);
  const done = [...pool.filter((t) => t.done), ...heardNotes];

  const common = { members: data.members, auth, meId: actor.memberId, today: data.today, detailBase: `${base}/tasks`, showOwner: false };

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 font-display text-title">의료진에게 물어볼 것</h1>
      <p className="mt-1 flex gap-2 rounded-xl bg-accent-soft p-3 text-sm text-accent">
        <Icon name="help" size={18} className="mt-0.5 shrink-0" />
        <span>외래 때 이 화면을 보며 물어보고, 들은 답은 아래 &lsquo;들은 답&rsquo;에 모여요.</span>
      </p>

      <p className="mt-4 text-sm text-muted tabular-nums">{open.length ? `남은 질문 ${open.length}개` : "질문을 모두 확인했어요"} · 전체 {pool.length}개</p>
      <AddQuestion auth={auth} />
      <AddHeardNote auth={auth} />

      {open.length === 0 && <p className="mt-4 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card"><Mascot size={40} mood="cheer" />질문을 모두 확인했어요. 수고했어요!</p>}
      {open.length > 0 && <div className="mt-4"><TaskList tasks={open} {...common} /></div>}

      {done.length > 0 && (
        <section className="mt-8" aria-labelledby="q-heard">
          <h2 id="q-heard" className="font-semibold">들은 답 <span className="tabular-nums text-muted">{done.length}</span></h2>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-card shadow-card">
            {[...done].sort((x, y) => (y.done_at ?? "").localeCompare(x.done_at ?? "")).map((t) => (
              <li key={t.id} className="p-4">
                <p className="font-medium">{t.title}</p>
                {t.done_at && <p className="mt-0.5 text-xs text-muted">{krDate(new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(t.done_at)))}</p>}
                <QuestionAnswer auth={auth} task={t} full />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
