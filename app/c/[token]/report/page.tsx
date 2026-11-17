import Link from "next/link";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { summarize, TEMP_LABEL, BOWEL_LABEL } from "@/lib/report";
import { REASON_LABEL } from "@/lib/options";
import { krDateYear } from "@/lib/format";
import AddQuestion from "./AddQuestion";
import Bright from "@/components/Bright";

export const metadata = { title: "외래 리포트 · 씩씩케어" };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

// 진료실에서 의료진에게 보여주거나 보호자가 점검하는 1장 요약 리포트. 모바일 세로/가로 회전 시에도 일그러짐 없이 반응형으로 표시된다.
export default async function Report(props: PageProps<"/c/[token]/report">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const checks = await loadDaily(actor.caseId);
  const first = checks.at(-1)?.check_date;
  const s = summarize(checks, data.input.dischargeDate && first && data.input.dischargeDate < first ? data.input.dischargeDate : first ?? data.today, data.today);
  const asked = data.tasks.filter((t) => t.kind === "question" && !t.done);
  const allAsked = asked.length;
  const questions = [...asked.filter((t) => t.source === "manual"), ...asked.filter((t) => t.source !== "manual" && (t.rel_day ?? 0) > 0)].slice(0, 5);

  // 통증 추이: 0~10점을 그대로 찍는다
  const W = 320, H = 130, L = 28, B = 22;
  const x = (i: number) => L + (s.pain.length === 1 ? (W - L - 8) / 2 : (i * (W - L - 8)) / (s.pain.length - 1));
  const y = (p: number) => 8 + ((10 - p) * (H - B - 8)) / 10;
  const box = "rounded-2xl border border-line bg-card p-4 shadow-card";

  return (
    <div className="text-ink">
      <Bright />
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between print:hidden">
          <BackLink href={`${base}/daily`}>데일리 체크</BackLink>
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
            진료실 공유용 리포트
          </span>
        </div>

        <div className="mt-3">
          <h1 className="text-title font-display">퇴원 후 경과 요약 (외래 리포트)</h1>
          <p className="mt-1 text-sm text-muted leading-relaxed">
            {REASON_LABEL.find(([k]) => k === data.input.reason)?.[1]} · {data.input.birthYear}년생
            {data.input.dischargeDate ? ` · ${krDateYear(data.input.dischargeDate)} 퇴원` : ""}
          </p>
          {checks.length > 0 && (
            <p className="text-sm text-muted">
              기록 {checks.length}일
              {!data.isSelfCare && checks.some((c) => c.source_role === "patient") ? ` · 환자 직접 ${checks.filter((c) => c.source_role === "patient").length}일` : ""}
              {!data.isSelfCare && checks.some((c) => c.source_role !== "patient") ? ` · 가족 ${checks.filter((c) => c.source_role !== "patient").length}일` : ""}
            </p>
          )}
        </div>

        {s.days === 0 ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-line bg-card p-5 shadow-card text-center">
              <p className="font-semibold text-ink">아직 데일리 체크 기록이 없어요.</p>
              <p className="mt-1 text-sm text-muted">퇴원 후 상태를 하루만 기록해도 의사에게 보여줄 요약 리포트가 완성돼요.</p>
              <Link href={`${base}/daily`} className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-ink shadow-sm hover:opacity-90">
                오늘 데일리 체크 남기기
              </Link>
            </div>

            <section className={box} aria-labelledby="r-ask">
              <h2 id="r-ask" className="font-semibold text-ink">여쭤보고 싶은 것</h2>
              {questions.length ? (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                  {questions.map((q) => <li key={q.id}>{q.title}</li>)}
                </ol>
              ) : (
                <p className="mt-2 text-sm text-muted">아직 적어둔 질문이 없어요. 아래에서 바로 추가할 수 있어요.</p>
              )}
              <div className="mt-3"><AddQuestion auth={auth} /></div>
              <Link href={`${base}/questions`} className="mt-2.5 inline-block text-xs text-accent underline">
                전체 질문 목록 보기{allAsked > questions.length ? ` (${allAsked}개)` : ""}
              </Link>
            </section>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* 1. 약 복용 */}
            <section className={box} aria-labelledby="r1">
              <div className="flex items-center justify-between">
                <h2 id="r1" className="font-semibold text-ink">약 복용 이행률</h2>
                <span className="text-xs text-muted">{s.days}일 기록</span>
              </div>
              <p className="mt-1 whitespace-nowrap text-display font-display text-accent">{s.adherence}%</p>
              <p className="text-sm text-muted">퇴원 후 {s.span}일 중 기록한 날 기준이에요</p>
              {s.sideEffects.length > 0 ? (
                <p className="mt-2 text-sm text-warn font-medium">약 먹고 불편했던 날: {s.sideEffects.map(md).join(", ")}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">기록한 날 중 약 먹고 불편했던 날 없음</p>
              )}
            </section>

            {/* 2. 통증 추이 */}
            <section className={box} aria-labelledby="r2">
              <div className="flex items-center justify-between">
                <h2 id="r2" className="font-semibold text-ink">통증 추이 (0~10점)</h2>
                {s.avgPain !== null && (
                  <span className="text-sm text-muted">평균 <b className="text-ink font-semibold">{s.avgPain}</b>점 · 최대 {s.maxPain}점</span>
                )}
              </div>
              {s.avgPain === null ? (
                <p className="mt-2 text-sm text-muted">기록 3일 미만: {s.pain.map((p) => `${md(p.date)} (${p.pain}점)`).join(", ")}</p>
              ) : (
                <div className="mt-2">
                  <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`통증 추이 그래프`} className="mx-auto w-full max-w-sm h-auto">
                    {[0, 5, 10].map((v) => (
                      <g key={v}>
                        <line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke="#e0e8e4" strokeWidth="1" strokeDasharray={v ? "3 3" : undefined} />
                        <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#607369">{v}</text>
                      </g>
                    ))}
                    <polyline fill="none" stroke="#2c9670" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={s.pain.map((p, i) => `${x(i)},${y(p.pain)}`).join(" ")} />
                    {s.pain.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.pain)} r="3.5" fill="#1b5e46" />)}
                    <text x={L} y={H - 4} fontSize="10" fill="#607369">{md(s.pain[0].date)}</text>
                    {s.pain.length > 1 && <text x={W - 4} y={H - 4} fontSize="10" textAnchor="end" fill="#607369">{md(s.pain.at(-1)!.date)}</text>}
                  </svg>
                </div>
              )}
            </section>

            {/* 3. 체온·상처·배변 */}
            <section className={box} aria-labelledby="r3">
              <h2 id="r3" className="font-semibold text-ink">체온 · 상처 부위 · 배변</h2>
              <ul className="mt-2 divide-y divide-line/60 text-sm">
                <li className="flex justify-between gap-4 py-2">
                  <span className="text-muted">발열 여부</span>
                  <span className={s.fevers.length ? "font-semibold text-warn" : "text-ink"}>
                    {s.fevers.length ? s.fevers.map((f) => `${md(f.date)} ${TEMP_LABEL[f.temp]}`).join(", ") : "기록일 정상 체온"}
                  </span>
                </li>
                <li className="flex justify-between gap-4 py-2">
                  <span className="text-muted">수술 부위 진물·벌어짐</span>
                  <span className={s.wounds.length ? "font-semibold text-warn" : "text-ink"}>
                    {s.wounds.length ? `${s.wounds.map(md).join(", ")} 확인됨` : "이상 없음"}
                  </span>
                </li>
                <li className="flex justify-between gap-4 py-2">
                  <span className="text-muted">배변 상태</span>
                  <span className="text-ink">
                    {s.bowel.length ? s.bowel.map((b) => `${md(b.date)} ${BOWEL_LABEL[b.bowel]}`).join(", ") : "이상 없음"}
                  </span>
                </li>
              </ul>
            </section>

            {/* 4. 의사에게 여쭤볼 것 */}
            <section className={box} aria-labelledby="r4">
              <div className="flex items-center justify-between">
                <h2 id="r4" className="font-semibold text-ink">의료진에게 여쭤볼 것</h2>
                <Link href={`${base}/questions`} className="text-xs text-accent underline">
                  전체 ({allAsked})
                </Link>
              </div>
              {questions.length ? (
                <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm">
                  {questions.map((q) => <li key={q.id} className="text-ink">{q.title}</li>)}
                </ol>
              ) : (
                <p className="mt-2 text-xs text-muted">아직 적어둔 질문이 없어요. 아래에서 바로 추가할 수 있어요.</p>
              )}
              <div className="mt-3"><AddQuestion auth={auth} /></div>
            </section>

            {/* 5. 보호자 특이사항 메모 (전체 폭) */}
            {checks.some((c) => c.notes) && (
              <section className={box} aria-labelledby="r5">
                <h2 id="r5" className="font-semibold text-ink">날짜별 메모</h2>
                <ul className="mt-2 space-y-2 text-sm">
                  {checks.filter((c) => c.notes).slice(0, 5).map((c) => (
                    <li key={c.check_date} className="rounded-xl bg-background p-3">
                      <span className="font-semibold text-accent">{md(c.check_date)}: </span>
                      <span className="text-ink">{c.notes}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
