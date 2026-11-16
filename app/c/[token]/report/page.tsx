import Link from "next/link";
import { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { summarize, TEMP_LABEL, BOWEL_LABEL } from "@/lib/report";
import { REASON_LABEL } from "@/lib/options";
import AddQuestion from "./AddQuestion";
import Bright from "@/components/Bright";

export const metadata = { title: "외래 리포트 · 씩씩케어" };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

// 진료실에서 휴대폰을 가로로 돌려 의료진에게 보여주는 한 장. 화면 전체를 덮고, 가로일 때 글자를 더 키운다.
export default async function Report(props: PageProps<"/c/[token]/report">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const checks = await loadDaily(actor.caseId);
  const first = checks.at(-1)?.check_date;
  const s = summarize(checks, data.input.dischargeDate && first && data.input.dischargeDate < first ? data.input.dischargeDate : first ?? data.today, data.today);
  const asked = data.tasks.filter((t) => t.kind === "question" && !t.done);
  const allAsked = asked.length;
  const questions = [...asked.filter((t) => t.source === "manual"), ...asked.filter((t) => t.source !== "manual" && (t.rel_day ?? 0) > 0)].slice(0, 3);

  // 통증 추이: 0~10점을 그대로 찍는다
  const W = 320, H = 130, L = 28, B = 22;
  const x = (i: number) => L + (s.pain.length === 1 ? (W - L - 8) / 2 : (i * (W - L - 8)) / (s.pain.length - 1));
  const y = (p: number) => 8 + ((10 - p) * (H - B - 8)) / 10;
  const box = "rounded-xl border-2 border-foreground p-4";

  return (
    <div className="fixed inset-0 z-20 overflow-auto bg-white p-5 text-headline text-black landscape:text-xl">
      <Bright />
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between print:hidden">
          <BackLink href={`${base}/daily`}>닫기</BackLink>
          <p className="text-base text-muted portrait:block landscape:hidden">휴대폰을 가로로 돌리면 크게 보여요</p>
        </div>
        <h1 className="mt-2 text-2xl font-semibold landscape:text-3xl">퇴원 후 경과 요약</h1>
        <p className="text-base text-muted">
          {REASON_LABEL.find(([k]) => k === data.input.reason)?.[1]} · {data.input.birthYear}년생
          {data.input.dischargeDate ? ` · 퇴원 ${data.input.dischargeDate}` : ""} · 보호자가 기록한 내용이에요
        </p>

        {s.days === 0 ? (
          <>
          <div className="mt-6 rounded-xl border border-line p-5">
            <p>아직 기록이 없어요. 데일리 체크를 하루만 남겨도 이 리포트가 만들어져요.</p>
            <Link href={`${base}/daily`} className="mt-4 flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-ink">오늘 데일리 체크 남기기</Link>
          </div>
          <div className="mt-4 grid gap-4 landscape:grid-cols-2">
            <section className={box} aria-labelledby="r4">
              <h2 id="r4" className="font-semibold">여쭤보고 싶은 것</h2>
              {questions.length
                ? <ol className="mt-1 list-decimal space-y-1 pl-6">{questions.map((q) => <li key={q.id}>{q.title}</li>)}</ol>
                : <p className="mt-1 text-base text-muted">아직 적어둔 질문이 없어요.</p>}
              <AddQuestion auth={auth} />
              <Link href={`${base}/questions`} className="mt-2 inline-block text-base text-muted underline print:hidden landscape:hidden">전체 질문 보기{allAsked > questions.length ? ` (${allAsked}개)` : ""}</Link>
            </section>
          </div>
          </>
        ) : (
          <div className="mt-4 grid gap-4 landscape:grid-cols-2">
            <section className={box} aria-labelledby="r1">
              <h2 id="r1" className="font-semibold">약 복용</h2>
              <p className="mt-1 text-4xl font-semibold landscape:text-5xl">{s.adherence}%</p>
              <p className="text-base">기록한 {s.days}일 기준 (전체 {s.span}일 중 {s.days}일 기록)</p>
              {s.sideEffects.length > 0 && <p className="mt-2 font-semibold">약 먹고 불편했던 날: {s.sideEffects.map(md).join(", ")}</p>}
            </section>

            <section className={box} aria-labelledby="r2">
              <h2 id="r2" className="font-semibold">통증 (0~10점)</h2>
              {s.avgPain === null
                ? <p className="mt-1 text-base">기록이 3일 미만이라 평균 대신 날짜별 점수를 보여드려요: {s.pain.map((p) => `${md(p.date)} ${p.pain}점`).join(", ")}</p>
                : <p className="mt-1">평균 <b className="text-3xl">{s.avgPain}</b>점 · 가장 아팠던 날 {s.maxPain}점</p>}
              <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`통증 추이: ${s.pain.map((p) => `${md(p.date)} ${p.pain}점`).join(", ")}`} className="mt-2 w-full">
                {[0, 5, 10].map((v) => (
                  <g key={v}>
                    <line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke="#bbb" strokeWidth="1" strokeDasharray={v ? "3 3" : undefined} />
                    <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="11">{v}</text>
                  </g>
                ))}
                <polyline fill="none" stroke="#000" strokeWidth="2.5" points={s.pain.map((p, i) => `${x(i)},${y(p.pain)}`).join(" ")} />
                {s.pain.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.pain)} r="3.5" />)}
                <text x={L} y={H - 4} fontSize="11">{md(s.pain[0].date)}</text>
                {s.pain.length > 1 && <text x={W - 4} y={H - 4} fontSize="11" textAnchor="end">{md(s.pain.at(-1)!.date)}</text>}
              </svg>
            </section>

            <section className={box} aria-labelledby="r3">
              <h2 id="r3" className="font-semibold">열·수술 부위·배변</h2>
              <ul className="mt-1 space-y-1">
                <li>열: {s.fevers.length ? s.fevers.map((f) => `${md(f.date)} ${TEMP_LABEL[f.temp]}`).join(", ") : "기록한 날은 모두 정상"}</li>
                <li>수술 부위 진물·벌어짐: {s.wounds.length ? s.wounds.map(md).join(", ") : "없음"}</li>
                <li>배변 불편: {s.bowel.length ? s.bowel.map((b) => `${md(b.date)} ${BOWEL_LABEL[b.bowel]}`).join(", ") : "없음"}</li>
              </ul>
            </section>

            <section className={box} aria-labelledby="r4">
              <h2 id="r4" className="font-semibold">여쭤보고 싶은 것</h2>
              {questions.length
                ? <ol className="mt-1 list-decimal space-y-1 pl-6">{questions.map((q) => <li key={q.id}>{q.title}</li>)}</ol>
                : <p className="mt-1 text-base text-muted">아직 적어둔 질문이 없어요.</p>}
              <AddQuestion auth={auth} />
              <Link href={`${base}/questions`} className="mt-2 inline-block text-base text-muted underline print:hidden landscape:hidden">전체 질문 보기{allAsked > questions.length ? ` (${allAsked}개)` : ""}</Link>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
