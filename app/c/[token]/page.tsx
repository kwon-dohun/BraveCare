import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { unreadCount } from "@/lib/load";
import { PACKET } from "@/lib/packet";
import { dischargeLabel, dateLabel, dday, heroLabel, timeContextCheer, weekendDischargeWarning } from "@/lib/format";
import { buildEvents } from "@/lib/calendar";
import { addDays } from "@/lib/timeline";
import { dayDiff } from "@/lib/benefits";
import TaskList from "@/components/TaskList";
import Remember from "@/components/Remember";
import WeekStrip from "@/components/WeekStrip";
import Icon from "@/components/Icon";
import RefreshIfSeen from "@/components/RefreshIfSeen";
import Mascot, { Logo } from "@/components/Mascot";
import VisitDoneButton from "@/components/VisitDoneButton";
import { askForm, pickVisitQuestions } from "@/lib/report";

export default async function Home(props: PageProps<"/c/[token]">) {
  const { token } = await props.params;
  const isNew = (await props.searchParams).new === "1";
  const { actor, data, auth, base } = await adminPage(token);
  const { input, today, tasks, members, results, status, activity } = data;
  const [unread, daily] = await Promise.all([unreadCount(actor.caseId, actor.memberId), loadDaily(actor.caseId)]);
  const checkedToday = daily.some((c) => c.check_date === today);
  // 환자가 직접 남긴 오늘 안부에 위험 신호가 있으면 가족 홈 맨 위에 알린다
  const td = daily.find((c) => c.check_date === today && c.source_role === "patient");
  const patientAlert = td ? [td.pain >= 7 && "통증이 심해요", td.temp === "high" && "고열이 있어요", td.wound_issue && "수술 부위가 불편해요"].filter(Boolean).join(", ") : "";

  // 시점에 따라 맨 위에 올 것이 달라진다: 병원 가는 날 → 퇴원 전 → 집에서 회복
  const visit = tasks.find((t) => t.kind === "schedule" && t.due_date === today);
  const stage = visit ? "visit" : !input.dischargeDate || today <= input.dischargeDate ? "pre" : "recovery";

  // 아직 신청하지 않은 지원. 신청함으로 바꾸면 홈에서 빠진다.
  const open = results.filter((r) => r.verdict !== "no" && r.deadline.state !== "closed" && (status[r.benefit.id] ?? "none") === "none");

  // 의료진에게 물어볼 질문은 날짜가 지나도 '놓친 일'이 아니다(외래 리포트·물어볼 것에서 다룬다). 할 일만 센다
  const work = tasks.filter((t) => t.kind !== "question");
  // 놓친 일은 사라지지 않지만 오늘 할 일을 밀어내지 않게: 오늘 일 먼저, 남는 자리에 가장 최근에 놓친 일 1~2개
  const carried = work.filter((t) => !t.done && t.due_date && t.due_date < today).sort((a, b) => b.due_date!.localeCompare(a.due_date!));
  const todo = work.filter((t) => !t.done && (t.due_date ? t.due_date === today : !input.dischargeDate));
  // 홈 오늘 할 일: 내 몫 → 임자 없는 일 → 다른 가족이 맡은 일 순서(구분은 줄 오른쪽의 담당 표시가 한다)
  const mine = (t: { assignee_id: string | null }) => (t.assignee_id === actor.memberId ? 0 : !t.assignee_id ? 1 : 2);
  const shown = todo.slice(0, 4).sort((x, y) => mine(x) - mine(y));
  const missed = carried.length > 0 && (
    <Link href={`${base}/tasks?view=list`} className={`flex min-h-11 items-center justify-between bg-warn-soft px-4 py-3 text-sm font-semibold text-warn ${todo.length ? "border-t border-line" : "mt-3 rounded-xl"}`}>
      <span>놓친 일 <span className="tabular-nums">{carried.length}개</span></span>
      <span className="flex items-center gap-0.5">확인하기<Icon name="right" size={16} /></span>
    </Link>
  );
  const next = work.find((t) => !t.done && t.due_date && t.due_date > today);
  const noOwnerVisits = tasks.filter((t) => !t.done && t.kind === "schedule" && !t.assignee_id && (!t.due_date || t.due_date >= today)).length;
  const doneCount = work.filter((t) => t.done).length; // 일정 탭과 같게: 물어볼 것은 할 일 수에 넣지 않는다
  const highCount = results.filter((r) => r.verdict === "high").length;
  // 히어로는 큰 숫자 하나 + 설명 한 줄로 나눈다 (셀프 케어 모드 시 1인칭 맞춤)
  const hero = heroLabel(input.dischargeDate, today, data.isSelfCare);
  // 씩씩이 감성 한마디: 한국 시간 기준 시간대(새벽/오전/오후/저녁)와 회복 단계, 사후 가입 여부, 셀프 케어 모드에 맞춤
  const kstHour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hour12: false }).format(new Date()));
  const daysSince = input.dischargeDate ? -dayDiff(input.dischargeDate, today) : undefined;
  const cheer = timeContextCheer(stage, checkedToday, kstHour, daysSince, data.isSelfCare);
  const weekendWarning = weekendDischargeWarning(input.dischargeDate, today);
  const mood = stage === "recovery" && checkedToday ? "cheer" : "idle";
  const list = { members, auth, meId: actor.memberId, today, detailBase: `${base}/tasks`, showOwner: !data.alone };
  // 이번 주 띠와 다가오는 일정(할 일 중 병원 일정 + 퇴원일 + 지원 마감)
  const events = buildEvents(data);
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const byDeadline = [...open].sort((a, b) => (a.deadline.state === "open" ? a.deadline.daysLeft! : 9999) - (b.deadline.state === "open" ? b.deadline.daysLeft! : 9999));
  // 가능성 높은 지원이 없으면 '확인 필요' 지원을 대신 보여준다(빈 칸으로 두지 않는다)
  const onlyCheck = !byDeadline.some((r) => r.verdict === "high");
  const topBenefits = byDeadline.filter((r) => r.verdict === (onlyCheck ? "check" : "high")).slice(0, 3);
  const cta = "mt-3 flex items-center justify-center rounded-xl bg-primary px-4 py-3 font-semibold text-ink";
  const card = "mt-4 rounded-xl bg-card shadow-card p-4";

  return (
    <>
      <RefreshIfSeen />
      <Remember path={base} label={`${actor.name}님의 씩씩케어`} />
      <header className="flex items-center justify-between">
        <Logo />
        <div className="-mr-2 flex items-center">
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium text-muted shadow-card">
            {actor.name}님{data.isSelfCare ? "" : " 가족"}
          </span>
          <Link href={`${base}/news`} aria-label={unread ? `새 소식 ${unread}개` : "새 소식"} className="relative flex w-11 items-center justify-center text-muted">
            <Icon name="bell" size={20} />
            {unread > 0 && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-[#e0517a] ring-2 ring-background" />}
          </Link>
          <Link href={`${base}/settings`} aria-label="설정" className="flex w-11 items-center justify-center text-muted"><Icon name="settings" size={20} /></Link>
        </div>
      </header>

      {/* 히어로: 큰 D-day 숫자 + 씩씩이 한마디 */}
      <section className="relative mt-4 overflow-hidden rounded-3xl bg-accent-soft p-5" aria-label="퇴원 일정">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1 pl-1 pt-2">
            <h1 aria-label={dischargeLabel(input.dischargeDate, today)} className="whitespace-nowrap text-display font-display tracking-tight text-ink tabular-nums">{hero.big}</h1>
            <p className="mt-2 text-sm font-medium text-accent">{hero.sub}</p>
          </div>
          <div className="flex w-32 shrink-0 flex-col items-end">
            <span className="rounded-2xl rounded-br-sm bg-card px-3 py-1.5 text-xs font-medium text-ink shadow-card">{cheer}</span>
            <Mascot size={76} mood={mood} className="mascot-bob -mb-2 mt-1" />
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-card/80" role="progressbar" aria-label="할 일 진행률" aria-valuemin={0} aria-valuenow={doneCount} aria-valuemax={work.length}>
          <div className="h-full rounded-full bg-primary" style={{ width: `${work.length ? Math.max(4, (doneCount / work.length) * 100) : 0}%` }} />
        </div>
        <p className="mt-1.5 text-xs text-accent tabular-nums">할 일 {work.length}개 중 {doneCount}개 완료</p>
        {!input.dischargeDate && (
          <Link href={`${base}/settings`} className="mt-3 flex items-center justify-center rounded-full bg-card px-4 py-2.5 text-sm font-semibold text-ink shadow-card">퇴원일 확정하기</Link>
        )}
      </section>

      {patientAlert && (
        <Link href={`${base}/daily`} className="mt-3 block rounded-xl bg-warn-soft px-4 py-3 text-warn">
          <p className="font-semibold">환자분이 오늘 안부에서 {patientAlert}</p>
          <p className="mt-0.5 text-sm">전화로 상태를 확인해 보세요. 숨이 차거나 의식이 흐리면 바로 119에 전화하세요.</p>
        </Link>
      )}

      {/* 주말·공휴일 원무과/주민센터 휴무 사전 경고 (D-1 주말 보정) */}
      {weekendWarning && (
        <aside className="mt-3 rounded-2xl bg-[#fff4cc] p-4 shadow-card text-[#7a5a00] border border-[#f5e6a3]" aria-label="주말 원무과 휴무 사전 안내">
          <p className="text-xs font-bold tracking-wide uppercase">행정 일정 사전 안내</p>
          <p className="mt-1 text-sm font-semibold">{weekendWarning}</p>
        </aside>
      )}

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
          <VisitDoneButton auth={auth} questions={pickVisitQuestions(tasks).map((q) => ({ id: q.id, text: askForm(q.title) }))} visitTitle={visit!.title} scanHref={`${base}/scan`} today={today} />
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted">
            <span>진료실에서 휴대폰을 가로로 돌려 보여주세요</span>
            <Link href={`${base}/daily`} className="text-accent underline underline-offset-2">진료 전 데일리 체크</Link>
          </div>
        </section>
      )}
      {stage === "pre" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-semibold">퇴원할 때 받아둘 서류</h2>
          <p className="mt-1 text-sm text-muted">
            보험 청구 서류 {data.packet.length}/{PACKET.length} 준비 · 실손24 {data.silson24 === "yes" ? "전산 청구 가능" : data.silson24 === "no" ? "미지원 병원 (종이 서류 필요)" : "아직 확인 전"}
          </p>
          <Link href={`${base}/docs`} className={cta}>서류 챙기기</Link>
          {!input.dischargeDate && (
            <p className="mt-2.5 text-xs text-muted">
              이미 퇴원하셨다면 <Link href={`${base}/settings`} className="font-semibold text-accent underline underline-offset-2">퇴원일을 설정</Link>하시면 데일리 체크와 맞춤 일정이 시작돼요.
            </p>
          )}
        </section>
      )}
      {stage === "recovery" && input.dailyCompleted ? (
        // 회복 완료 축하는 처리한 뒤 사흘만 보여 주고 사라진다(다시 시작은 설정에서). 날짜 기록이 없는 예전 처리분은 바로 숨긴다
        input.dailyCompletedAt && dayDiff(today, input.dailyCompletedAt) <= 2 ? (
          <section className="mt-4 flex items-center gap-3 rounded-2xl bg-accent-soft p-4 text-accent" aria-labelledby="h-stage-done">
            <Mascot size={48} mood="cheer" />
            <div className="min-w-0">
              <h2 id="h-stage-done" className="font-semibold text-ink">건강한 일상으로 복귀하셨어요!</h2>
              <p className="mt-0.5 text-xs">데일리 체크를 마쳤어요. 그동안 정성껏 기록해 주셔서 고마워요.</p>
            </div>
          </section>
        ) : null
      ) : stage === "recovery" ? (
        <section className={card} aria-labelledby="h-stage">
          <div className="flex items-center justify-between">
            <h2 id="h-stage" className="font-semibold">데일리 체크</h2>
            {checkedToday && <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">오늘 완료</span>}
          </div>
          <p className="mt-1 text-sm text-muted">
            {checkedToday
              ? "오늘 데일리 체크를 남겼어요. 외래 리포트에 자동으로 정리되고 있어요."
              : "약 복용, 체온, 통증, 배변을 10초 만에 남겨요. 낮이든 밤이든 언제든 기록할 수 있어요."}
          </p>
          {checkedToday ? (
            <div className="mt-3 flex gap-2">
              <Link href={`${base}/report`} className="flex-1 flex items-center justify-center rounded-xl bg-accent-soft px-4 py-3 font-semibold text-accent">외래 리포트 보기</Link>
              <Link href={`${base}/daily`} className="flex items-center justify-center rounded-xl border border-line bg-card px-4 py-3 text-sm font-medium text-muted">기록 수정</Link>
            </div>
          ) : (
            <Link href={`${base}/daily`} className={cta}>오늘 데일리 체크 남기기</Link>
          )}
        </section>
      ) : null}

      {!data.alone && noOwnerVisits > 0 && (
        <Link href={`${base}/tasks?view=list&f=none`} className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-warn-soft px-4 py-3 font-medium text-warn">병원 일정 {noOwnerVisits}개에 같이 갈 사람이 정해지지 않았어요<Icon name="right" size={18} /></Link>
      )}

      {/* 오늘 할 일: 오늘 일 최대 4개(내 몫과 임자 없는 일로 나눔), 놓친 일은 한 줄 배너로 */}
      <section className="mt-6" aria-labelledby="h-today">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <h2 id="h-today" className="font-display text-headline">{input.dischargeDate ? "오늘 할 일" : "먼저 할 일"}</h2>
            <p className="text-xs text-muted tabular-nums">오늘 {todo.length}개</p>
          </div>
          <Link href={`${base}/tasks`} className="flex items-center text-sm font-medium text-accent">전체 보기<span className="sr-only"> 할 일</span></Link>
        </div>
        {todo.length === 0 && <TaskList tasks={[]} {...list} emptyText={next ? `오늘은 할 일이 없어요. 다음 할 일은 ${dateLabel(next.due_date, next.rel_day, today)}이에요` : "오늘은 할 일이 없어요"} />}
        {todo.length > 0 && (
          <div className="overflow-hidden rounded-xl bg-card shadow-card">
            <TaskList tasks={shown} {...list} hideToday compact flat />
            {carried.length > 0 && missed}
          </div>
        )}
        {todo.length === 0 && carried.length > 0 && missed}
      </section>

      {/* 씩씩이 질문창: 자바스크립트 없이도 동작하는 GET 폼 */}
      <section className="mt-4 rounded-xl border border-transparent bg-card p-3 shadow-card transition-colors focus-within:border-accent" aria-label="씩씩이에게 물어보기">
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

      {/* 이번 주: 오늘부터 7일 달력 띠 (홈에서 바로 날짜별 일정 확인) */}
      <WeekStrip
        week={week}
        today={today}
        dischargeDate={input.dischargeDate}
        eventsData={[...events.entries()]}
        base={base}
      />

      {/* 받을 수 있는 지원: 이름과 마감만 짧게 */}
      <section className="mt-6" aria-labelledby="h-benefit">
        <div className="mb-2 flex items-end justify-between">
          <div>
            {onlyCheck
              ? <h2 id="h-benefit" className="font-display text-headline">조건을 확인해 볼 지원</h2>
              : <h2 id="h-benefit" className="font-display text-headline">받을 수 있는 지원 <span className="text-accent">{highCount}개</span></h2>}
            <p className="text-xs text-muted">{onlyCheck ? "확실히 대상인 지원은 아직 없지만, 조건에 따라 받을 수 있어요" : (data.isSelfCare ? "입력한 조건으로 골랐어요. 마감이 가까운 순서예요" : "우리 가족 조건으로 골랐어요. 마감이 가까운 순서예요")}</p>
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
          {topBenefits.length === 0 && <li className="px-4 py-3 text-sm text-muted">지금 새로 챙길 지원은 없어요. 신청한 지원은 ‘지원’에서 진행 상황을 볼 수 있고, 퇴원일·소득이 바뀌면 설정에서 고치면 다시 찾아 드려요.</li>}
        </ul>
      </section>

      {/* 환자 본인이 혼자 쓰는 동안에는 가족 활동을 두지 않는다(새 소식은 위 종 아이콘) */}
      {!data.alone && <section className="mt-6" aria-labelledby="h-act">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="h-act" className="font-semibold">{data.isSelfCare ? "최근 활동" : "가족 최근 활동"}{unread > 0 && <span className="ml-1.5 rounded-full bg-[#ffe4ea] px-2 py-0.5 text-caption font-semibold text-[#a3324f]">새 소식 {unread}</span>}</h2>
          <Link href={`${base}/news`} className="flex min-h-0 items-center py-1 text-sm text-accent">모두 보기</Link>
        </div>
        <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
          {activity.slice(0, 3).map((a) => <li key={a.id} className="px-4 py-3 text-sm">{a.text}</li>)}
        </ul>
        {members.length < 2 && (
          <Link href={`${base}/family`} className="mt-3 flex items-center justify-center rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">가족 초대해서 나누기</Link>
        )}
      </section>}
    </>
  );
}
