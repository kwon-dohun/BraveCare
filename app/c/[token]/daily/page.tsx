import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { TEMP_LABEL, PAIN_WORD } from "@/lib/report";
import DailyForm from "@/components/DailyForm";
import Mascot from "@/components/Mascot";

export const metadata = { title: "기록 · 씩씩케어" };

export default async function DailyPage(props: PageProps<"/c/[token]/daily">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const checks = await loadDaily(actor.caseId);
  const today = checks.find((c) => c.check_date === data.today) ?? null;
  const link = "flex flex-1 items-center justify-center rounded-full bg-card px-3 py-2.5 text-center text-sm font-medium shadow-card";

  return (
    <>
      <div className="flex items-center gap-3">
        <Mascot size={60} mood={today ? "cheer" : "idle"} />
        <div>
          <h1 className="text-2xl">저녁 안부 체크</h1>
          <p className="text-sm text-muted">{today ? "오늘 기록을 남겼어요. 고마워요!" : "환자와 오늘 하루를 10초 만에 남겨요"}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Link href={`${base}/report`} className={link}>외래 리포트</Link>
        <Link href={`${base}/chat`} className={link}>서류 내용 물어보기</Link>
      </div>
      <DailyForm key={today ? "saved" : "new"} auth={auth} today={today} />

      <section className="mt-8" aria-labelledby="dh">
        <h2 id="dh" className="font-semibold">지난 기록 ({checks.length}일)</h2>
        {checks.length === 0 ? (
          <p className="mt-2 rounded-xl bg-card shadow-card p-4 text-muted">아직 기록이 없어요. 하루만 남겨도 외래 리포트가 만들어져요.</p>
        ) : (
          <ul className="mt-2 divide-y divide-line rounded-xl bg-card shadow-card">
            {checks.slice(0, 14).map((c) => (
              <li key={c.check_date} className="px-4 py-3 text-sm">
                <span className="font-medium">{Number(c.check_date.slice(5, 7))}/{Number(c.check_date.slice(8))}</span>
                {" · "}약 {+c.med_morning + +c.med_lunch + +c.med_dinner}/3 · 체온 {TEMP_LABEL[c.temp]} · 통증 {c.pain}점({PAIN_WORD(c.pain)})
                {c.side_effect ? " · 약 불편함" : ""}{c.wound_issue ? " · 수술 부위 이상" : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-sm text-muted">가족 초대 링크로 들어온 가족이나 환자 본인도 자기 화면에서 기록할 수 있어요.</p>
      </section>
    </>
  );
}
