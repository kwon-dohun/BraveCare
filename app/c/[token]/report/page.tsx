import Link from "next/link";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { summarize, speakScript, askForm, feverText, pickVisitQuestions, BOWEL_LABEL } from "@/lib/report";
import { dayDiff } from "@/lib/benefits";
import { REASON_LABEL } from "@/lib/options";
import { krDateYear } from "@/lib/format";
import AddQuestion from "./AddQuestion";
import DoctorView from "./DoctorView";
import PainTrend from "./PainTrend";
import QuestionAnswer from "@/components/QuestionAnswer";

export const metadata = { title: "외래 리포트 · 씩씩케어" };

// 진료실에서 의료진에게 보여주거나 보호자가 점검하는 1장 요약 리포트. 모바일 세로/가로 회전 시에도 일그러짐 없이 반응형으로 표시된다.
export default async function Report(props: PageProps<"/c/[token]/report">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const checks = await loadDaily(actor.caseId);
  const first = checks.at(-1)?.check_date;
  const s = summarize(checks, data.input.dischargeDate && first && data.input.dischargeDate < first ? data.input.dischargeDate : first ?? data.today, data.today);
  const asked = data.tasks.filter((t) => t.kind === "question" && !t.done);
  const allAsked = asked.length;
  const questions = pickVisitQuestions(data.tasks);

  const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;
  const dc = data.input.dischargeDate;
  const elapsed = dc ? dayDiff(data.today, dc) : null;
  const age = Number(data.today.slice(0, 4)) - data.input.birthYear;
  const flags = [
    ...s.fevers.map((f) => `${md(f.date)} ${feverText(f)}`),
    ...s.wounds.map((d) => `${md(d)} 수술 부위 진물·벌어짐`),
    ...s.sideEffects.map((d) => `${md(d)} 약 먹고 불편함`),
    ...s.bowel.map((b) => `${md(b.date)} 배변 ${BOWEL_LABEL[b.bowel]}`),
    ...s.pain.filter((p) => p.pain >= 7).map((p) => `${md(p.date)} 통증 ${p.pain}점 (0~10점)`),
  ];
  const notes = checks.filter((c) => c.notes).slice(0, 5);
  const box = "rounded-2xl border border-line bg-card p-4 shadow-card";
  const heard = data.tasks.filter((t) => t.kind === "question" && t.done && t.memo).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 5);

  // 진료실에서 가장 먼저 쓰는 칸: 물어볼 것마다 들은 답을 바로 적는다
  const askBlock = (
    <section className={box} aria-labelledby="r-ask">
      <h2 id="r-ask" className="font-semibold text-ink">의료진에게 여쭤볼 것</h2>
      {questions.length ? (
        <ol className="mt-2 list-decimal space-y-3 pl-5 text-sm">
          {questions.map((q) => <li key={q.id} className="text-ink">{q.title}<QuestionAnswer auth={auth} task={q} /></li>)}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-muted">아직 적어둔 질문이 없어요. 아래에서 바로 추가할 수 있어요.</p>
      )}
      <div className="mt-3"><AddQuestion auth={auth} /></div>
      <Link href={`${base}/questions`} className="mt-2.5 inline-block text-xs text-accent underline">
        전체 질문 목록 보기{allAsked > questions.length ? ` (${allAsked}개)` : ""}
      </Link>
    </section>
  );

  return (
    <div className="text-ink">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between print:hidden">
          <BackLink href={`${base}/daily`}>데일리 체크</BackLink>
          {s.days > 0 && (
            <DoctorView auth={auth} questions={questions.map((q) => ({ id: q.id, text: askForm(q.title) }))} visitTitle={data.tasks.find((t) => t.kind === "schedule" && t.due_date === data.today)?.title ?? "외래 진료"} scanHref={`${base}/scan`} today={data.today}>
              <div className="mx-auto max-w-5xl pt-10">
                <h1 className="pr-24 text-3xl font-bold">
                  {REASON_LABEL.find(([k]) => k === data.input.reason)?.[1]} · {data.input.birthYear}년생 (만 {age}세 전후)
                  {elapsed !== null && elapsed >= 0 ? ` · 퇴원 D+${elapsed}` : ""}
                </h1>
                <div className="mt-6 grid gap-8 landscape:grid-cols-2">
                  <div className="space-y-6">
                    {flags.length ? (
                      <div className="rounded-lg border-4 border-black p-4">
                        <h2 className="text-2xl font-bold">특이 징후</h2>
                        <ul className="mt-2 space-y-1 text-2xl font-semibold leading-snug">{flags.map((f) => <li key={f}>• {f}</li>)}</ul>
                      </div>
                    ) : (
                      <p className="text-2xl font-semibold">특이 징후 없음 <span className="text-lg font-normal">(발열·수술 부위·약 불편·배변 모두 정상)</span></p>
                    )}
                    <div>
                      <h2 className="text-xl font-bold">통증 추이 <span className="text-base font-normal">(0~10점)</span></h2>
                      <div className="mt-1 text-black"><PainTrend points={s.pain} /></div>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">처방약 복용</h2>
                      <p className="mt-1 text-xl leading-snug">
                        {s.missed.length ? `기록한 ${s.days}일 중 거른 때: ${s.missed.map((m) => `${md(m.date)} ${m.slots.join("·")}`).join(", ")}` : `기록한 ${s.days}일 모두 복용`}
                        {" · "}복용 후 불편 {s.sideEffects.length ? s.sideEffects.map(md).join(", ") : "없음"}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold">환자·보호자가 여쭙고 싶은 것</h2>
                      {questions.length ? (
                        <ol className="mt-3 list-decimal space-y-3 pl-7 text-2xl leading-snug">
                          {questions.map((q) => <li key={q.id}>{askForm(q.title)}</li>)}
                        </ol>
                      ) : <p className="mt-3 text-xl">적어 온 질문이 없어요.</p>}
                    </div>
                    {notes.length > 0 && (
                      <div>
                        <h2 className="text-xl font-bold">환자·보호자 메모</h2>
                        <ul className="mt-2 space-y-1 text-xl leading-snug">{notes.map((c) => <li key={c.check_date}>• {md(c.check_date)} {c.notes}</li>)}</ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DoctorView>
          )}
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

            {askBlock}
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {/* 진료실에서 읽어도 되는 말하기 요약 */}
            <section className="rounded-2xl bg-accent-soft p-4" aria-labelledby="r0">
              <h2 id="r0" className="font-semibold text-accent">진료실에서 이렇게 말해 보세요</h2>
              <p className="mt-1.5 text-callout leading-relaxed text-ink">{speakScript(s, elapsed)}</p>
            </section>

            {askBlock}

            {heard.length > 0 && (
              <section className={box} aria-labelledby="r-heard">
                <h2 id="r-heard" className="font-semibold text-ink">들은 답 기록</h2>
                <ul className="mt-2 divide-y divide-line/60 text-sm">
                  {heard.map((q) => (
                    <li key={q.id} className="py-2">
                      <p className="text-muted">{q.title}</p>
                      <QuestionAnswer auth={auth} task={q} />
                    </li>
                  ))}
                </ul>
              </section>
            )}

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
              <div className="mt-2 text-accent"><PainTrend points={s.pain} /></div>
            </section>

            {/* 3. 체온·상처·배변 */}
            <section className={box} aria-labelledby="r3">
              <h2 id="r3" className="font-semibold text-ink">체온 · 상처 부위 · 배변</h2>
              <ul className="mt-2 divide-y divide-line/60 text-sm">
                <li className="flex justify-between gap-4 py-2">
                  <span className="text-muted">발열 여부</span>
                  <span className={s.fevers.length ? "font-semibold text-warn" : "text-ink"}>
                    {s.fevers.length ? s.fevers.map((f) => `${md(f.date)} ${feverText(f)}`).join(", ") : "기록일 정상 체온"}
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

            {/* 보호자 특이사항 메모 */}
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
