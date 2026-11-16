import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { buildEvents, monthGrid, shiftMonth, weekday, WEEKDAY, EVENT_STYLE, type EventKind } from "@/lib/calendar";
import { krDate } from "@/lib/format";
import TaskList from "@/components/TaskList";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";
import AddTask from "../tasks/AddTask";

export const metadata = { title: "일정 · 씩씩케어" };

// 가족이 함께 보는 돌봄 달력. 날짜를 누르면 그날 할 일을 아래에서 바로 체크·분담한다.
export default async function Calendar(props: PageProps<"/c/[token]/calendar">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  const { actor, data, auth, base } = await adminPage(token);
  const { today } = data;
  const ym = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : (typeof sp.d === "string" ? sp.d : today).slice(0, 7);
  const sel = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : ym === today.slice(0, 7) ? today : `${ym}-01`;
  const events = buildEvents(data);
  const dayEvents = events.get(sel) ?? [];
  const dayTasks = data.tasks.filter((t) => t.due_date === sel);
  const others = dayEvents.filter((e) => !e.taskId);
  const [y, m] = ym.split("-").map(Number);
  const href = (q: string) => `${base}/calendar?${q}`;
  const list = { members: data.members, auth, meId: actor.memberId, today, detailBase: `${base}/tasks`, showDate: false };

  return (
    <>
      {!data.input.dischargeDate && (
        <Link href={`${base}/settings`} className="mb-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3 text-sm text-accent">
          <span>퇴원일을 정하면 지원 마감일과 일정이 달력에 자동으로 채워져요<span className="block font-semibold">퇴원일 확정하기</span></span>
          <Icon name="right" size={16} />
        </Link>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-title">일정</h1>
        <Link href={href(`d=${today}`)} className="flex min-h-0 items-center rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-card">오늘</Link>
      </div>

      {!data.input.dischargeDate && (
        <Link href={`${base}/settings`} className="mt-3 flex items-center gap-3 rounded-xl bg-accent-soft p-3 text-sm text-accent">
          <Mascot size={36} mood="rest" />퇴원일이 정해지면 할 일이 날짜에 맞춰 달력에 들어가요. 정해졌다면 눌러서 입력해 주세요.
        </Link>
      )}

      {/* 달 이동 + 달력 */}
      <section className="mt-4 rounded-3xl bg-card p-4 shadow-card" aria-label={`${y}년 ${m}월 달력`}>
        <div className="flex items-center justify-between">
          <Link href={href(`m=${shiftMonth(ym, -1)}`)} aria-label="이전 달" className="flex w-11 items-center justify-center text-muted"><Icon name="left" size={20} /></Link>
          <p className="font-display text-headline">{y}년 {m}월</p>
          <Link href={href(`m=${shiftMonth(ym, 1)}`)} aria-label="다음 달" className="flex w-11 items-center justify-center text-muted"><Icon name="right" size={20} /></Link>
        </div>
        <div className="mt-2 grid grid-cols-7 text-center text-xs text-muted">
          {WEEKDAY.map((w, i) => <span key={w} className={i === 0 ? "text-[#c2410c]" : ""}>{w}</span>)}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-y-1">
          {monthGrid(ym).flat().map((d, i) => {
            if (!d) return <span key={`e${i}`} />;
            const ev = events.get(d) ?? [];
            const kinds = [...new Set(ev.map((e) => e.kind))].slice(0, 3) as EventKind[];
            const isSel = d === sel, isToday = d === today, isDis = d === data.input.dischargeDate;
            return (
              <Link key={d} href={href(`m=${ym}&d=${d}`)} aria-current={isSel ? "date" : undefined}
                className="flex min-h-0 flex-col items-center gap-0.5 py-1">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${isSel ? "bg-ink font-semibold text-white" : isDis ? "bg-[#ffe9dc] font-semibold text-[#9a3f12]" : isToday ? "bg-accent-soft font-semibold text-accent" : i % 7 === 0 ? "text-[#c2410c]" : ""}`}>
                  {Number(d.slice(8))}<span className="sr-only">일 {weekday(d)}요일{ev.length ? `, 일정 ${ev.length}개` : ""}</span>
                </span>
                <span className="flex h-1.5 gap-0.5">
                  {kinds.map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_STYLE[k].dot }} />)}
                </span>
              </Link>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3 text-caption text-muted" aria-label="색 설명">
          {(Object.keys(EVENT_STYLE) as EventKind[]).map((k) => (
            <li key={k} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_STYLE[k].dot }} />{EVENT_STYLE[k].label}</li>
          ))}
        </ul>
      </section>

      {/* 고른 날의 일정 */}
      <section className="mt-6" aria-labelledby="h-day">
        <div className="flex items-baseline gap-2">
          <h2 id="h-day" className="font-display text-headline">{krDate(sel)} ({weekday(sel)})</h2>
          {sel === today && <span className="text-sm font-medium text-accent">오늘</span>}
        </div>
        {others.length > 0 && (
          <ul className="mt-2 space-y-2">
            {others.map((e) => (
              <li key={e.title}>
                {e.benefitId ? (
                  <Link href={`${base}/benefits/${e.benefitId}`} className={`flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium ${EVENT_STYLE[e.kind].chip}`}>
                    {e.title}<Icon name="right" size={16} />
                  </Link>
                ) : (
                  <p className={`rounded-xl px-4 py-3 text-sm font-semibold ${EVENT_STYLE[e.kind].chip}`}>{e.title}</p>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2">
          <TaskList tasks={dayTasks} {...list} emptyText={others.length ? "이 날 할 일은 없어요" : "이 날은 일정이 없어요. 쉬어가는 날이에요"} />
        </div>
        <details className="mt-3 rounded-xl bg-card shadow-card">
          <summary className="cursor-pointer px-4 text-sm font-semibold"><span className="flex items-center gap-1.5"><Icon name="plus" size={16} />이 날에 할 일 추가</span></summary>
          <div className="px-4 pb-4"><AddTask auth={auth} defaultDate={sel} plain /></div>
        </details>
      </section>

      {/* 스마트폰 캘린더 전체 일정 연동 (Webcal / iCalendar Feed) */}
      <section className="mt-8 rounded-2xl bg-card p-4 shadow-card" aria-labelledby="h-cal-sync">
        <h3 id="h-cal-sync" className="text-sm font-semibold text-ink">스마트폰 캘린더에 전체 일정 넣기</h3>
        <p className="mt-1 text-xs text-muted">
          애플, 구글, 삼성 캘린더에 우리 집 전체 일정을 한 번에 등록하고, 전날 저녁과 당일 아침 알람을 받을 수 있어요.
        </p>
        <a
          href={`/ics/${auth.k}/${auth.v}/feed`}
          download="bravecare-schedule.ics"
          className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-accent-soft px-4 py-2.5 text-xs font-semibold text-accent hover:opacity-90"
        >
          <Icon name="calendar" size={16} />
          <span>전체 일정 캘린더 파일 내려받기 (.ics)</span>
        </a>
      </section>
    </>
  );
}
