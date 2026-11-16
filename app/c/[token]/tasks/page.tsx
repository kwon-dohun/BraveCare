import Link from "next/link";
import { redirect } from "next/navigation";
import { adminPage } from "@/lib/page-auth";
import TaskList from "@/components/TaskList";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import AddTask from "./AddTask";
import Segmented from "@/components/Segmented";
import CalSyncLink from "@/components/CalSyncLink";
import { openDeadlines, sortTasks, badgeFor } from "@/lib/priority";
import { buildEvents, monthGrid, shiftMonth, weekday, WEEKDAY, EVENT_STYLE, type EventKind } from "@/lib/calendar";
import { krDate } from "@/lib/format";
import { dayDiff } from "@/lib/benefits";

export const metadata = { title: "일정 · 씩씩케어" };

const SHOW_FIRST = 3; // 각 섹션별 처음 3개만 노출하고 나머지는 더보기로 확장

export default async function SchedulePage(props: PageProps<"/c/[token]/tasks">) {
  const { token } = await props.params;
  const sp = await props.searchParams;
  if (sp.v === "q") redirect(`/c/${token}/questions`);

  const { actor, data, auth, base } = await adminPage(token);
  const me = actor.memberId;
  const isSelfCare = !!data.isSelfCare;
  // 기본은 월별 달력, ?view=list 일 때 할 일 목록
  const isList = sp.view === "list";

  const pool = data.tasks.filter((t) => t.kind !== "question");
  const open = pool.filter((t) => !t.done);
  const done = pool.filter((t) => t.done);
  const total = pool.length, finished = done.length;

  const deadlines = openDeadlines(data.results);
  const badges: Record<string, string> = {};
  for (const t of open) { const b = badgeFor(t, deadlines, data.today); if (b) badges[t.id] = b; }
  const sort = (l: typeof open) => sortTasks(l, deadlines, data.today);

  // 1) 캘린더 계산
  const { today } = data;
  const ym = typeof sp.m === "string" && /^\d{4}-\d{2}$/.test(sp.m) ? sp.m : (typeof sp.d === "string" ? sp.d : today).slice(0, 7);
  const sel = typeof sp.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : ym === today.slice(0, 7) ? today : `${ym}-01`;
  const events = buildEvents(data);
  const dayEvents = events.get(sel) ?? [];
  const dayTasks = pool.filter((t) => t.due_date === sel);
  const othersInDay = dayEvents.filter((e) => !e.taskId);
  const [y, m] = ym.split("-").map(Number);
  const calHref = (q: string) => `${base}/tasks?${q}`;

  // 날짜 선택 시 할 일 3단 분류: 내가 할 일 -> 배정 대기 -> 다른 가족
  const dayMine = dayTasks.filter((t) => t.assignee_id === me && !t.done);
  const dayNeedOwner = dayTasks.filter((t) => !t.assignee_id && !t.done);
  const dayOthers = dayTasks.filter((t) => t.assignee_id && t.assignee_id !== me && !t.done);
  const dayCompleted = dayTasks.filter((t) => t.done);

  // 2) 할 일 목록 계산
  const f = sp.f === "none" || sp.f === "mine" ? sp.f : "";
  const common = { members: data.members, auth, meId: me, today: data.today, detailBase: `${base}/tasks`, badges, showOwner: !isSelfCare };
  const activeOpen = open.filter((t) => !t.due_date || t.due_date >= data.today);
  const pastTasks = open.filter((t) => t.due_date && t.due_date < data.today);
  const mine = sort(activeOpen.filter((t) => t.assignee_id === me));
  const needOwner = sort(activeOpen.filter((t) => !t.assignee_id));
  const others = sort(activeOpen.filter((t) => t.assignee_id && t.assignee_id !== me));
  // 필터(내 일/맡을 사람 필요)를 켜도 기한 지난 일이 사라지지 않게 같은 기준으로 거른다
  const sortedPast = sort(pastTasks.filter((t) => f === "none" ? !t.assignee_id : f === "mine" ? t.assignee_id === me : true));

  const head = (title: string, n: number, hint?: string, tone = "") => (
    <div className="mb-2 flex items-end justify-between gap-2">
      <div><h2 className={`font-semibold ${tone}`}>{title} <span className="tabular-nums">{n}</span></h2>{hint && <p className="text-xs text-muted">{hint}</p>}</div>
    </div>
  );

  return (
    <>
      {/* 상단 통합 세그먼트 스위처: [달력] (메인) | [할 일 목록] */}
      <div className="flex items-center justify-between">
        <Segmented inline label="일정 보기" active={isList ? 1 : 0} items={[{ label: "달력", href: `${base}/tasks` }, { label: "할 일 목록", href: `${base}/tasks?view=list` }]} />

        <div className="flex items-center gap-1.5">
          {!isList && (
            <Link scroll={false} href={calHref(`d=${today}`)} className="flex h-8 items-center justify-center whitespace-nowrap rounded-full bg-card px-3 text-xs font-semibold shadow-card text-ink hover:text-accent">
              오늘
            </Link>
          )}
          <details className="relative">
            <summary aria-label={isList ? "할 일 추가" : "병원 일정이나 할 일 추가"} className="flex h-8 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full bg-card px-3 text-xs font-semibold shadow-card text-ink hover:text-accent after:hidden">
              <Icon name="plus" size={14} />추가
            </summary>
            <div className="absolute right-0 top-9 z-20 w-80 rounded-2xl bg-card p-4 shadow-card ring-1 ring-line">
              <AddTask auth={auth} defaultVisit={!isList} />
            </div>
          </details>
        </div>
      </div>

      {/* ======================= [1. 메인: 월별 캘린더 뷰] ======================= */}
      <div key={isList ? "list" : "cal"} className="view-in">
      {!isList ? (
        <>
          {!data.input.dischargeDate ? (
            <Link href={`${base}/settings`} className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-3.5 text-sm text-accent hover:opacity-95 shadow-card">
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
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Link scroll={false} href={calHref(`d=${data.input.dischargeDate}`)} className="flex items-center justify-between rounded-2xl bg-[#ffe9dc] p-3 text-[#9a3f12] shadow-card hover:opacity-90">
                <div>
                  <p className="text-caption font-semibold">퇴원일</p>
                  <p className="text-sm font-semibold tabular-nums">{krDate(data.input.dischargeDate)}</p>
                </div>
                <span className="rounded-full bg-card px-2 py-0.5 text-caption font-semibold tabular-nums">
                  {data.input.dischargeDate === today ? "오늘" : data.input.dischargeDate > today ? `D-${dayDiff(data.input.dischargeDate, today)}` : `D+${dayDiff(today, data.input.dischargeDate)}`}
                </span>
              </Link>

              {data.tasks.find((t) => t.kind === "schedule" && t.due_date && t.due_date >= today) ? (
                (() => {
                  const nextV = data.tasks.filter((t) => t.kind === "schedule" && t.due_date && t.due_date >= today).sort((a, b) => a.due_date!.localeCompare(b.due_date!))[0];
                  return (
                    <Link scroll={false} href={calHref(`d=${nextV.due_date}`)} className="flex items-center justify-between rounded-2xl bg-[#e3f0ff] p-3 text-[#1f5aa6] shadow-card hover:opacity-90">
                      <div className="min-w-0">
                        <p className="text-caption font-semibold">다음 외래</p>
                        <p className="text-sm font-semibold truncate">{krDate(nextV.due_date!)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-caption font-semibold">외래</span>
                    </Link>
                  );
                })()
              ) : (
                <Link href={`${base}/scan`} className="flex items-center justify-between rounded-2xl bg-card p-3 text-muted shadow-card hover:opacity-90">
                  <div>
                    <p className="text-caption font-semibold">다음 외래 일정</p>
                    <p className="text-xs">예약증 찍어 등록</p>
                  </div>
                  <Icon name="camera" size={16} className="text-muted" />
                </Link>
              )}
            </div>
          )}

          {/* 달 이동 + 달력 (같은 화면 안 이동이라 scroll={false}로 보던 위치를 유지) */}
          <section className="mt-4 rounded-3xl bg-card p-4 shadow-card" aria-label={`${y}년 ${m}월 달력`}>
            <div className="flex items-center justify-between">
              <Link scroll={false} href={calHref(`m=${shiftMonth(ym, -1)}`)} aria-label="이전 달" className="flex w-11 items-center justify-center text-muted"><Icon name="left" size={20} /></Link>
              <p className="font-display text-headline">{y}년 {m}월</p>
              <Link scroll={false} href={calHref(`m=${shiftMonth(ym, 1)}`)} aria-label="다음 달" className="flex w-11 items-center justify-center text-muted"><Icon name="right" size={20} /></Link>
            </div>
            <div className="mt-2 grid grid-cols-7 text-center text-xs text-muted">
              {WEEKDAY.map((w, i) => <span key={w} className={i === 0 ? "text-[#a3324f]" : ""}>{w}</span>)}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {monthGrid(ym).flat().map((d, i) => {
                if (!d) return <span key={`e${i}`} />;
                const ev = events.get(d) ?? [];
                const kinds = [...new Set(ev.map((e) => e.kind))].slice(0, 3) as EventKind[];
                const isSel = d === sel, isToday = d === today, isDis = d === data.input.dischargeDate;
                const hasVisit = ev.some((e) => e.kind === "visit");

                return (
                  <Link key={d} scroll={false} href={calHref(`m=${ym}&d=${d}`)} aria-current={isSel ? "date" : undefined}
                    className="flex min-h-0 flex-col items-center gap-0.5 py-1">
                    <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm tabular-nums transition-colors ${
                      isSel
                        ? "bg-ink font-semibold text-white shadow-card"
                        : isDis
                        ? "bg-[#ffe9dc] font-semibold text-[#9a3f12] ring-2 ring-[#ef7a4a]"
                        : hasVisit
                        ? "bg-[#e3f0ff] font-semibold text-[#1f5aa6] ring-1 ring-[#3b82d6]"
                        : isToday
                        ? "bg-accent-soft font-semibold text-accent ring-1 ring-accent/30"
                        : i % 7 === 0
                        ? "text-[#a3324f]"
                        : ""
                    }`}>
                      {Number(d.slice(8))}
                      <span className="sr-only">일 {weekday(d)}요일{ev.length ? `, 일정 ${ev.length}개` : ""}</span>
                    </span>
                    <span className="flex h-3.5 items-center">
                      {isDis ? (
                        <span className="rounded bg-[#ffe9dc] px-1 text-caption font-semibold leading-none text-[#9a3f12]">퇴원</span>
                      ) : hasVisit ? (
                        <span className="rounded bg-[#e3f0ff] px-1 text-caption font-semibold leading-none text-[#1f5aa6]">외래</span>
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
              {(Object.keys(EVENT_STYLE) as EventKind[]).filter((k) => k !== "discharge" && k !== "visit").map((k) => (
                <li key={k} className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ background: EVENT_STYLE[k].dot }} />{EVENT_STYLE[k].label}</li>
              ))}
            </ul>
          </section>

          {/* 고른 날의 일정 및 할 일 (우선순위: 내가 할 일 -> 배정 대기 -> 다른 가족 순) */}
          <section key={sel} className="view-in mt-6" aria-labelledby="h-day">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <h2 id="h-day" className="font-display text-headline">{krDate(sel)} ({weekday(sel)})</h2>
                {sel === today && <span className="text-sm font-medium text-accent">오늘</span>}
              </div>
              <span className="text-xs text-muted tabular-nums">할 일 {dayTasks.length}개</span>
            </div>

            {/* 퇴원 당일 또는 외래 진료일 시각적 하이라이트 배너 */}
            {sel === data.input.dischargeDate && (
              <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-[#ffe9dc] p-3.5 text-[#9a3f12] shadow-card">
                <div>
                  <p className="font-semibold text-sm">퇴원 당일 · 집으로 복귀하는 날</p>
                  <p className="text-xs opacity-90 mt-0.5">원무과 보험 서류 4종 수령 및 약국 복약 지도를 꼭 챙기세요</p>
                </div>
                <span className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold">퇴원 당일</span>
              </div>
            )}

            {dayEvents.some((e) => e.kind === "visit") && (
              <div className="mt-2.5 flex items-center justify-between rounded-2xl bg-[#e3f0ff] p-3.5 text-[#1f5aa6] shadow-card">
                <div>
                  <p className="font-semibold text-sm">외래 진료 당일</p>
                  <p className="text-xs opacity-90 mt-0.5">신분증을 챙기고, 진료실에서 외래 리포트를 보여주세요</p>
                </div>
                <Link href={`${base}/report`} className="shrink-0 rounded-full bg-card px-2.5 py-1 text-xs font-semibold">외래 리포트</Link>
              </div>
            )}

            {othersInDay.length > 0 && (
              <ul className="mt-2.5 space-y-2">
                {othersInDay.map((e) => (
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

            {/* 1) 내가 해야 할 일 (최우선) */}
            {dayMine.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold text-accent">내가 할 일 ({dayMine.length})</p>
                <TaskList
                  tasks={dayMine}
                  members={data.members}
                  auth={auth}
                  meId={me}
                  today={today}
                  detailBase={`${base}/tasks`}
                  showDate={false}
                />
              </div>
            )}

            {/* 2) 아직 사람 배정이 안 된 할 일 (내가 할게 버튼) */}
            {dayNeedOwner.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold text-warn">맡을 사람이 필요해요 ({dayNeedOwner.length})</p>
                <TaskList
                  tasks={dayNeedOwner}
                  members={data.members}
                  auth={auth}
                  meId={me}
                  today={today}
                  detailBase={`${base}/tasks`}
                  showDate={false}
                />
              </div>
            )}

            {/* 3) 다른 가족이 맡은 일 */}
            {dayOthers.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-semibold text-muted">다른 가족이 맡은 일 ({dayOthers.length})</p>
                <TaskList
                  tasks={dayOthers}
                  members={data.members}
                  auth={auth}
                  meId={me}
                  today={today}
                  detailBase={`${base}/tasks`}
                  showDate={false}
                />
              </div>
            )}

            {/* 4) 이미 완료된 일 (간결한 한 줄) */}
            {dayCompleted.length > 0 && (
              <div className="mt-4">
                <p className="mb-1 text-xs font-medium text-muted">완료한 일 ({dayCompleted.length})</p>
                <TaskList
                  tasks={dayCompleted}
                  members={data.members}
                  auth={auth}
                  meId={me}
                  today={today}
                  detailBase={`${base}/tasks`}
                  showDate={false}
                />
              </div>
            )}

            {dayTasks.length === 0 && othersInDay.length === 0 && (
              <p className="mt-3 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card">
                <Mascot size={36} mood="rest" />이 날은 일정이 없어요. 쉬어가는 날이에요.
              </p>
            )}

            <details className="mt-3 rounded-xl bg-card shadow-card">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-ink">
                <span className="flex items-center gap-1.5 text-accent">
                  <Icon name="plus" size={16} />이 날에 외래 일정 또는 할 일 추가
                </span>
              </summary>
              <div className="px-4 pb-4"><AddTask auth={auth} defaultDate={sel} defaultVisit={true} plain /></div>
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
      ) : (
        /* ======================= [2. 할 일 목록 뷰 (?view=list)] ======================= */
        <>
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
            <Link href={`${base}/tasks?view=list`} className="mt-3 flex items-center justify-between rounded-xl bg-card px-4 py-2 text-sm text-accent shadow-card">
              {f === "none" ? "맡을 사람이 필요한 일만 보는 중" : "내가 맡은 일만 보는 중"}<span className="font-semibold">전체 보기</span>
            </Link>
          )}
          {open.length === 0 && <p className="mt-4 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card"><Mascot size={40} mood="cheer" />남은 일이 없어요. 수고했어요!</p>}

          {/* 셀프 케어 모드: 가족 분담 없이 하나의 깔끔한 체크리스트 */}
          {isSelfCare ? (
            <section className="mt-6" aria-label="할 일 목록">
              {head("챙길 일", activeOpen.length, "마감이 가까운 일부터 먼저 나와요")}
              {activeOpen.length > 0 ? (
                <>
                  <TaskList tasks={sort(activeOpen).slice(0, SHOW_FIRST)} {...common} />
                  {activeOpen.length > SHOW_FIRST && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {activeOpen.length - SHOW_FIRST}개 보기</summary>
                      <div className="mt-2"><TaskList tasks={sort(activeOpen).slice(SHOW_FIRST)} {...common} /></div>
                    </details>
                  )}
                </>
              ) : (
                <p className="rounded-xl bg-card p-4 text-sm text-muted shadow-card">남은 할 일이 없어요.</p>
              )}
            </section>
          ) : (
            <>
              {/* 1) 내가 맡은 일 */}
              {f !== "none" && open.length > 0 && (
                <section className="mt-6" aria-label="내가 맡은 일">
                  {head("내가 맡은 일", mine.length, mine.length ? "오늘 할 일과 앞으로 해야 할 일이에요" : undefined)}
                  {mine.length ? (
                    <>
                      <TaskList tasks={mine.slice(0, SHOW_FIRST)} {...common} />
                      {mine.length > SHOW_FIRST && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {mine.length - SHOW_FIRST}개 보기</summary>
                          <div className="mt-2"><TaskList tasks={mine.slice(SHOW_FIRST)} {...common} /></div>
                        </details>
                      )}
                    </>
                  ) : (
                    <p className="rounded-xl bg-card p-4 text-sm text-muted shadow-card">{needOwner.length ? "아직 맡은 일이 없어요. 아래에서 ‘내가 할게’를 눌러 보세요." : "맡은 일이 없어요."}</p>
                  )}
                </section>
              )}

              {/* 2) 맡을 사람이 필요한 일 */}
              {f !== "mine" && needOwner.length > 0 && (
                <section className="mt-6" aria-label="맡을 사람이 필요한 일">
                  {head("맡을 사람이 필요해요", needOwner.length, "마감이 가까운 일부터 먼저 나와요. ‘내가 할게’를 눌러보세요", "text-warn")}
                  <TaskList tasks={needOwner.slice(0, SHOW_FIRST)} {...common} />
                  {needOwner.length > SHOW_FIRST && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {needOwner.length - SHOW_FIRST}개 보기</summary>
                      <div className="mt-2"><TaskList tasks={needOwner.slice(SHOW_FIRST)} {...common} /></div>
                    </details>
                  )}
                </section>
              )}

              {/* 3) 다른 가족이 맡은 일 */}
              {f === "" && others.length > 0 && (
                <details className="mt-6">
                  <summary className="cursor-pointer font-semibold">다른 가족이 맡은 일 <span className="tabular-nums">{others.length}</span></summary>
                  <p className="mt-1 text-xs text-muted">담당을 바꾸려면 항목을 눌러 들어가세요. 바꾸면 가족에게 알려줘요.</p>
                  <div className="mt-2">
                    <TaskList tasks={others.slice(0, SHOW_FIRST)} {...common} />
                    {others.length > SHOW_FIRST && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {others.length - SHOW_FIRST}개 보기</summary>
                        <div className="mt-2"><TaskList tasks={others.slice(SHOW_FIRST)} {...common} /></div>
                      </details>
                    )}
                  </div>
                </details>
              )}
            </>
          )}

          {/* 4) 지난 일 (기한이 지난 미완료 할 일) */}
          {sortedPast.length > 0 && (
            <section className="mt-6" aria-label="기한이 지난 할 일">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-sm font-semibold text-warn">이월된 지난 일 <span className="tabular-nums">{sortedPast.length}</span></h2>
                <span className="text-xs text-muted">마감일을 오늘로 바꾸거나 확인해보세요</span>
              </div>
              <TaskList tasks={sortedPast.slice(0, SHOW_FIRST)} {...common} />
              {sortedPast.length > SHOW_FIRST && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-semibold text-accent">나머지 {sortedPast.length - SHOW_FIRST}개 보기</summary>
                  <div className="mt-2"><TaskList tasks={sortedPast.slice(SHOW_FIRST)} {...common} /></div>
                </details>
              )}
            </section>
          )}

          {/* (사용자 피드백 반영: 상단 우측에 '+ 추가' 버튼이 있으므로 스크롤 최하단 중복 추가 폼 및 끝낸 일 아코디언은 제거함) */}
        </>
      )}
      </div>
    </>
  );
}
