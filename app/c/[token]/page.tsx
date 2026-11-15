import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { PACKET } from "@/lib/packet";
import { dischargeLabel, dateLabel, dday, heroLabel, krDate } from "@/lib/format";
import { buildEvents, weekday, EVENT_STYLE } from "@/lib/calendar";
import { addDays } from "@/lib/timeline";
import TaskList from "@/components/TaskList";
import Remember from "@/components/Remember";
import Icon from "@/components/Icon";
import Mascot, { Logo } from "@/components/Mascot";

export default async function Home(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const isNew = (await props.searchParams).new === "1";
  const { actor, data, auth, base } = await adminPage(token);
  const { input, today, tasks, members, results, status, activity } = data;
  const checkedToday = (await loadDaily(actor.caseId)).some((c) => c.check_date === today);

  // 시점에 따라 맨 위에 올 것이 달라진다: 병원 가는 날 → 퇴원 전 → 집에서 회복
  const visit = tasks.find((t) => t.kind === "schedule" && t.due_date === today);
  const stage = visit ? "visit" : !input.dischargeDate || today <= input.dischargeDate ? "pre" : "recovery";

  // 아직 신청하지 않은 지원. 신청함으로 바꾸면 홈에서 빠진다.
  const open = results.filter((r) => r.verdict !== "no" && r.deadline.state !== "closed" && (status[r.benefit.id] ?? "none") === "none");

  // 늦게 시작했거나 놓친 일은 사라지지 않고 '지금이라도 챙길 일'로 넘어온다
  const carried = tasks.filter((t) => !t.done && t.due_date && t.due_date < today);
  const todo = tasks.filter((t) => !t.done && (t.due_date ? t.due_date === today : !input.dischargeDate));
  const next = tasks.find((t) => !t.done && t.due_date && t.due_date > today);
  const noOwnerVisits = tasks.filter((t) => !t.done && t.kind === "schedule" && !t.assignee_id && (!t.due_date || t.due_date >= today)).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const highCount = results.filter((r) => r.verdict === "high").length;
  // 히어로는 큰 숫자 하나 + 설명 한 줄로 나눈다
  const hero = heroLabel(input.dischargeDate, today);
  // 씩씩이 한마디: 지금 시점에 맞춰 짧게
  const cheer = stage === "visit" ? "오늘 병원 가는 날!" : stage === "pre" ? "퇴원 준비, 같이 해요" : checkedToday ? "오늘 기록 완료!" : "오늘도 씩씩하게";
  const mood = stage === "recovery" && checkedToday ? "cheer" : "idle";
  const list = { members, auth, meId: actor.memberId, canAssign: true, today, detailBase: `${base}/tasks` };
  // 이번 주 띠와 다가오는 일정(할 일 중 병원 일정 + 퇴원일 + 지원 마감)
  const events = buildEvents(data);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const upcoming = [...events].filter(([d]) => d >= today).sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([d, es]) => es.filter((e) => !e.done && (e.kind === "visit" || e.kind === "discharge" || e.kind === "deadline")).map((e) => [d, e] as const)).slice(0, 3);
  const topBenefits = [...open].sort((a, b) => (a.deadline.state === "open" ? a.deadline.daysLeft! : 9999) - (b.deadline.state === "open" ? b.deadline.daysLeft! : 9999)).filter((r) => r.verdict === "high").slice(0, 3);
  const cta = "mt-3 flex items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-ink";
  const card = "mt-4 rounded-xl bg-card shadow-card p-4";

  return (
    <>
      <Remember path={base} label={`${actor.name}님의 씩씩케어`} />
      <header className="flex items-center justify-between">
        <Logo />
        <div className="-mr-2 flex items-center">
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted shadow-card">{actor.name}님 가족</span>
          <Link href={`${base}/settings`} aria-label="설정" className="flex w-11 items-center justify-center text-muted"><Icon name="settings" size={20} /></Link>
        </div>
      </header>

      {/* 히어로: 큰 D-day 숫자 + 씩씩이 한마디 */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-accent-soft p-5" aria-label="퇴원 일정">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 aria-label={dischargeLabel(input.dischargeDate, today)} className="text-display font-display tracking-tight text-ink tabular-nums">{hero.big}</h1>
            <p className="mt-2.5 text-sm font-medium text-accent">{hero.sub}</p>
          </div>
          <div className="flex shrink-0 flex-col items-end">
            <span className="rounded-2xl rounded-br-sm bg-card px-3 py-1.5 text-xs font-medium text-ink shadow-card">{cheer}</span>
            <Mascot size={76} mood={mood} className="mascot-bob -mb-2 mt-1" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-card/80" role="progressbar" aria-label="할 일 진행률" aria-valuemin={0} aria-valuenow={doneCount} aria-valuemax={tasks.length}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${tasks.length ? Math.max(4, (doneCount / tasks.length) * 100) : 0}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-accent tabular-nums">할 일 {tasks.length}개 중 {doneCount}개 완료</p>
        {!input.dischargeDate && (
          <Link href={`${base}/settings`} className="mt-3 flex items-center justify-center rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card">퇴원일 확정하기</Link>
        )}
      </section>

      {/* 씩씩이 질문창: 자바스크립트 없이도 동작하는 GET 폼 */}
      <section className="mt-3 rounded-xl bg-card p-3 shadow-card" aria-label="씩씩이에게 물어보기">
        <form action={`${base}/chat`} className="flex items-center gap-2">
          <Mascot size={36} />
          <label htmlFor="ask" className="sr-only">씩씩이에게 질문</label>
          <input id="ask" name="q" maxLength={300} placeholder="씩씩이에게 무엇이든 물어보세요" className="min-h-0 min-w-0 flex-1 bg-transparent py-2 text-callout outline-none" />
          <button aria-label="묻기" className="flex h-10 w-10 min-h-0 items-center justify-center rounded-full bg-primary text-ink"><Icon name="send" size={18} /></button>
        </form>
        <div className="mt-2 flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {["오늘 뭐부터 하면 돼?", "다음 병원 일정은 언제야?", "실손24가 뭐야?"].map((c) => (
            <Link key={c} href={`${base}/chat?q=${encodeURIComponent(c)}`} className="flex h-8 min-h-0 shrink-0 items-center rounded-full bg-accent-soft px-3 text-xs font-medium text-accent">{c}</Link>
          ))}
        </div>
      </section>
      {isNew && (
        <section className="mt-4 rounded-xl bg-accent-soft p-4">
          <p className="font-semibold">씩씩케어가 준비됐어요</p>
          <p className="mt-1 text-sm">로그인이 없어서 <b>이 주소가 곧 열쇠</b>예요. 이 기기에서는 첫 화면에서 다시 열 수 있고, 다른 기기에서 쓰려면 설정에서 주소를 복사해두세요.</p>
        </section>
      )}

      {stage === "visit" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-semibold">오늘은 병원 가는 날이에요</h2>
          <p className="mt-1 text-sm text-muted">{visit!.title}</p>
          <Link href={`${base}/report`} className={cta}>외래 리포트 열기</Link>
          <p className="mt-2 text-sm text-muted">진료실에서 휴대폰을 가로로 돌려 의료진에게 보여주세요.</p>
        </section>
      )}
      {stage === "pre" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-semibold">퇴원할 때 받아둘 서류</h2>
          <p className="mt-1 text-sm text-muted">
            보험 청구 서류 {data.packet.length}/{PACKET.length} 준비 · 실손24 {data.silson24 === "yes" ? "전산 청구 가능" : data.silson24 === "no" ? "미지원 병원 (종이 서류 필요)" : "아직 확인 전"}
          </p>
          <Link href={`${base}/docs`} className={cta}>서류 챙기기</Link>
        </section>
      )}
      {stage === "recovery" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-semibold">저녁 안부 체크</h2>
          <p className="mt-1 text-sm text-muted">{checkedToday ? "오늘 기록을 남겼어요. 외래 리포트에 쌓이고 있어요." : "약, 체온, 통증, 배변을 10초 만에 남겨요. 외래 때 의료진에게 보여줄 기록이 돼요."}</p>
          {checkedToday
            ? <Link href={`${base}/report`} className="mt-3 flex items-center justify-center rounded-full bg-accent-soft px-4 py-3 font-semibold text-accent">외래 리포트 보기</Link>
            : <Link href={`${base}/daily`} className={cta}>오늘 기록 남기기</Link>}
        </section>
      )}

      {noOwnerVisits > 0 && (
        <Link href={`${base}/tasks?f=none`} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-warn-soft px-4 py-3 font-medium text-warn">병원 일정 {noOwnerVisits}개에 같이 갈 사람이 정해지지 않았어요<Icon name="right" size={18} /></Link>
      )}

      {/* 오늘 할 일: 놓친 일 먼저, 최대 4개 */}
      <section className="mt-6" aria-labelledby="h-today">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 id="h-today" className="font-display text-headline">{input.dischargeDate ? "오늘 할 일" : "먼저 할 일"}</h2>
            <p className="text-xs text-muted tabular-nums">오늘 {todo.length}개{carried.length ? ` · 놓친 일 ${carried.length}개` : ""}</p>
          </div>
          <Link href={`${base}/tasks`} className="flex items-center text-sm font-medium text-accent">전체 보기<span className="sr-only"> 할 일</span></Link>
        </div>
        <TaskList
          tasks={[...carried, ...todo].slice(0, 4)} {...list}
          emptyText={next ? `오늘은 할 일이 없어요. 다음 할 일은 ${dateLabel(next.due_date, next.rel_day, today)}이에요` : "오늘은 할 일이 없어요"}
        />
      </section>

      {/* 이번 주: 오늘부터 7일 달력 띠 + 다가오는 일정 */}
      <section className="mt-6" aria-labelledby="h-week">
        <div className="mb-2 flex items-end justify-between">
          <h2 id="h-week" className="font-display text-headline">이번 주 일정</h2>
          <Link href={`${base}/calendar`} className="flex items-center text-sm font-medium text-accent">달력 보기</Link>
        </div>
        <div className="rounded-xl bg-card p-3 shadow-card">
          <ol className="grid grid-cols-7 gap-1">
            {week.map((d) => {
              const ev = events.get(d) ?? [];
              const kinds = [...new Set(ev.map((e) => e.kind))].slice(0, 3);
              return (
                <li key={d}>
                  <Link href={`${base}/calendar?d=${d}`}
                    className={`flex min-h-0 flex-col items-center gap-1 rounded-2xl py-2 ${d === today ? "bg-accent-soft" : ""} ${d === input.dischargeDate ? "ring-[1.5px] ring-[#ef7a4a]" : ""}`}>
                    <span className={`text-caption ${d === today ? "font-semibold text-accent" : "text-muted"}`}>{d === today ? "오늘" : weekday(d)}</span>
                    <span className="font-display text-headline tabular-nums">{Number(d.slice(8))}<span className="sr-only">일, 일정 {ev.length}개</span></span>
                    <span className="flex h-1.5 gap-0.5">{kinds.map((k) => <span key={k} className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_STYLE[k].dot }} />)}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          {upcoming.length > 0 && (
            <ul className="mt-2 space-y-1.5 border-t border-line pt-3">
              {upcoming.map(([d, e]) => (
                <li key={d + e.title} className="flex items-center gap-2 text-sm">
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-caption font-semibold ${EVENT_STYLE[e.kind].chip}`}>{EVENT_STYLE[e.kind].label}</span>
                  <span className="min-w-0 flex-1 truncate">{e.title}</span>
                  <span className="shrink-0 text-xs text-muted tabular-nums">{d === today ? "오늘" : krDate(d)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {noOwnerVisits > 0 && (
        <Link href={`${base}/tasks?f=none`} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">병원 일정 {noOwnerVisits}개에 같이 갈 사람이 정해지지 않았어요<Icon name="right" size={16} /></Link>
      )}

      {/* 받을 수 있는 지원: 이름과 마감만 짧게 */}
      <section className="mt-6" aria-labelledby="h-benefit">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 id="h-benefit" className="font-display text-headline">받을 수 있는 지원 <span className="text-accent">{highCount}개</span></h2>
            <p className="text-xs text-muted">우리 가족 조건으로 골랐어요. 마감이 가까운 순서예요</p>
          </div>
          <Link href={`${base}/benefits`} className="flex items-center text-sm font-medium text-accent">전체 보기<span className="sr-only"> 지원</span></Link>
        </div>
        <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
          {topBenefits.map((r) => (
            <li key={r.benefit.id}>
              <Link href={`${base}/benefits/${r.benefit.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{r.benefit.name}</span>
                  <span className="block truncate text-xs text-muted">{r.benefit.summary}</span>
                </span>
                {r.deadline.state === "open" && <span className="shrink-0 rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn">{dday(r.deadline.daysLeft!)}</span>}
                <Icon name="right" size={16} className="text-muted" />
              </Link>
            </li>
          ))}
          {topBenefits.length === 0 && <li className="px-4 py-3 text-sm text-muted">확인이 필요한 지원을 모두 살펴봤어요</li>}
        </ul>
      </section>

      <section className="mt-6" aria-labelledby="h-act">
        <h2 id="h-act" className="mb-2 font-semibold">가족 최근 활동</h2>
        <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
          {activity.slice(0, 3).map((a) => <li key={a.id} className="px-4 py-3 text-sm">{a.text}</li>)}
        </ul>
        {members.length < 2 && (
          <Link href={`${base}/family`} className="mt-3 flex items-center justify-center rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">가족 초대해서 나누기</Link>
        )}
      </section>
    </>
  );
}
