import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { PACKET } from "@/lib/packet";
import { dischargeLabel, dateLabel, dday } from "@/lib/format";
import BenefitCard from "@/components/BenefitCard";
import TaskList from "@/components/TaskList";
import Remember from "@/components/Remember";

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
  const list = { members, auth, meId: actor.memberId, canAssign: true, today, detailBase: `${base}/tasks` };
  const cta = "mt-3 flex items-center justify-center rounded-xl bg-accent px-4 py-3 font-bold text-white";
  const card = "mt-4 rounded-xl border border-line bg-card p-4";

  return (
    <>
      <Remember path={base} label={`${actor.name}님의 씩씩케어`} />
      <header className="flex items-center justify-between">
        <p className="font-extrabold text-accent">씩씩케어</p>
        <Link href={`${base}/settings`} className="-mr-2 flex items-center gap-1 px-2 text-sm text-muted">
          <span className="rounded-full border border-line px-3 py-1">{actor.name}님 가족</span>
          <span className="underline">설정</span>
        </Link>
      </header>

      <section className="mt-5" aria-label="퇴원 일정">
        <p className="text-sm text-muted">{input.dischargeDate ? `퇴원일 ${input.dischargeDate}` : "일정을 퇴원일 기준으로 보여드리고 있어요"}</p>
        <h1 className="mt-1 text-5xl font-extrabold leading-tight tabular-nums">{dischargeLabel(input.dischargeDate, today)}</h1>
        <div className="mt-4 h-1.5 rounded-full bg-line" role="progressbar" aria-label="할 일 진행률" aria-valuemin={0} aria-valuenow={doneCount} aria-valuemax={tasks.length}>
          <div className="h-full rounded-full bg-accent" style={{ width: `${tasks.length ? (doneCount / tasks.length) * 100 : 0}%` }} />
        </div>
        <p className="mt-1.5 text-sm text-muted tabular-nums">할 일 {tasks.length}개 중 {doneCount}개 완료</p>
        {!input.dischargeDate && (
          <Link href={`${base}/settings`} className="mt-3 flex items-center justify-center rounded-full border border-line bg-card px-4 py-2 font-bold">퇴원일 확정하기</Link>
        )}
      </section>

      {/* 벤토: 지원·오늘 할 일·담당자 없음을 숫자로 한눈에 */}
      <nav className="mt-5 grid grid-cols-2 gap-2" aria-label="요약">
        <Link href={`${base}/benefits`} className="row-span-2 flex flex-col rounded-xl bg-accent-soft p-4 text-accent">
          <span className="text-sm font-medium">받을 수 있는 지원</span>
          <span className="mt-auto pt-6 text-4xl font-extrabold tabular-nums">{highCount}<span className="text-base font-bold">개</span></span>
          <span className="text-sm">{urgent?.deadline.state === "open" ? dday(urgent.deadline.daysLeft!) : "대상 가능성 높음"}</span>
        </Link>
        <Link href={`${base}/tasks`} className="rounded-xl border border-line bg-card px-4 py-3">
          <span className="block text-sm text-muted">{input.dischargeDate ? "오늘 할 일" : "먼저 할 일"}</span>
          <span className="block text-2xl font-extrabold tabular-nums">{todo.length}</span>
        </Link>
        <Link href={`${base}/tasks?f=none`} className="rounded-xl border border-line bg-card px-4 py-3">
          <span className={`block text-sm ${unassigned ? "font-medium text-warn" : "text-muted"}`}>담당자 없음</span>
          <span className="block text-2xl font-extrabold tabular-nums">{unassigned}</span>
        </Link>
      </nav>

      {isNew && (
        <section className="mt-4 rounded-xl border border-accent bg-accent-soft p-4">
          <p className="font-bold">씩씩케어가 준비됐어요</p>
          <p className="mt-1 text-sm">로그인이 없어서 <b>이 주소가 곧 열쇠</b>예요. 이 기기에서는 첫 화면에서 다시 열 수 있고, 다른 기기에서 쓰려면 설정에서 주소를 복사해두세요.</p>
        </section>
      )}

      {stage === "visit" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-bold">오늘은 병원 가는 날이에요</h2>
          <p className="mt-1 text-sm text-muted">{visit!.title}</p>
          <Link href={`${base}/report`} className={cta}>외래 리포트 열기</Link>
          <p className="mt-2 text-sm text-muted">진료실에서 휴대폰을 가로로 돌려 의료진에게 보여주세요.</p>
        </section>
      )}
      {stage === "pre" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-bold">퇴원할 때 받아둘 서류</h2>
          <p className="mt-1 text-sm text-muted">
            보험 청구 서류 {data.packet.length}/{PACKET.length} 준비 · 실손24 {data.silson24 === "yes" ? "전산 청구 가능" : data.silson24 === "no" ? "미지원 병원 (종이 서류 필요)" : "아직 확인 전"}
          </p>
          <Link href={`${base}/docs`} className={cta}>서류 챙기기</Link>
        </section>
      )}
      {stage === "recovery" && (
        <section className={card} aria-labelledby="h-stage">
          <h2 id="h-stage" className="font-bold">저녁 안부 체크</h2>
          <p className="mt-1 text-sm text-muted">{checkedToday ? "오늘 기록을 남겼어요. 외래 리포트에 쌓이고 있어요." : "약, 체온, 통증, 배변을 10초 만에 남겨요. 외래 때 의료진에게 보여줄 기록이 돼요."}</p>
          {checkedToday
            ? <Link href={`${base}/report`} className="mt-3 flex items-center justify-center rounded-xl border border-accent px-4 py-3 font-bold text-accent">외래 리포트 보기</Link>
            : <Link href={`${base}/daily`} className={cta}>오늘 기록 남기기</Link>}
        </section>
      )}

      {noOwnerVisits > 0 && (
        <Link href={`${base}/tasks?f=none`} className="mt-3 flex items-center rounded-xl bg-warn-soft px-4 py-3 font-medium text-warn">병원 일정 {noOwnerVisits}개에 같이 갈 사람이 정해지지 않았어요 ›</Link>
      )}

      {carried.length > 0 && (
        <section className="mt-6" aria-labelledby="h-carry">
          <h2 id="h-carry" className="mb-2 font-bold text-warn">지금이라도 챙길 일 ({carried.length})</h2>
          <TaskList tasks={carried.slice(0, 3)} {...list} />
          {carried.length > 3 && <Link href={`${base}/tasks`} className="mt-2 flex items-center text-sm text-muted underline">나머지 {carried.length - 3}개 보기</Link>}
        </section>
      )}

      <section className="mt-6" aria-labelledby="h-today">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="h-today" className="font-bold">{input.dischargeDate ? "오늘 할 일" : "먼저 할 일"}{todo.length > 3 ? ` (${todo.length}개 중 3개)` : ""}</h2>
          <Link href={`${base}/tasks`} className="flex items-center text-sm text-muted underline">전체 보기</Link>
        </div>
        <TaskList
          tasks={todo.slice(0, 3)} {...list}
          emptyText={next ? `오늘은 할 일이 없어요. 다음 할 일은 ${dateLabel(next.due_date, next.rel_day, today)}이에요` : "오늘은 할 일이 없어요"}
        />
      </section>

      <section className="mt-6" aria-labelledby="h-urgent">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 id="h-urgent" className="font-bold">{urgent?.deadline.state === "open" ? "마감이 가장 가까운 지원" : "먼저 확인해볼 지원"}</h2>
          <Link href={`${base}/benefits`} className="flex items-center text-sm text-muted underline">전체 보기</Link>
        </div>
        {urgent ? (
          <BenefitCard r={urgent} href={`${base}/benefits/${urgent.benefit.id}`} status={status[urgent.benefit.id]} />
        ) : (
          <p className="rounded-xl border border-line bg-card p-4 text-muted">확인이 필요한 지원을 모두 살펴봤어요</p>
        )}
      </section>

      <nav className="mt-6" aria-label="바로 가기">
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {[
            [`${base}/scan`, "안내문·약봉투 촬영해서 할 일 만들기"],
            [`${base}/chat`, "내 서류에 적힌 내용 물어보기"],
            ...(stage === "pre" ? [] : [[`${base}/docs`, "보험 청구 서류 챙기기"]]),
          ].map(([href, label]) => (
            <li key={href}><Link href={href} className="flex items-center justify-between px-4 py-3"><span>{label}</span><span aria-hidden className="text-muted">›</span></Link></li>
          ))}
        </ul>
      </nav>

      <section className="mt-6" aria-labelledby="h-act">
        <h2 id="h-act" className="mb-2 font-bold">가족 최근 활동</h2>
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {activity.slice(0, 3).map((a) => <li key={a.id} className="px-4 py-3 text-sm">{a.text}</li>)}
        </ul>
        {members.length < 2 && (
          <Link href={`${base}/family`} className="mt-3 flex items-center justify-center rounded-xl border border-accent px-5 py-3 font-bold text-accent">가족 초대해서 나누기</Link>
        )}
      </section>
    </>
  );
}
