import Link from "next/link";
import Icon from "@/components/Icon";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { TEMP_LABEL, PAIN_WORD } from "@/lib/report";
import DailyForm from "@/components/DailyForm";
import DailyCompleteToggle from "@/components/DailyCompleteToggle";
import Mascot from "@/components/Mascot";

export const metadata = { title: "데일리 체크 · 씩씩케어" };

export default async function DailyPage(props: PageProps<"/c/[token]/daily">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const checks = await loadDaily(actor.caseId);
  const today = checks.find((c) => c.check_date === data.today) ?? null;
  const prev = checks.filter((c) => c.check_date < data.today).sort((a, b) => b.check_date.localeCompare(a.check_date))[0] ?? null;
  const qLeft = data.tasks.filter((t) => t.kind === "question" && !t.done).length;
  const isPre = !data.input.dischargeDate || data.today <= data.input.dischargeDate;
  const link = "flex flex-1 items-center justify-center rounded-full bg-card px-3 py-2.5 text-center text-sm font-medium shadow-card";

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      {data.input.dailyCompleted && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-accent-soft p-3.5 text-accent">
          <div>
            <p className="text-sm font-semibold">회복 완료 상태</p>
            <p className="text-xs opacity-90 mt-0.5">데일리 체크를 마쳤어요. 다시 기록하려면 오른쪽을 눌러주세요.</p>
          </div>
          <DailyCompleteToggle auth={auth} completed={true} variant="card" />
        </div>
      )}
      <div className="mt-2 flex items-center gap-3">
        <Mascot size={60} mood={today ? "cheer" : "idle"} />
        <div>
          <h1 className="text-title font-display">데일리 체크</h1>
          <p className="text-sm text-muted">{today ? "오늘 기록을 남겼어요. 상태가 바뀌면 언제든 고칠 수 있어요." : "환자의 오늘 복약·체온·통증을 10초 만에 남겨요"}</p>
        </div>
      </div>
      {isPre && (
        <div className="mt-3 rounded-2xl bg-accent-soft p-3.5 text-xs text-accent leading-relaxed">
          <p className="font-semibold text-ink">아직 입원 중이신가요?</p>
          <p className="mt-0.5 opacity-90">
            병원에 계실 때는 간호·의료진이 투약과 활력징후를 직접 챙겨주므로 기록하지 않으셔도 괜찮아요. 퇴원 후 집으로 돌아오신 뒤부터 매일 남겨주시면 다음 외래 진료 때 큰 도움이 됩니다. (원하시면 지금 미리 써보셔도 좋아요.)
          </p>
        </div>
      )}
      <div className="mt-4 flex gap-2">
        <Link href={`${base}/report`} className={link}>외래 리포트</Link>
        <Link href={`${base}/chat`} className={link}>서류 내용 물어보기</Link>
      </div>
      <DailyForm key={today ? "saved" : "new"} auth={auth} today={today} yesterday={prev} />
      {!data.input.dailyCompleted && (
        <div className="mt-2 text-center">
          <DailyCompleteToggle auth={auth} completed={false} variant="card" />
        </div>
      )}
      <Link href={`${base}/questions`} className="mt-3 flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-card">
        <span>기록하다 의료진에게 물어볼 게 떠올랐나요?<span className="block text-xs text-muted">{qLeft ? `적어 둔 질문 ${qLeft}개 · 외래 리포트에도 나와요` : "적어 두면 외래 리포트에도 나와요"}</span></span>
        <Icon name="right" size={18} className="text-muted" />
      </Link>

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
        {!data.isSelfCare && <p className="mt-2 text-sm text-muted">가족 초대 링크로 들어온 가족이나 환자 본인도 자기 화면에서 기록할 수 있어요.</p>}
      </section>
    </>
  );
}
