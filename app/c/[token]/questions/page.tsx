import BackLink from "@/components/BackLink";
import Mascot from "@/components/Mascot";
import Segmented from "@/components/Segmented";
import TaskList from "@/components/TaskList";
import QuestionAnswer from "@/components/QuestionAnswer";
import { krDate } from "@/lib/format";
import { weekday } from "@/lib/calendar";
import { adminPage } from "@/lib/page-auth";
import AddQuestion from "../report/AddQuestion";
import AddHeardNote from "@/components/AddHeardNote";
import { HEARD_NOTE } from "@/lib/brief";

export const metadata = { title: "물어볼 것 · 씩씩케어" };

// 의료진에게 물어볼 것. 회진·외래 때 보여주는 화면이라 담당 개념 없이 체크와 답 메모만 둔다.
// 데일리 체크와 외래 리포트가 같은 질문을 쓴다(리포트에는 이 중 일부가 큰 글씨로 나온다).
// '물어볼 것'과 '들은 답'은 같은 화면의 두 보기다: 진료 중에는 물어볼 것, 끝나고는 들은 답을 날짜별로 한 화면에 모아 본다.
export default async function Questions(props: PageProps<"/c/[token]/questions">) {
  const { token } = await props.params;
  const heardView = (await props.searchParams).v === "heard";
  const { actor, data, auth, base } = await adminPage(token);
  const pool = data.tasks.filter((t) => t.kind === "question" && t.title !== HEARD_NOTE); // 질문 없이 적은 들은 말은 질문 수에 세지 않는다
  const heardNotes = data.tasks.filter((t) => t.kind === "question" && t.title === HEARD_NOTE && t.done);
  const open = pool.filter((t) => !t.done);
  const done = [...pool.filter((t) => t.done), ...heardNotes].sort((x, y) => (y.done_at ?? "").localeCompare(x.done_at ?? ""));
  // 날짜(한국 시간)별로 묶는다. 최신 날짜가 위, 같은 날은 늦게 적은 것이 위
  const dayOf = (iso: string | null) => (iso ? new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(new Date(iso)) : "");
  const days = new Map<string, typeof done>();
  for (const t of done) days.set(dayOf(t.done_at), [...(days.get(dayOf(t.done_at)) ?? []), t]);

  const common = { members: data.members, auth, meId: actor.memberId, today: data.today, detailBase: `${base}/tasks`, showOwner: false };

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 font-display text-title">의료진에게 물어볼 것</h1>
      <div className="mt-3">
        <Segmented label="보기" active={heardView ? 1 : 0} items={[
          { label: `물어볼 것 ${open.length}`, href: `${base}/questions` },
          { label: `들은 답 ${done.length}`, href: `${base}/questions?v=heard` },
        ]} />
      </div>

      {heardView ? (
        <>
          <AddHeardNote auth={auth} />
          {done.length === 0 && <p className="mt-4 rounded-xl bg-card p-4 text-sm text-muted shadow-card">아직 들은 답이 없어요</p>}
          {[...days].map(([day, list]) => (
            <section key={day} className="mt-6" aria-label={day || "날짜 없음"}>
              <h2 className="font-semibold">{day ? `${krDate(day)} (${weekday(day)})${day === data.today ? " · 오늘" : ""}` : "날짜 없음"}</h2>
              <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl bg-card shadow-card">
                {list.map((t) => (
                  <li key={t.id} className="p-4">
                    <p className="font-medium">{t.title}</p>
                    <QuestionAnswer auth={auth} task={t} full />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      ) : (
        <>
          <AddQuestion auth={auth} />
          <AddHeardNote auth={auth} />
          {open.length === 0 && <p className="mt-4 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card"><Mascot size={40} mood="cheer" />질문을 모두 확인했어요. 수고했어요!</p>}
          {open.length > 0 && <div className="mt-4"><TaskList tasks={open} {...common} /></div>}
        </>
      )}
    </>
  );
}
