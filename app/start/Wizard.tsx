"use client";
import { useState, useTransition } from "react";
import { createCase } from "../actions";
import type { CaseInput, Living, Reason } from "@/lib/benefits";

const SIDO = ["서울", "경기", "인천", "부산", "대구", "광주", "대전", "울산", "세종", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const SEOUL_GU = ["강남구", "강동구", "강북구", "강서구", "관악구", "광진구", "구로구", "금천구", "노원구", "도봉구", "동대문구", "동작구", "마포구", "서대문구", "서초구", "성동구", "성북구", "송파구", "양천구", "영등포구", "용산구", "은평구", "종로구", "중구", "중랑구"];
const REASONS: [Reason, string][] = [
  ["ortho", "정형외과 수술 (관절·골절 등)"], ["cancer", "암 치료"], ["brain", "뇌혈관 질환"], ["heart", "심장 질환"],
  ["surgery", "기타 수술"], ["internal", "내과 질환"], ["other", "기타"],
];
const LIVINGS: [Living, string][] = [["alone", "혼자 지내세요"], ["spouse", "배우자와 지내세요"], ["family", "자녀 등 가족과 지내세요"]];

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const shift = (n: number) => iso(new Date(Date.now() + n * 86_400_000));

export default function Wizard() {
  const [step, setStep] = useState(0);
  const [date, setDate] = useState("");
  const [undecided, setUndecided] = useState(false);
  const [birth, setBirth] = useState("");
  const [sido, setSido] = useState("서울");
  const [gu, setGu] = useState("");
  const [reason, setReason] = useState<Reason | null>(null);
  const [living, setLiving] = useState<Living | null>(null);
  const [helpers, setHelpers] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [err, setErr] = useState("");
  const [pending, start] = useTransition();

  const total = 8;
  const next = () => { setErr(""); setStep((s) => s + 1); };
  const back = () => { setErr(""); setStep((s) => s - 1); };

  const submit = () => {
    start(async () => {
      try {
        const input: CaseInput = {
          dischargeDate: undecided ? null : date, birthYear: Number(birth), sido, sigungu: gu,
          reason: reason!, living: living!, helpers: helpers!, income: null,
        };
        await createCase(input, name);
      } catch (e) {
        // redirect()는 예외로 동작하므로 NEXT_REDIRECT는 그대로 던진다
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) throw e;
        setErr(e instanceof Error ? e.message : "문제가 생겼어요. 다시 시도해주세요");
      }
    });
  };

  const cur = new Date().getFullYear();
  const birthOk = /^\d{4}$/.test(birth) && Number(birth) >= 1900 && Number(birth) <= cur;

  const choice = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} className={`w-full rounded-xl border px-4 py-3 text-left text-lg ${active ? "border-accent bg-accent-soft font-medium" : "border-line bg-card"}`}>
      {label}
    </button>
  );

  const primary = (onClick: () => void, label: React.ReactNode, disabled?: boolean) => (
    <button onClick={onClick} disabled={disabled || pending} className="mt-6 w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white disabled:opacity-40">
      {label}
    </button>
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
      <div className="flex items-center gap-3">
        <button onClick={back} disabled={step === 0} aria-label="이전" className="-ml-2 px-2 text-2xl disabled:opacity-0">‹</button>
        <div className="h-1.5 flex-1 rounded bg-line" role="progressbar" aria-valuenow={step + 1} aria-valuemax={total}>
          <div className="h-full rounded bg-accent transition-all" style={{ width: `${((step + 1) / total) * 100}%` }} />
        </div>
        <span className="text-sm text-muted">{step + 1}/{total}</span>
      </div>

      <div className="mt-8 flex-1">
        {step === 0 && (
          <>
            <h2 className="text-2xl font-bold">퇴원 예정일이 언제예요?</h2>
            <input type="date" disabled={undecided} value={date} min={shift(-30)} max={shift(60)} onChange={(e) => setDate(e.target.value)} className="mt-5 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg disabled:opacity-40" />
            <label className="mt-4 flex items-center gap-3 text-lg">
              <input type="checkbox" checked={undecided} onChange={(e) => setUndecided(e.target.checked)} className="h-5 w-5" /> 아직 미정이에요
            </label>
            <p className="mt-3 text-sm text-muted">오늘 기준 30일 전부터 60일 뒤까지 입력할 수 있어요.</p>
            {primary(next, "다음", !undecided && !date)}
          </>
        )}
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold">퇴원하시는 분이 태어난 해는요?</h2>
            <input inputMode="numeric" maxLength={4} placeholder="예: 1954" value={birth} onChange={(e) => setBirth(e.target.value.replace(/\D/g, ""))} className="mt-5 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg" />
            <p className="mt-3 text-sm text-muted">65세 이상 대상 지원을 가려내는 데만 써요.</p>
            {primary(next, "다음", !birthOk)}
          </>
        )}
        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold">퇴원 후 어디에서 지내세요?</h2>
            <select value={sido} onChange={(e) => { setSido(e.target.value); setGu(""); }} className="mt-5 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg">
              {SIDO.map((s) => <option key={s}>{s}</option>)}
            </select>
            {sido === "서울" ? (
              <select value={gu} onChange={(e) => setGu(e.target.value)} className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg">
                <option value="">자치구 선택</option>
                {SEOUL_GU.map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <p className="mt-3 text-sm text-muted">지금은 서울 제도만 자세히 안내해요. 다른 지역은 전국 공통 제도만 보여드려요.</p>
            )}
            {primary(next, "다음", sido === "서울" && !gu)}
          </>
        )}
        {step === 3 && (
          <>
            <h2 className="text-2xl font-bold">어떤 이유로 입원하셨어요?</h2>
            <p className="mt-2 text-sm text-muted">진단명은 묻지 않아요. 큰 분류만 골라주세요.</p>
            <div className="mt-5 space-y-3">{REASONS.map(([v, l]) => choice(l, reason === v, () => { setReason(v); next(); }))}</div>
          </>
        )}
        {step === 4 && (
          <>
            <h2 className="text-2xl font-bold">퇴원 후에는 누구와 지내세요?</h2>
            <div className="mt-5 space-y-3">{LIVINGS.map(([v, l]) => choice(l, living === v, () => { setLiving(v); next(); }))}</div>
          </>
        )}
        {step === 5 && (
          <>
            <h2 className="text-2xl font-bold">돌봄을 도울 수 있는 가족은 몇 명이에요?</h2>
            <p className="mt-2 text-sm text-muted">나를 빼고, 가끔이라도 도울 수 있는 분이에요.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => { setHelpers(n); next(); }} className={`rounded-xl border py-4 text-xl ${helpers === n ? "border-accent bg-accent-soft font-medium" : "border-line bg-card"}`}>
                  {n === 5 ? "5명 이상" : `${n}명`}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 6 && (
          <>
            <h2 className="text-2xl font-bold">가족에게 보일 내 이름은요?</h2>
            <input maxLength={20} placeholder="예: 지은" value={name} onChange={(e) => setName(e.target.value)} className="mt-5 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg" />
            {primary(next, "다음", !name.trim())}
          </>
        )}
        {step === 7 && (
          <>
            <h2 className="text-2xl font-bold">이렇게 만들까요?</h2>
            <dl className="mt-5 divide-y divide-line rounded-xl border border-line bg-card">
              {[
                ["퇴원 예정일", undecided ? "미정" : date],
                ["태어난 해", `${birth}년생`],
                ["지내실 곳", `${sido} ${gu}`.trim()],
                ["입원 이유", REASONS.find(([v]) => v === reason)?.[1]],
                ["함께 지내는 분", LIVINGS.find(([v]) => v === living)?.[1].replace(" 지내세요", "")],
                ["도울 수 있는 가족", `${helpers}명`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3"><dt className="text-muted">{k}</dt><dd className="text-right">{v}</dd></div>
              ))}
            </dl>
            {err && <p role="alert" className="mt-4 text-warn">{err}</p>}
            {primary(submit, pending ? "정리하는 중…" : "퇴원노트 만들기")}
          </>
        )}
      </div>
    </main>
  );
}
