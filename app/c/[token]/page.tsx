import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { PACKET } from "@/lib/packet";
import { dischargeLabel, dateLabel, dday, heroLabel } from "@/lib/format";
import BenefitCard from "@/components/BenefitCard";
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

  // 마감이 가장 임박한 미신청 지원 1개. 신청함으로 바꾸면 여기서 빠진다. 마감 있는 지원이 없으면 가능성 높은 미신청 지원 1개.
  const open = results.filter((r) => r.verdict !== "no" && r.deadline.state !== "closed" && (status[r.benefit.id] ?? "none") === "none");
  const urgent = open.filter((r) => r.deadline.state === "open").sort((a, b) => a.deadline.daysLeft! - b.deadline.daysLeft!)[0] ?? open.find((r) => r.verdict === "high");

  // 늦게 시작했거나 놓친 일은 사라지지 않고 '지금이라도 챙길 일'로 넘어온다
  const carried = tasks.filter((t) => !t.done && t.due_date && t.due_date < today);
  const todo = tasks.filter((t) => !t.done && (t.due_date ? t.due_date === today : !input.dischargeDate));
  const next = tasks.find((t) => !t.done && t.due_date && t.due_date > today);
  const noOwnerVisits = tasks.filter((t) => !t.done && t.kind === "schedule" && !t.assignee_id && (!t.due_date || t.due_date >= today)).length;
  const unassigned = tasks.filter((t) => !t.done && !t.assignee_id).length;
  const doneCount = tasks.filter((t) => t.done).length;
  const highCount = results.filter((r) => r.verdict === "high").length;
  // 히어로는 큰 숫자 하나 + 설명 한 줄로 나눈다
  const hero = heroLabel(input.dischargeDate, today);
  // 씩씩이 한마디: 지금 시점에 맞춰 짧게
  const cheer = stage === "visit" ? "오늘 병원 가는 날!" : stage === "pre" ? "퇴원 준비, 같이 해요" : checkedToday ? "오늘 기록 완료!" : "오늘도 씩씩하게";
  const mood = stage === "recovery" && checkedToday ? "cheer" : "idle";
  const list = { members, auth, meId: actor.memberId, canAssign: true, today, detailBase: `${base}/tasks` };
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

      {/* 벤토: 지원·오늘 할 일·담당자 없음을 숫자로 한눈에 */}
      <nav className="mt-3 grid grid-cols-3 gap-2" aria-label="요약">
        {([
          [`${base}/benefits`, "받을 지원", highCount, urgent?.deadline.state === "open" ? dday(urgent.deadline.daysLeft!) : "가능성 높음", false],
          [`${base}/tasks`, input.dischargeDate ? "오늘 할 일" : "먼저 할 일", todo.length, carried.length ? `밀린 일 ${carried.length}` : "오늘 몫", carried.length > 0],
          [`${base}/tasks?f=none`, "담당자 없음", unassigned, members.length < 2 ? "가족 초대하기" : "나눠 맡기", unassigned > 0],
        ] as const).map(([href, label, n, sub, alert]) => (
          <Link key={label} href={href} className="flex flex-col rounded-xl bg-card px-3.5 py-3 shadow-card">
            <span className="text-xs text-muted">{label}</span>
            <span className="mt-1 font-display text-2xl leading-tight tabular-nums">{n}</span>
            <span className={`text-xs ${alert ? "font-medium text-warn" : "text-accent"}`}>{sub}</span>
          </Link>
        ))}
      </nav>

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

      {carried.length > 0 && (
        <section className="mt-6" aria-labelledby="h-carry">
          <h2 id="h-carry" className="mb-2 font-semibold text-warn">지금이라도 챙길 일 ({carried.length})</h2>
          <TaskList tasks={carried.slice(0, 3)} {...list} />
          {carried.length > 3 && <Link href={`${base}/tasks`} className="mt-2 flex items-center text-sm text-muted underline">나머지 {carried.length - 3}개 보기</Link>}
        </section>
      )}

      <section className="mt-6" aria-labelledby="h-today">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="h-today" className="font-semibold">{input.dischargeDate ? "오늘 할 일" : "먼저 할 일"}{todo.length > 3 ? ` (${todo.length}개 중 3개)` : ""}</h2>
          <Link href={`${base}/tasks`} className="flex items-center text-sm text-muted underline">전체 보기<span className="sr-only"> 할 일</span></Link>
        </div>
        <TaskList
          tasks={todo.slice(0, 3)} {...list}
          emptyText={next ? `오늘은 할 일이 없어요. 다음 할 일은 ${dateLabel(next.due_date, next.rel_day, today)}이에요` : "오늘은 할 일이 없어요"}
        />
      </section>

      <section className="mt-6" aria-labelledby="h-urgent">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="h-urgent" className="font-semibold">{urgent?.deadline.state === "open" ? "마감이 가장 가까운 지원" : "먼저 확인해볼 지원"}</h2>
          <Link href={`${base}/benefits`} className="flex items-center text-sm text-muted underline">전체 보기<span className="sr-only"> 지원</span></Link>
        </div>
        {urgent ? (
          <BenefitCard r={urgent} href={`${base}/benefits/${urgent.benefit.id}`} status={status[urgent.benefit.id]} />
        ) : (
          <p className="rounded-xl bg-card shadow-card p-4 text-muted">확인이 필요한 지원을 모두 살펴봤어요</p>
        )}
      </section>

      <nav className="mt-6" aria-label="바로 가기">
        <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
          {[
            [`${base}/scan`, "안내문·약봉투 촬영해서 할 일 만들기"],
            [`${base}/chat`, "내 서류에 적힌 내용 물어보기"],
            ...(stage === "pre" ? [] : [[`${base}/docs`, "보험 청구 서류 챙기기"]]),
          ].map(([href, label]) => (
            <li key={href}><Link href={href} className="flex items-center justify-between px-4 py-3"><span>{label}</span><Icon name="right" size={18} className="text-muted" /></Link></li>
          ))}
        </ul>
      </nav>

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
