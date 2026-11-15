"use client";
import { useState } from "react";
import { saveDaily } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { TEMP_LABEL, BOWEL_LABEL, PAIN_WORD, type Daily } from "@/lib/report";
import { useAct } from "./useAct";

type V = Omit<Daily, "check_date">;
const GOOD: V = { med_morning: true, med_lunch: true, med_dinner: true, side_effect: false, temp: "normal", wound_issue: false, pain: 0, bowel: "good" };
const EMPTY: V = { ...GOOD, med_morning: false, med_lunch: false, med_dinner: false };

// 저녁에 환자와 통화하거나 마주 앉아 10초 만에 남기는 기록. 관리자와 가족(환자 본인 포함) 모두 쓴다.
export default function DailyForm({ auth, today }: { auth: Auth; today: Daily | null }) {
  const [v, setV] = useState<V>(today ?? EMPTY);
  const [saved, setSaved] = useState(false);
  const { run, pending, err } = useAct();
  const set = (p: Partial<V>) => { setSaved(false); setV((s) => ({ ...s, ...p })); };
  const save = (val: V) => run(() => saveDaily(auth, val), () => { setV(val); setSaved(true); });
  const pill = (on: boolean) => `rounded-xl border px-3 py-3 ${on ? "border-accent bg-accent-soft font-bold" : "border-line bg-card"}`;
  const check = (label: string, on: boolean, onChange: (b: boolean) => void) => (
    <label className="mt-2 flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={on} onChange={(e) => onChange(e.target.checked)} /> {label}</label>
  );

  return (
    <div className="mt-5">
      <button disabled={pending} onClick={() => save(GOOD)} className="w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white disabled:opacity-40">
        오늘 약 다 먹었고 특이사항 없어요
      </button>
      <p className="mt-2 text-center text-sm text-muted">다른 점이 있으면 아래에서 골라주세요</p>
      {saved && <p role="status" className="mt-3 rounded-xl bg-accent-soft p-3 text-accent">오늘 기록을 저장했어요.</p>}
      {err && <p role="alert" className="mt-3 text-warn">{err}</p>}

      <fieldset className="mt-6">
        <legend className="font-bold">약</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {([["med_morning", "아침"], ["med_lunch", "점심"], ["med_dinner", "저녁"]] as const).map(([k, l]) => (
            <button key={k} aria-pressed={v[k]} onClick={() => set({ [k]: !v[k] })} className={pill(v[k])}>{l} {v[k] ? "먹음" : "안 먹음"}</button>
          ))}
        </div>
        {check("속쓰림·어지러움 같은 불편함이 있었어요", v.side_effect, (b) => set({ side_effect: b }))}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="font-bold">체온</legend>
        <div className="mt-2 grid gap-2">
          {(Object.keys(TEMP_LABEL) as V["temp"][]).map((k) => <button key={k} aria-pressed={v.temp === k} onClick={() => set({ temp: k })} className={pill(v.temp === k)}>{TEMP_LABEL[k]}</button>)}
        </div>
        {check("수술 부위에 진물이 나거나 벌어졌어요", v.wound_issue, (b) => set({ wound_issue: b }))}
      </fieldset>

      <fieldset className="mt-6">
        <legend className="font-bold">통증 <span className="font-normal text-muted">{v.pain}점 · {PAIN_WORD(v.pain)}</span></legend>
        <input type="range" min={0} max={10} step={1} value={v.pain} aria-label="통증 점수 0에서 10" onChange={(e) => set({ pain: Number(e.target.value) })} className="mt-3 h-11 w-full" />
        <div className="flex justify-between text-sm text-muted"><span>0 전혀 없음</span><span>5 보통</span><span>10 참기 어려움</span></div>
      </fieldset>

      <fieldset className="mt-6">
        <legend className="font-bold">배변</legend>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {(Object.keys(BOWEL_LABEL) as V["bowel"][]).map((k) => <button key={k} aria-pressed={v.bowel === k} onClick={() => set({ bowel: k })} className={pill(v.bowel === k)}>{BOWEL_LABEL[k]}</button>)}
        </div>
      </fieldset>

      <button disabled={pending} onClick={() => save(v)} className="mt-6 w-full rounded-xl border border-accent px-5 py-4 text-lg font-bold text-accent disabled:opacity-40">
        {pending ? "저장하는 중…" : today ? "오늘 기록 고치기" : "이대로 저장"}
      </button>
      {(v.temp === "high" || v.wound_issue) && (
        <p role="alert" className="mt-4 rounded-xl bg-warn-soft p-3 text-warn">고열이나 수술 부위 이상은 기록만 하지 말고 병원에 전화로 알려주세요. 숨쉬기 힘들거나 의식이 흐리면 119에 연락하세요.</p>
      )}
    </div>
  );
}
