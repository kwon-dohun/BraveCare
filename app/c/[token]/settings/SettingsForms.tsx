"use client";
import { useState } from "react";
import { updateCase, deleteCase } from "@/app/actions";
import type { Auth } from "@/lib/db";
import type { CaseInput, Living, Reason } from "@/lib/benefits";
import { SIDO, SEOUL_GU, REASON_LABEL, LIVING_LABEL } from "@/lib/options";
import { addDays } from "@/lib/timeline";
import { useAct } from "@/components/useAct";

const field = "mt-1 w-full rounded-xl border border-line bg-card px-4 py-3";

export function CaseForm({ auth, input, today }: { auth: Auth; input: CaseInput; today: string }) {
  const [v, setV] = useState({ ...input, undecided: input.dischargeDate === null, date: input.dischargeDate ?? "", birth: String(input.birthYear) });
  const [saved, setSaved] = useState(false);
  const { run, pending, err } = useAct();
  const set = (p: Partial<typeof v>) => { setSaved(false); setV((s) => ({ ...s, ...p })); };
  const ok = (v.undecided || !!v.date) && /^\d{4}$/.test(v.birth) && (v.sido !== "서울" || !!v.sigungu);

  return (
    <form
      className="mt-3 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => updateCase(auth, { ...input, dischargeDate: v.undecided ? null : v.date, birthYear: Number(v.birth), sido: v.sido, sigungu: v.sigungu, reason: v.reason, living: v.living, helpers: v.helpers }), () => setSaved(true));
      }}
    >
      <div>
        <label htmlFor="sd" className="text-sm font-medium">퇴원 예정일</label>
        <input id="sd" type="date" disabled={v.undecided} value={v.date} min={addDays(today, -30)} max={addDays(today, 60)} onChange={(e) => set({ date: e.target.value })} className={`${field} disabled:opacity-40`} />
        <label className="mt-2 flex items-center gap-3"><input type="checkbox" className="h-5 w-5" checked={v.undecided} onChange={(e) => set({ undecided: e.target.checked })} /> 아직 미정이에요</label>
      </div>
      <div>
        <label htmlFor="sb" className="text-sm font-medium">태어난 해</label>
        <input id="sb" inputMode="numeric" maxLength={4} value={v.birth} onChange={(e) => set({ birth: e.target.value.replace(/\D/g, "") })} className={field} />
      </div>
      <div>
        <label htmlFor="ss" className="text-sm font-medium">지내실 곳</label>
        <select id="ss" value={v.sido} onChange={(e) => set({ sido: e.target.value, sigungu: "" })} className={field}>{SIDO.map((s) => <option key={s}>{s}</option>)}</select>
        {v.sido === "서울" && (
          <select aria-label="자치구" value={v.sigungu} onChange={(e) => set({ sigungu: e.target.value })} className={field}>
            <option value="">자치구 선택</option>{SEOUL_GU.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}
      </div>
      <div>
        <label htmlFor="sr" className="text-sm font-medium">입원 이유</label>
        <select id="sr" value={v.reason} onChange={(e) => set({ reason: e.target.value as Reason })} className={field}>{REASON_LABEL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <div>
        <label htmlFor="sl" className="text-sm font-medium">퇴원 후 함께 지내는 분</label>
        <select id="sl" value={v.living} onChange={(e) => set({ living: e.target.value as Living })} className={field}>{LIVING_LABEL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {err && <p role="alert" className="text-warn">{err}</p>}
      {saved && <p role="status" className="text-accent">저장했어요. 지원 판정과 날짜를 다시 계산했어요.</p>}
      <button disabled={pending || !ok} className="w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white disabled:opacity-40">{pending ? "저장하는 중…" : "저장"}</button>
    </form>
  );
}

export function KeyLink({ path }: { path: string }) {
  const [msg, setMsg] = useState("");
  const copy = async () => {
    const url = `${location.origin}${path}`;
    try { await navigator.clipboard.writeText(url); setMsg("주소를 복사했어요."); } catch { setMsg(url); }
  };
  return (
    <>
      <button onClick={copy} className="mt-3 w-full rounded-xl border border-accent px-5 py-3 font-bold text-accent">내 주소 복사</button>
      {msg && <p role="status" className="mt-2 break-all text-sm text-accent">{msg}</p>}
    </>
  );
}

export function DeleteCase({ auth }: { auth: Auth }) {
  const [text, setText] = useState("");
  const { run, pending, err } = useAct();
  return (
    <div className="mt-3">
      <label htmlFor="del" className="text-sm">확인을 위해 <b>삭제</b>라고 입력해주세요</label>
      <input id="del" value={text} onChange={(e) => setText(e.target.value)} className={field} autoComplete="off" />
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <button disabled={pending || text.trim() !== "삭제"} onClick={() => run(() => deleteCase(auth))} className="mt-3 w-full rounded-xl bg-warn px-5 py-3 font-bold text-white disabled:opacity-40">
        {pending ? "삭제하는 중…" : "퇴원노트 전체 삭제"}
      </button>
    </div>
  );
}
