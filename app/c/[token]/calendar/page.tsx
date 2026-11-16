import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { buildEvents, monthGrid, shiftMonth, weekday, WEEKDAY, EVENT_STYLE, type EventKind } from "@/lib/calendar";
import { krDate } from "@/lib/format";
import { dayDiff } from "@/lib/benefits";
import TaskList from "@/components/TaskList";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";
import CalSyncLink from "@/components/CalSyncLink";
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
      <div className="flex items-center justify-between">
        <h1 className="font-display text-title">일정</h1>
        <Link href={href(`d=${today}`)} className="flex min-h-0 items-center rounded-full bg-card px-3 py-1.5 text-sm font-medium shadow-card">오늘</Link>
      </div>

      {!data.input.dischargeDate ? (
        <Link href={`${base}/settings`} className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-3.5 text-sm text-accent hover:opacity-95 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <Mascot size={40} mood="rest" />
            <div className="min-w-0">
              <p className="font-semibold text-ink">퇴원일을 정하면 달력이 자동으로 채워져요</p>
              <p className="text-xs text-accent">날짜 입력하고 일정 확인하기</p>
            </div>
          </div>
          <Icon name="right" size={18} className="shrink-0 text-accent" />
        </Link>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link href={href(`d=${data.input.dischargeDate}`)} className="flex items-center justify-between rounded-2xl bg-[#ffe9dc] p-3 text-[#9a3f12] shadow-sm hover:opacity-90">
            <div>
              <p className="text-caption font-bold text-[#ef7a4a]">퇴원일</p>
              <p className="text-sm font-semibold tabular-nums">{krDate(data.input.dischargeDate)}</p>
            </div>
            <span className="rounded-full bg-[#ef7a4a] px-2 py-0.5 text-caption font-bold text-white">
              {data.input.dischargeDate === today ? "오늘" : data.input.dischargeDate > today ? `D-${dayDiff(data.input.dischargeDate, today)}` : "완료"}
            </span>
          </Link>

          {data.tasks.find((t) => t.kind === "schedule" && t.due_date && t.due_date >= today) ? (
            (() => {
              const nextV = data.tasks.filter((t) => t.kind === "schedule" && t.due_date && t.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
              return (
                <Link href={href(`d=${nextV.due_date}`)} className="flex items-center justify-between rounded-2xl bg-[#e3f0ff] p-3 text-[#1f5aa6] shadow-sm hover:opacity-90">
                  <div className="min-w-0">
                    <p className="text-caption font-bold text-[#3b82d6]">다음 외래</p>
                    <p className="text-sm font-semibold truncate">{krDate(nextV.due_date!)}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[#3b82d6] px-2 py-0.5 text-caption font-bold text-white">외래</span>
                </Link>
              );
            })()
          ) : (
            <Link href={`${base}/scan`} className="flex items-center justify-between rounded-2xl bg-card p-3 text-muted shadow-sm hover:opacity-90 border border-line">
              <div>
                <p className="text-caption font-semibold">다음 외래 일정</p>
                <p className="text-xs">예약증 찍어 등록</p>
              </div>
              <Icon name="camera" size={16} className="text-muted" />
            </Link>
          )}
        </div>
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
            const hasVisit = ev.some((e) => e.kind === "visit");

            return (
              <Link key={d} href={href(`m=${ym}&d=${d}`)} aria-current={isSel ? "date" : undefined}
                className="flex min-h-0 flex-col items-center gap-0.5 py-1">
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                  isSel
                    ? "bg-ink font-semibold text-white shadow-sm"
                    : isDis
                    ? "bg-[#ffe9dc] font-bold text-[#9a3f12] ring-2 ring-[#ef7a4a]"
                    : hasVisit
                    ? "bg-[#e3f0ff] font-semibold text-[#1f5aa6] ring-1.5 ring-[#3b82d6]"
                    : isToday
                    ? "bg-accent-soft font-semibold text-accent"
                    : i % 7 === 0
                    ? "text-[#c2410c]"
                    : ""
                }`}>
                  {Number(d.slice(8))}
                  <span className="sr-only">일 {weekday(d)}요일{ev.length ? `, 일정 ${ev.length}개` : ""}</span>
                </span>
                <span className="flex h-3 items-center">
                  {isDis ? (
                    <span className="rounded bg-[#ef7a4a] px-1 text-[9px] font-bold text-white leading-tight">퇴원</span>
                  ) : hasVisit ? (
                    <span className="rounded bg-[#3b82d6] px-1 text-[9px] font-bold text-white leading-tight">외래</span>
                  ) : (
                    <span className="flex h-1.5 gap-0.5">
                      {kinds.map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_STYLE[k].dot }} />)}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-line pt-3 text-caption text-muted" aria-label="색 설명">
          <li className="flex items-center gap-1"><span className="rounded bg-[#ef7a4a] px-1 text-[9px] font-bold text-white">퇴원</span> 퇴원일</li>
          <li className="flex items-center gap-1"><span className="rounded bg-[#3b82d6] px-1 text-[9px] font-bold text-white">외래</span> 병원 방문</li>
          {(Object.keys(EVENT_STYLE) as EventKind[]).filter((k) => k !== "discharge" && k !== "visit").map((k) => (
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

        {/* 퇴원 당일 또는 외래 진료일 시각적 하이라이트 배너 */}
        {sel === data.input.dischargeDate && (
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#ffe9dc] p-3.5 text-[#9a3f12] border border-[#ef7a4a]/40 shadow-sm">
            <div>
              <p className="font-bold text-sm">퇴원 당일 · 집으로 복귀하는 날</p>
              <p className="text-xs opacity-90 mt-0.5">원무과 보험 서류 4종 수령 및 약국 복약 지도를 꼭 챙기세요</p>
            </div>
            <span className="rounded-full bg-[#ef7a4a] px-2.5 py-1 text-xs font-bold text-white shrink-0">퇴원 D-Day</span>
          </div>
        )}

        {dayEvents.some((e) => e.kind === "visit") && (
          <div className="mt-2 flex items-center justify-between rounded-2xl bg-[#e3f0ff] p-3.5 text-[#1f5aa6] border border-[#3b82d6]/40 shadow-sm">
            <div>
              <p className="font-bold text-sm">외래 진료 당일</p>
              <p className="text-xs opacity-90 mt-0.5">신분증을 지참하시고 진료실에서 외래 리포트를 가로로 돌려 보여주세요</p>
            </div>
            <Link href={`${base}/report`} className="rounded-full bg-[#3b82d6] px-2.5 py-1 text-xs font-bold text-white shrink-0">외래 리포트</Link>
          </div>
        )}
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
        <CalSyncLink
          href={`/ics/${auth.k}/${auth.v}/feed`}
          downloadName="bravecare-schedule.ics"
        />
      </section>
    </>
  );
}
