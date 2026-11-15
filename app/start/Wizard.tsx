"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCase } from "../actions";
import { useAct } from "@/components/useAct";
import type { CaseInput, Living, Reason } from "@/lib/benefits";
import { SIDO, SEOUL_GU, REASON_LABEL, LIVING_LABEL } from "@/lib/options";

const shift = (n: number) => new Date(Date.now() + n * 86_400_000).toLocaleDateString("sv-SE");
const DRAFT = "toewon:draft";
const SUMMARY = 7;

interface Draft { date: string; undecided: boolean; birth: string; sido: string; gu: string; reason: Reason | null; living: Living | null; helpers: number | null; name: string; step: number }
const EMPTY: Draft = { date: "", undecided: false, birth: "", sido: "서울", gu: "", reason: null, living: null, helpers: null, name: "", step: 0 };

export default function Wizard() {
  const router = useRouter();
  const [d, setD] = useState<Draft>(EMPTY);
  const [editing, setEditing] = useState(false); // 요약에서 '수정'으로 들어온 경우 답하면 요약으로 돌아간다
  const [ready, setReady] = useState(false);
  const { run, pending, err } = useAct();
  const step = d.step;

  // 동의 없이 들어오면 첫 화면으로. 중간에 나갔다 오면 임시 저장한 답을 이어서 보여준다.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("toewon:consent") !== "1") { router.replace("/"); return; }
      const v = localStorage.getItem(DRAFT);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 클라이언트에서만 읽을 수 있다
      if (v) setD({ ...EMPTY, ...JSON.parse(v) });
    } catch {}
    setReady(true);
  }, [router]);
  useEffect(() => {
    if (ready) try { localStorage.setItem(DRAFT, JSON.stringify(d)); } catch {}
  }, [d, ready]);

  const set = (patch: Partial<Draft>) => setD((s) => ({ ...s, ...patch }));
  const go = (n: number) => set({ step: n });
  const next = (patch: Partial<Draft> = {}) => { set({ ...patch, step: editing ? SUMMARY : step + 1 }); setEditing(false); };
  const back = () => { if (editing) { setEditing(false); go(SUMMARY); } else go(step - 1); };
  const edit = (n: number) => { setEditing(true); go(n); };

  const submit = () =>
    run(async () => {
      const input: CaseInput = {
        dischargeDate: d.undecided ? null : d.date, birthYear: Number(d.birth), sido: d.sido, sigungu: d.gu,
        reason: d.reason!, living: d.living!, helpers: d.helpers!, income: null,
      };
      try { localStorage.removeItem(DRAFT); } catch {}
      await createCase(input, d.name, true);
    });

  const cur = new Date().getFullYear();
  const birthOk = /^\d{4}$/.test(d.birth) && Number(d.birth) >= 1900 && Number(d.birth) <= cur;
  const dateOk = d.undecided || (!!d.date && d.date >= shift(-30) && d.date <= shift(60));
  const complete = dateOk && birthOk && (d.sido !== "서울" || !!d.gu) && d.reason && d.living && d.helpers !== null && !!d.name.trim();

  const choice = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} aria-pressed={active} className={`w-full rounded-xl border px-4 py-3 text-left text-lg ${active ? "border-accent bg-accent-soft font-medium" : "border-line bg-card"}`}>
      {label}
    </button>
  );
  const primary = (onClick: () => void, label: React.ReactNode, disabled?: boolean) => (
    <button onClick={onClick} disabled={disabled || pending} className="mt-6 w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white disabled:opacity-40">
      {label}
    </button>
  );
  const nextLabel = editing ? "수정 완료" : "다음";
  const field = "mt-5 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg";

  if (!ready) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
      <div className="flex items-center gap-3">
        <button onClick={step === 0 ? () => router.push("/") : back} aria-label="이전" className="-ml-2 px-2 text-2xl">‹</button>
        <div className="h-1.5 flex-1 rounded bg-line" role="progressbar" aria-label="입력 진행률" aria-valuemin={1} aria-valuenow={step + 1} aria-valuemax={SUMMARY + 1}>
          <div className="h-full rounded bg-accent transition-all" style={{ width: `${((step + 1) / (SUMMARY + 1)) * 100}%` }} />
        </div>
        <span className="text-sm text-muted">{step + 1}/{SUMMARY + 1}</span>
      </div>

      <div className="mt-8 flex-1">
        {step === 0 && (
          <>
            <h1 className="text-2xl font-bold">퇴원 예정일이 언제예요?</h1>
            <label htmlFor="dd" className="sr-only">퇴원 예정일</label>
            <input id="dd" type="date" disabled={d.undecided} value={d.date} min={shift(-30)} max={shift(60)} onChange={(e) => set({ date: e.target.value })} className={`${field} disabled:opacity-40`} />
            <label className="mt-4 flex items-center gap-3 text-lg">
              <input type="checkbox" checked={d.undecided} onChange={(e) => set({ undecided: e.target.checked })} className="h-5 w-5" /> 아직 미정이에요
            </label>
            {d.date && !d.undecided && !dateOk
              ? <p role="alert" className="mt-3 text-warn">오늘 기준 30일 전부터 60일 뒤 사이의 날짜를 입력해주세요.</p>
              : <p className="mt-3 text-sm text-muted">{d.undecided ? "퇴원일이 정해지면 설정에서 바꿀 수 있어요. 마감일도 그때 계산해요." : "오늘 기준 30일 전부터 60일 뒤까지 입력할 수 있어요."}</p>}
            {primary(() => next(), nextLabel, !dateOk)}
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-2xl font-bold">퇴원하시는 분이 태어난 해는요?</h1>
            <label htmlFor="by" className="sr-only">태어난 해 4자리</label>
            <input id="by" inputMode="numeric" maxLength={4} placeholder="예: 1954" value={d.birth} onChange={(e) => set({ birth: e.target.value.replace(/\D/g, "") })} className={field} />
            <p className="mt-3 text-sm text-muted">65세 이상 대상 지원을 가려내는 데만 써요.</p>
            {primary(() => next(), nextLabel, !birthOk)}
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-2xl font-bold">퇴원 후 어디에서 지내세요?</h1>
            <select aria-label="시·도" value={d.sido} onChange={(e) => set({ sido: e.target.value, gu: "" })} className={field}>
              {SIDO.map((s) => <option key={s}>{s}</option>)}
            </select>
            {d.sido === "서울" ? (
              <select aria-label="자치구" value={d.gu} onChange={(e) => set({ gu: e.target.value })} className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg">
                <option value="">자치구 선택</option>
                {SEOUL_GU.map((s) => <option key={s}>{s}</option>)}
              </select>
            ) : (
              <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">지금은 서울 제도만 자세히 안내해요. 다른 지역은 전국 공통 제도만 보여드려요.</p>
            )}
            {primary(() => next(), nextLabel, d.sido === "서울" && !d.gu)}
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-2xl font-bold">어떤 이유로 입원하셨어요?</h1>
            <p className="mt-2 text-sm text-muted">진단명은 묻지 않아요. 큰 분류만 골라주세요.</p>
            <div className="mt-5 space-y-3">{REASON_LABEL.map(([v, l]) => choice(l, d.reason === v, () => next({ reason: v })))}</div>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="text-2xl font-bold">퇴원 후에는 누구와 지내세요?</h1>
            <div className="mt-5 space-y-3">{LIVING_LABEL.map(([v, l]) => choice(`${l} 지내세요`, d.living === v, () => next({ living: v })))}</div>
          </>
        )}
        {step === 5 && (
          <>
            <h1 className="text-2xl font-bold">돌봄을 도울 수 있는 가족은 몇 명이에요?</h1>
            <p className="mt-2 text-sm text-muted">나를 빼고, 가끔이라도 도울 수 있는 분이에요.</p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => next({ helpers: n })} aria-pressed={d.helpers === n} className={`rounded-xl border py-4 text-xl ${d.helpers === n ? "border-accent bg-accent-soft font-medium" : "border-line bg-card"}`}>
                  {n === 5 ? "5명 이상" : `${n}명`}
                </button>
              ))}
            </div>
          </>
        )}
        {step === 6 && (
          <>
            <h1 className="text-2xl font-bold">가족에게 보일 내 이름은요?</h1>
            <label htmlFor="nm" className="sr-only">내 이름</label>
            <input id="nm" maxLength={20} placeholder="예: 지은" value={d.name} onChange={(e) => set({ name: e.target.value })} className={field} />
            {primary(() => next(), nextLabel, !d.name.trim())}
          </>
        )}
        {step === SUMMARY && (
          <>
            <h1 className="text-2xl font-bold">이렇게 만들까요?</h1>
            <dl className="mt-5 divide-y divide-line rounded-xl border border-line bg-card">
              {([
                ["퇴원 예정일", d.undecided ? "미정" : d.date, 0],
                ["태어난 해", `${d.birth}년생`, 1],
                ["지내실 곳", `${d.sido} ${d.gu}`.trim(), 2],
                ["입원 이유", REASON_LABEL.find(([v]) => v === d.reason)?.[1], 3],
                ["함께 지내는 분", LIVING_LABEL.find(([v]) => v === d.living)?.[1], 4],
                ["도울 수 있는 가족", d.helpers === null ? "" : `${d.helpers}명`, 5],
                ["내 이름", d.name, 6],
              ] as [string, string | undefined, number][]).map(([k, v, n]) => (
                <div key={k} className="flex items-center gap-3 px-4 py-1.5">
                  <dt className="w-28 shrink-0 text-sm text-muted">{k}</dt>
                  <dd className="flex-1">{v || <span className="text-warn">입력 필요</span>}</dd>
                  <button onClick={() => edit(n)} className="px-2 text-sm text-accent underline" aria-label={`${k} 수정`}>수정</button>
                </div>
              ))}
            </dl>
            {err && <p role="alert" className="mt-4 text-warn">{err}</p>}
            {primary(submit, pending ? "정리하는 중…" : "퇴원노트 만들기", !complete)}
          </>
        )}
      </div>
    </main>
  );
}
