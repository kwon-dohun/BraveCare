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

// 환자 본인이 링크 하나로 남기는 오늘 안부. 미리 골라 둔 답이 없어서, 누르지 않은 항목은 보내지 않는다.
export default function PatientCheckFlow({ patientToken, todayStr, initialDaily }: { patientToken: string; todayStr: string; initialDaily: Daily | null }) {
  const d = initialDaily;
  const [meds, setMeds] = useState({ m: d?.med_morning ?? false, l: d?.med_lunch ?? false, n: d?.med_dinner ?? false });
  const [body, setBody] = useState<"ok" | "issue" | null>(d ? (d.temp !== "normal" || d.wound_issue ? "issue" : "ok") : null);
  const [temp, setTemp] = useState<Temp>(d?.temp ?? "normal");
  const [wound, setWound] = useState(d?.wound_issue ?? false);
  const [pain, setPain] = useState<number | null>(d ? painStep(d.pain) : null);
  const [bowel, setBowel] = useState<Bowel | null>(d?.bowel ?? null);
  const [note, setNote] = useState(d?.notes ?? "");
  const [sent, setSent] = useState(!!d);
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();
  const kakao = useSyncExternalStore(() => () => {}, () => /kakaotalk/i.test(navigator.userAgent), () => false);

  const send = (v: PatientDailyInput) => {
    setErr("");
    start(async () => {
      try { await submitPatientDailyCheck(patientToken, v); setSent(true); }
      catch (e) { setErr(e instanceof Error ? e.message : "보내지 못했어요. 다시 눌러 주세요"); }
    });
  };
  const allGood = () => {
    setMeds({ m: true, l: true, n: true }); setBody("ok"); setTemp("normal"); setWound(false); setPain(1); setBowel("good");
    send({ med_morning: true, med_lunch: true, med_dinner: true, temp: "normal", wound_issue: false, pain: 1, bowel: "good", notes: note });
  };
  const ready = body !== null && pain !== null && bowel !== null;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    send({
      med_morning: meds.m, med_lunch: meds.l, med_dinner: meds.n,
      temp: body === "issue" ? temp : "normal", wound_issue: body === "issue" && wound,
      pain: pain!, bowel: bowel!, notes: note,
    });
  };

  const pill = (on: boolean, tone: "ok" | "warn" = "ok") =>
    `flex min-h-14 flex-1 flex-col items-center justify-center rounded-2xl px-3 py-2.5 text-callout font-semibold leading-tight transition-colors ${
      on ? (tone === "warn" ? "bg-warn-soft text-warn ring-[1.5px] ring-warn" : "bg-accent-soft text-accent ring-[1.5px] ring-primary") : "bg-background text-ink"
    }`;
  const card = "rounded-2xl bg-card p-5 shadow-card";
  const q = "text-headline font-semibold";

  return (
    <div className="mx-auto max-w-md px-5 pb-12 pt-8">
      <header className="text-center">
        <Mascot size={64} mood={sent ? "cheer" : "idle"} className="mx-auto" />
        <h1 className="mt-3 text-title font-display">오늘 몸은 좀 어떠세요?</h1>
        <p className="mt-1 text-sm text-muted">{todayStr} · 눌러서 가족에게 알려 주세요</p>
        {kakao && <p className="mt-3 rounded-xl bg-card px-4 py-2.5 text-sm text-muted shadow-card">카톡 채팅방에서 이 링크를 길게 눌러 &lsquo;공지&rsquo;로 올려 두면 매일 찾기 쉬워요.</p>}
      </header>

      {sent ? (
        <section className={`view-in mt-6 ${card} text-center`}>
          <p className="text-headline font-semibold">가족에게 오늘 안부를 전했어요</p>
          <p className="mt-1 text-sm text-muted">오늘도 푹 쉬세요. 바꿀 게 있으면 다시 보낼 수 있어요.</p>
          <dl className="mt-5 divide-y divide-line rounded-xl bg-background px-4 text-left text-sm">
            {([
              ["약", [meds.m && "아침", meds.l && "점심", meds.n && "저녁"].filter(Boolean).join(" · ") || "안 먹음"],
              ["열·수술 부위", body === "issue" ? [temp === "high" ? "고열" : temp === "mild" ? "미열" : "", wound ? "수술 부위 불편" : ""].filter(Boolean).join(" · ") || "불편함 있음" : "괜찮음"],
              ["통증", PAIN.find(([v]) => v === pain)?.[1] ?? "-"],
              ["화장실", bowel === "good" ? "편함" : bowel === "constipation" ? "변비" : bowel === "diarrhea" ? "설사" : "-"],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 py-2.5"><dt className="text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
            ))}
            {note && <p className="py-2.5 text-muted">메모: {note}</p>}
          </dl>
          <button type="button" onClick={() => setSent(false)} className="mt-4 w-full rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">다시 고쳐서 보내기</button>
        </section>
      ) : (
        <form onSubmit={submit} className="view-in mt-6 space-y-4">
          <button type="button" disabled={pending} onClick={allGood} className="w-full rounded-full bg-primary px-5 py-4 text-headline font-semibold text-ink disabled:opacity-40">
            약 다 먹었고 오늘 괜찮아요
          </button>
          <p className="text-center text-sm text-muted">불편한 게 있으면 아래에서 골라 주세요</p>
          {err && <p role="alert" className="rounded-xl bg-warn-soft p-4 text-sm font-semibold text-warn">{err}</p>}

          <fieldset className={card}>
            <legend className={`${q} float-left w-full`}>약은 언제 드셨어요?</legend>
            <div className="clear-both flex gap-2 pt-3">
              {([["m", "아침"], ["l", "점심"], ["n", "저녁"]] as const).map(([k, l]) => (
                <button key={k} type="button" aria-pressed={meds[k]} onClick={() => setMeds((s) => ({ ...s, [k]: !s[k] }))} className={pill(meds[k])}>
                  <span className="flex items-center gap-1">{meds[k] && <Icon name="check" size={16} />}{l}</span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted">안 드신 때는 누르지 않으면 돼요.</p>
          </fieldset>

          <fieldset className={card}>
            <legend className={`${q} float-left w-full`}>열이나 수술 부위는 어떠세요?</legend>
            <div className="clear-both flex gap-2 pt-3">
              <button type="button" aria-pressed={body === "ok"} onClick={() => { setBody("ok"); setTemp("normal"); setWound(false); }} className={pill(body === "ok")}>괜찮아요</button>
              <button type="button" aria-pressed={body === "issue"} onClick={() => setBody("issue")} className={pill(body === "issue", "warn")}>불편해요</button>
            </div>
            {body === "issue" && (
              <div className="view-in mt-3 space-y-2 rounded-xl bg-background p-3">
                <div className="flex gap-2">
                  {([["mild", "미열", "37.5도 이상"], ["high", "고열", "38도 이상"]] as const).map(([v, l, s]) => (
                    <button key={v} type="button" aria-pressed={temp === v} onClick={() => setTemp(temp === v ? "normal" : v)} className={pill(temp === v, "warn")}>
                      {l}<span className="text-xs font-normal opacity-80">{s}</span>
                    </button>
                  ))}
                </div>
                <label className="flex min-h-11 items-center gap-2.5 text-sm">
                  <input type="checkbox" checked={wound} onChange={(e) => setWound(e.target.checked)} className="h-5 w-5 accent-warn" />
                  수술 부위가 붓거나 진물이 나요
                </label>
              </div>
            )}
          </fieldset>

          <fieldset className={card}>
            <legend className={`${q} float-left w-full`}>지금 통증은 어느 정도예요?</legend>
            <div className="clear-both flex gap-2 pt-3">
              {PAIN.map(([v, l, s]) => (
                <button key={v} type="button" aria-pressed={pain === v} onClick={() => setPain(v)} className={pill(pain === v, v === 8 ? "warn" : "ok")}>
                  {l}<span className="mt-0.5 text-xs font-normal opacity-80">{s}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className={card}>
            <legend className={`${q} float-left w-full`}>오늘 화장실은 편하셨어요?</legend>
            <div className="clear-both flex gap-2 pt-3">
              {([["good", "편했어요"], ["constipation", "변비"], ["diarrhea", "설사"]] as const).map(([v, l]) => (
                <button key={v} type="button" aria-pressed={bowel === v} onClick={() => setBowel(v)} className={pill(bowel === v, v === "good" ? "ok" : "warn")}>{l}</button>
              ))}
            </div>
          </fieldset>

          <div className={card}>
            <label htmlFor="pmemo" className={q}>가족에게 남길 말 <span className="text-sm font-normal text-muted">(선택)</span></label>
            <input id="pmemo" maxLength={100} value={note} onChange={(e) => setNote(e.target.value)} placeholder="예: 점심에 죽 한 그릇 다 먹었어" className="mt-3 w-full rounded-xl border border-line bg-background px-4 py-3" />
          </div>

          <button disabled={pending || !ready} className="w-full rounded-full bg-primary px-5 py-4 text-headline font-semibold text-ink">
            {pending ? "보내는 중…" : ready ? "가족에게 안부 보내기" : "위 질문에 모두 답해 주세요"}
          </button>
        </form>
      )}

      <footer className="mt-10 text-center">
        <a href="tel:119" className="flex w-full items-center justify-center gap-2 rounded-full bg-warn px-5 py-3.5 font-semibold text-white">
          <Icon name="phone" size={18} />숨이 차거나 많이 아프면 119
        </a>
        <p className="mt-3 text-xs text-muted">씩씩케어는 진단이나 의료 지시를 하지 않아요.</p>
      </footer>
    </div>
  );
}
