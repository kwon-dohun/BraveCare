"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createCase, logStart } from "../actions";
import { useAct } from "@/components/useAct";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";
import type { CaseInput, Income, Living, Reason } from "@/lib/benefits";
import { SIDO, SEOUL_GU, REASON_LABEL, LIVING_LABEL, INCOME_OPTIONS } from "@/lib/options";

const DRAFT = "toewon:draft";
let startedAt = 0; // 온보딩 소요 시간 측정용 (KPI)
const SUMMARY = 5; // 질문 5개 뒤 요약

interface Draft { date: string; undecided: boolean; birth: string; sido: string; gu: string; reason: Reason | null; living: Living | null; income: Income | null; name: string; step: number }
const EMPTY: Draft = { date: "", undecided: false, birth: "", sido: "서울", gu: "", reason: null, living: null, income: null, name: "", step: 0 };

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
    startedAt = Date.now();
    let src = "direct";
    try { src = sessionStorage.getItem("bc:src") ?? src; } catch {}
    logStart(src).catch(() => {});
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
        reason: d.reason!, living: d.living!, income: d.income!,
      };
      try { localStorage.removeItem(DRAFT); } catch {}
      await createCase(input, d.name, true, (Date.now() - startedAt) / 1000);
    });

  const cur = new Date().getFullYear();
  const birthOk = /^\d{4}$/.test(d.birth) && Number(d.birth) >= 1900 && Number(d.birth) <= cur;
  const regionOk = d.sido !== "서울" || !!d.gu;
  const dateOk = d.undecided || !!d.date;
  const complete = dateOk && birthOk && regionOk && d.reason && d.living && d.income && !!d.name.trim();

  const choice = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} aria-pressed={active} className={`w-full rounded-xl px-4 py-3 text-left ${active ? "bg-accent-soft font-semibold text-accent ring-[1.5px] ring-primary" : "bg-card shadow-card"}`}>
      {label}
    </button>
  );
  const primary = (onClick: () => void, label: React.ReactNode, disabled?: boolean) => (
    <button onClick={onClick} disabled={disabled || pending} className="mt-6 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">
      {label}
    </button>
  );
  const nextLabel = editing ? "수정 완료" : "다음";
  const field = "mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-headline";

  if (!ready) return null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-6">
      <div className="flex items-center gap-3">
        <button onClick={step === 0 ? () => router.push("/") : back} aria-label="이전" className="-ml-2 flex w-11 items-center justify-center"><Icon name="left" size={24} /></button>
        <div className="h-1.5 flex-1 rounded bg-line" role="progressbar" aria-label="입력 진행률" aria-valuemin={1} aria-valuenow={step + 1} aria-valuemax={SUMMARY + 1}>
          <div className="h-full rounded bg-primary transition-all" style={{ width: `${((step + 1) / (SUMMARY + 1)) * 100}%` }} />
        </div>
        <span className="text-sm text-muted">{step < SUMMARY ? `${step + 1}/${SUMMARY}` : "확인"}</span>
      </div>

      <div className="mt-6 flex-1">
        <Mascot size={56} mood={step === SUMMARY ? "cheer" : "idle"} className="mb-3" />
        {step === 0 && (
          <>
            <h1 className="text-title font-display">어떤 일로 입원하셨어요?</h1>
            <p className="mt-2 text-sm text-muted">진단명은 묻지 않아요. 큰 분류만 골라주세요.</p>
            <div className="mt-5 space-y-3">{REASON_LABEL.map(([v, l]) => choice(l, d.reason === v, () => next({ reason: v })))}</div>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="text-title font-display">퇴원은 언제쯤이에요?</h1>
            <p className="mt-2 text-sm text-muted">이미 퇴원했다면 퇴원한 날짜를 넣어주세요.</p>
            <label htmlFor="dd" className="sr-only">퇴원일</label>
            <input id="dd" type="date" disabled={d.undecided} value={d.date} onChange={(e) => set({ date: e.target.value })} className={`${field} disabled:opacity-40`} />
            <label className="mt-4 flex items-center gap-3 text-headline">
              <input type="checkbox" checked={d.undecided} onChange={(e) => set({ undecided: e.target.checked })} className="h-5 w-5" /> 아직 정해지지 않았어요
            </label>
            {d.undecided && <p className="mt-3 text-sm text-muted">괜찮아요. 일정을 &lsquo;퇴원 3일 전&rsquo;, &lsquo;퇴원 당일&rsquo;처럼 보여드리고, 날짜가 정해지면 한 번에 다시 계산해요.</p>}
            {primary(() => next(), nextLabel, !dateOk)}
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="text-title font-display">환자분이 태어난 해와 사는 곳은요?</h1>
            <label htmlFor="by" className="mt-5 block text-sm font-medium">태어난 해</label>
            <input id="by" inputMode="numeric" maxLength={4} placeholder="예: 1954" value={d.birth} onChange={(e) => set({ birth: e.target.value.replace(/\D/g, "") })} className={field} />
            <label htmlFor="sd" className="mt-5 block text-sm font-medium">퇴원 후 지낼 곳</label>
            <select id="sd" value={d.sido} onChange={(e) => set({ sido: e.target.value, gu: "" })} className={field}>
              {SIDO.map((s) => <option key={s}>{s}</option>)}
            </select>
            {d.sido === "서울" && (
              <select aria-label="자치구" value={d.gu} onChange={(e) => set({ gu: e.target.value })} className={field}>
                <option value="">자치구 선택</option>
                {SEOUL_GU.map((s) => <option key={s}>{s}</option>)}
              </select>
            )}
            <p className="mt-3 text-sm text-muted">나이와 지역에 따라 받을 수 있는 지원이 달라져요.</p>
            {primary(() => next(), nextLabel, !birthOk || !regionOk)}
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="text-title font-display">퇴원 후 낮 시간에는 누가 곁에 있나요?</h1>
            <div className="mt-5 space-y-3">{LIVING_LABEL.map(([v, l]) => choice(l, d.living === v, () => next({ living: v })))}</div>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="text-title font-display">가구 소득은 어느 쪽에 가까워요?</h1>
            <p className="mt-2 text-sm text-muted">소득 기준이 있는 지원을 가려내는 데만 써요. 모르면 &lsquo;잘 모르겠어요&rsquo;를 골라도 돼요.</p>
            <div className="mt-5 space-y-3">{INCOME_OPTIONS.map(([v, l]) => choice(l, d.income === v, () => next({ income: v })))}</div>
          </>
        )}
        {step === SUMMARY && (
          <>
            <h1 className="text-title font-display">이렇게 시작할까요?</h1>
            <dl className="mt-5 divide-y divide-line rounded-xl bg-card shadow-card">
              {([
                ["입원 이유", REASON_LABEL.find(([v]) => v === d.reason)?.[1], 0],
                ["퇴원일", d.undecided ? "아직 미정" : d.date, 1],
                ["나이·지역", birthOk && regionOk ? `${d.birth}년생 · ${d.sido} ${d.gu}`.trim() : "", 2],
                ["낮 시간 돌봄", LIVING_LABEL.find(([v]) => v === d.living)?.[1], 3],
                ["소득", INCOME_OPTIONS.find(([v]) => v === d.income)?.[1], 4],
              ] as [string, string | undefined, number][]).map(([k, v, n]) => (
                <div key={k} className="flex items-center gap-3 px-4 py-1.5">
                  <dt className="w-24 shrink-0 text-sm text-muted">{k}</dt>
                  <dd className="flex-1">{v || <span className="text-warn">입력 필요</span>}</dd>
                  <button onClick={() => edit(n)} className="px-2 text-sm text-accent underline" aria-label={`${k} 수정`}>수정</button>
                </div>
              ))}
            </dl>
            <label htmlFor="nm" className="mt-5 block font-semibold">가족에게 보일 내 이름</label>
            <input id="nm" maxLength={20} placeholder="예: 지은" value={d.name} onChange={(e) => set({ name: e.target.value })} className={field} />
            {err && <p role="alert" className="mt-4 text-warn">{err}</p>}
            {primary(submit, pending ? "정리하는 중…" : "씩씩케어 시작하기", !complete)}
          </>
        )}
      </div>
    </main>
  );
}
