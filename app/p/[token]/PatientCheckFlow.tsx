"use client";
import { useState, useTransition, useSyncExternalStore } from "react";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import { submitPatientDailyCheck, type PatientDailyInput } from "@/app/patient-actions";
import type { Daily } from "@/lib/report";

type Temp = PatientDailyInput["temp"];
type Bowel = PatientDailyInput["bowel"];
// 통증은 세 단계로만 묻고, 가족 기록(0~10점)과 같은 축에 맞춰 저장한다
const PAIN: [number, string, string][] = [[1, "괜찮아요", "거의 안 아파요"], [4, "조금 아파요", "참을 만해요"], [8, "많이 아파요", "참기 힘들어요"]];
const painStep = (p: number) => (p <= 2 ? 1 : p <= 6 ? 4 : 8);

// 질문은 한 화면에 하나씩. 0 약 · 1 열 · 2 수술 부위 · 3 통증 · 4 화장실 · 5 마무리(메모와 보내기)
const TITLES = ["약은 언제 드셨어요?", "열이 있으세요?", "수술 부위는 어떠세요?", "지금 통증은 어느 정도예요?", "오늘 화장실은 편하셨어요?"];
const LAST = 5;

// 환자 본인이 링크 하나로 남기는 오늘 안부. 고령 사용자 전제라 글자는 18px 이상, 버튼은 80px 높이로 크게 쓴다.
// 미리 골라 둔 답이 없어서, 누르지 않은 항목은 보내지 않는다.
export default function PatientCheckFlow({ patientToken, todayStr, initialDaily }: { patientToken: string; todayStr: string; initialDaily: Daily | null }) {
  const d = initialDaily;
  const [step, setStep] = useState<number | null>(null); // null = 첫 화면
  const [meds, setMeds] = useState({ m: d?.med_morning ?? false, l: d?.med_lunch ?? false, n: d?.med_dinner ?? false });
  const [temp, setTemp] = useState<Temp>(d?.temp ?? "normal");
  const [tc] = useState(d?.temp_c != null ? String(d.temp_c) : ""); // 체온 숫자는 이제 묻지 않고, 이미 보낸 값만 이어 둔다
  const [wound, setWound] = useState(d?.wound_issue ?? false);
  const [pain, setPain] = useState<number | null>(d ? painStep(d.pain) : null);
  const [bowel, setBowel] = useState<Bowel | null>(d?.bowel ?? null);
  const [note, setNote] = useState(d?.notes ?? "");
  const [sent, setSent] = useState(!!d);
  const [call, setCall] = useState(false);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const kakao = useSyncExternalStore(() => () => {}, () => /kakaotalk/i.test(navigator.userAgent), () => false);

  const send = (v: PatientDailyInput) => {
    setErr("");
    start(async () => {
      try { await submitPatientDailyCheck(patientToken, v); setSent(true); setStep(null); }
      catch (e) { setErr(e instanceof Error ? e.message : "보내지 못했어요. 다시 눌러 주세요"); }
    });
  };
  const allGood = () => {
    setMeds({ m: true, l: true, n: true }); setTemp("normal"); setWound(false); setPain(1); setBowel("good");
    send({ med_morning: true, med_lunch: true, med_dinner: true, temp: "normal", wound_issue: false, pain: 1, bowel: "good", notes: note });
  };
  const ready = pain !== null && bowel !== null;
  const submit = () => {
    if (!ready) return;
    send({
      med_morning: meds.m, med_lunch: meds.l, med_dinner: meds.n,
      temp, temp_c: temp === "normal" ? "" : tc, wound_issue: wound,
      pain: pain!, bowel: bowel!, notes: note,
    });
  };

  const next = () => setStep((s) => (s === null ? 0 : s + 1));
  const back = () => setStep((s) => (s === null || s === 0 ? null : s - 1));

  // 불편하다고 답한 것만 모아 보여 준다. 없으면 모두 괜찮은 것
  const issues = [
    [["아침", meds.m], ["점심", meds.l], ["저녁", meds.n]].filter(([, on]) => !on).length
      ? `약 안 드신 때: ${[["아침", meds.m], ["점심", meds.l], ["저녁", meds.n]].filter(([, on]) => !on).map(([l]) => l).join("·")}` : "",
    temp === "high" ? "고열" : temp === "mild" ? "미열" : "",
    wound ? "수술 부위 불편" : "",
    pain !== null && pain >= 4 ? `통증: ${PAIN.find(([v]) => v === pain)?.[1]}` : "",
    bowel === "constipation" ? "변비" : bowel === "diarrhea" ? "설사" : "",
  ].filter(Boolean);

  const big = (on: boolean, tone: "ok" | "warn" = "ok") =>
    `flex min-h-20 w-full flex-col items-center justify-center rounded-2xl px-5 py-3 text-2xl font-semibold leading-tight transition-colors ${
      on ? (tone === "warn" ? "bg-warn-soft text-warn ring-2 ring-warn" : "bg-accent-soft text-accent ring-2 ring-primary") : "bg-card text-ink shadow-card"
    }`;
  const sub = "mt-1 text-lg font-normal opacity-80";
  const primary = "flex min-h-20 w-full items-center justify-center rounded-full bg-primary px-5 text-2xl font-semibold text-ink disabled:opacity-40";
  const ghost = "flex min-h-16 w-full items-center justify-center rounded-full bg-accent-soft px-5 text-xl font-semibold text-accent";

  const question = (n: number) => {
    switch (n) {
      case 0: return (
        <>
          {([["m", "아침"], ["l", "점심"], ["n", "저녁"]] as const).map(([k, l]) => (
            <button key={k} type="button" aria-pressed={meds[k]} onClick={() => setMeds((s) => ({ ...s, [k]: !s[k] }))} className={big(meds[k])}>
              <span className="flex items-center gap-2">{meds[k] && <Icon name="check" size={28} />}{l} 약 먹었어요</span>
            </button>
          ))}
          <button type="button" onClick={next} className={primary}>다음</button>
        </>
      );
      case 1: return (
        <>
          <button type="button" onClick={() => { setTemp("normal"); next(); }} className={big(temp === "normal")}>열 없어요</button>
          {([["mild", "미열", "37.5도 이상"], ["high", "고열", "38도 이상"]] as const).map(([v, l, s]) => (
            <button key={v} type="button" onClick={() => { setTemp(v); next(); }} className={big(temp === v, "warn")}>{l}<span className={sub}>{s}</span></button>
          ))}
        </>
      );
      case 2: return (
        <>
          <button type="button" onClick={() => { setWound(false); next(); }} className={big(!wound)}>괜찮아요</button>
          <button type="button" onClick={() => { setWound(true); next(); }} className={big(wound, "warn")}>붓거나 진물이 나요</button>
        </>
      );
      case 3: return (
        <>
          {PAIN.map(([v, l, s]) => (
            <button key={v} type="button" onClick={() => { setPain(v); next(); }} className={big(pain === v, v === 8 ? "warn" : "ok")}>{l}<span className={sub}>{s}</span></button>
          ))}
        </>
      );
      default: return (
        <>
          {([["good", "편했어요"], ["constipation", "변비가 있어요"], ["diarrhea", "설사가 있어요"]] as const).map(([v, l]) => (
            <button key={v} type="button" onClick={() => { setBowel(v); next(); }} className={big(bowel === v, v === "good" ? "ok" : "warn")}>{l}</button>
          ))}
        </>
      );
    }
  };

  return (
    <div className="mx-auto max-w-md px-5 pb-12 pt-8">
      {sent ? (
        <section className="view-in text-center">
          <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-accent-soft text-accent"><Icon name="check" size={56} /></span>
          <h1 className="mt-5 text-3xl font-display">가족에게 전했어요</h1>
          <p className="mt-3 text-xl">{issues.length ? issues.join(" · ") : "오늘은 모두 괜찮다고 전했어요"}</p>
          {note && <p className="mt-2 text-lg text-muted">메모: {note}</p>}
          <p className="mt-3 text-xl text-muted">오늘도 푹 쉬세요.</p>
          <button type="button" onClick={() => setSent(false)} className={`${ghost} mt-8`}>다시 고쳐서 보내기</button>
        </section>
      ) : step === null ? (
        <section className="view-in">
          <header className="text-center">
            <Mascot size={80} mood="idle" className="mx-auto" />
            <h1 className="mt-4 text-3xl font-display">오늘 몸은 좀 어떠세요?</h1>
            <p className="mt-2 text-xl text-muted">{todayStr}</p>
            {kakao && <p className="mt-4 rounded-xl bg-card px-4 py-3 text-lg text-muted shadow-card">카톡 채팅방에서 이 링크를 길게 눌러 &lsquo;공지&rsquo;로 올려 두면 매일 찾기 쉬워요.</p>}
          </header>
          {err && <p role="alert" className="mt-6 rounded-xl bg-warn-soft p-4 text-xl font-semibold text-warn">{err}</p>}
          <div className="mt-8 space-y-4">
            <button type="button" disabled={pending} onClick={allGood} className={`${primary} min-h-24 text-3xl`}>
              {pending ? "보내는 중…" : "다 괜찮아요"}
            </button>
            <button type="button" disabled={pending} onClick={next} className={ghost}>불편한 곳이 있어요</button>
          </div>
        </section>
      ) : (
        <section className="view-in">
          <div className="flex items-center justify-between">
            <button type="button" onClick={back} className="-ml-2 flex min-h-16 items-center gap-1 px-2 text-xl font-semibold text-muted"><Icon name="left" size={28} />이전</button>
            <p className="text-xl font-semibold text-muted tabular-nums">{step < LAST ? `${step + 1} / ${LAST}` : "마지막이에요"}</p>
          </div>
          <div className="mt-1 flex gap-1.5" aria-hidden>
            {Array.from({ length: LAST }, (_, i) => <span key={i} className={`h-2 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} />)}
          </div>
          <h1 className="mt-6 text-3xl font-display leading-snug">{step < LAST ? TITLES[step] : "이대로 보낼까요?"}</h1>
          {err && <p role="alert" className="mt-4 rounded-xl bg-warn-soft p-4 text-xl font-semibold text-warn">{err}</p>}
          <div className="mt-6 space-y-3">
            {step < LAST ? question(step) : (
              <>
                <p className="rounded-2xl bg-card p-5 text-xl shadow-card">{issues.length ? issues.join(" · ") : "모두 괜찮아요"}</p>
                <label htmlFor="pmemo" className="block pt-2 text-xl font-semibold">가족에게 남길 말 <span className="font-normal text-muted">(없어도 돼요)</span></label>
                <input id="pmemo" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 점심에 죽 한 그릇 다 먹었어" className="min-h-16 w-full rounded-2xl border border-line bg-card px-4 text-xl!" />
                <button type="button" disabled={pending || !ready} onClick={submit} className={`${primary} mt-2`}>
                  {pending ? "보내는 중…" : "가족에게 보내기"}
                </button>
              </>
            )}
          </div>
        </section>
      )}

      <footer className="mt-12 text-center">
        {call ? (
          <div className="view-in space-y-3 rounded-2xl bg-warn-soft p-5">
            <p className="text-xl font-semibold text-warn">119에 전화할까요?</p>
            <a href="tel:119" className="flex min-h-16 w-full items-center justify-center gap-2 rounded-full bg-warn px-5 text-xl font-semibold text-white"><Icon name="phone" size={24} />119에 전화하기</a>
            <button type="button" onClick={() => setCall(false)} className="flex min-h-16 w-full items-center justify-center rounded-full bg-card px-5 text-xl font-semibold text-ink">아니에요</button>
          </div>
        ) : (
          <button type="button" onClick={() => setCall(true)} className="flex min-h-16 w-full items-center justify-center gap-2 rounded-full bg-warn px-5 text-xl font-semibold text-white">
            <Icon name="phone" size={24} />숨이 차거나 많이 아프면 119
          </button>
        )}
        <p className="mt-4 text-lg text-muted">씩씩케어는 진단이나 의료 지시를 하지 않아요.</p>
      </footer>
    </div>
  );
}
