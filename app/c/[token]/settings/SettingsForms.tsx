"use client";
import { useEffect, useState } from "react";
import { updateCase, deleteCase, leaveCase, unlinkKakao } from "@/app/actions";
import type { Auth } from "@/lib/db";
import type { CaseInput, Income, Living, Reason } from "@/lib/benefits";
import { SIDO, SEOUL_GU, REASON_LABEL, LIVING_LABEL, INCOME_OPTIONS } from "@/lib/options";
import { useAct } from "@/components/useAct";
import Mascot from "@/components/Mascot";

const field = "mt-1 w-full rounded-xl border border-line bg-card px-4 py-3";

export function CaseForm({ auth, input }: { auth: Auth; input: CaseInput }) {
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
        run(() => updateCase(auth, { ...input, dischargeDate: v.undecided ? null : v.date, birthYear: Number(v.birth), sido: v.sido, sigungu: v.sigungu, reason: v.reason, living: v.living, income: v.income }), () => setSaved(true));
      }}
    >
      <div>
        <label htmlFor="sd" className="text-sm font-medium">퇴원일</label>
        <input id="sd" type="date" disabled={v.undecided} value={v.date} onChange={(e) => set({ date: e.target.value })} className={`${field} disabled:opacity-40`} />
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
        <label htmlFor="sl" className="text-sm font-medium">낮 시간 돌봄</label>
        <select id="sl" value={v.living} onChange={(e) => set({ living: e.target.value as Living })} className={field}>{LIVING_LABEL.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      <div>
        <label htmlFor="si" className="text-sm font-medium">가구 소득</label>
        <select id="si" value={v.income} onChange={(e) => set({ income: e.target.value as Income })} className={field}>{INCOME_OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
      </div>
      {err && <p role="alert" className="text-warn">{err}</p>}
      {saved && <p role="status" className="text-accent">저장했어요. 지원 판정과 날짜를 다시 계산했어요.</p>}
      <button disabled={pending || !ok} className="w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">{pending ? "저장하는 중…" : "저장"}</button>
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
      <button onClick={copy} className="mt-3 w-full rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">내 주소 복사</button>
      {msg && <p role="status" className="mt-2 break-all text-sm text-accent">{msg}</p>}
    </>
  );
}

export function DeleteCase({ auth, stats }: { auth: Auth; stats?: { doneTasks: number; dailyDays: number; docCount: number } }) {
  const [text, setText] = useState("");
  const { run, pending, err } = useAct();
  return (
    <div className="mt-3">
      {stats && (stats.doneTasks > 0 || stats.dailyDays > 0) && (
        <div className="mb-4 rounded-2xl bg-card p-4 shadow-card border border-line">
          <div className="flex items-center gap-3">
            <Mascot size={44} mood="cheer" />
            <div>
              <p className="font-semibold text-ink">그동안 회복을 위해 정말 고생 많으셨어요</p>
              <p className="mt-0.5 text-xs text-muted">
                가족들이 함께 총 {stats.doneTasks}개의 할 일을 해냈고, {stats.dailyDays}일의 저녁 안부를 기록했어요.
              </p>
            </div>
          </div>
        </div>
      )}

      <aside className="mb-4 rounded-xl bg-[#fff4cc] p-3.5 text-xs text-[#7a5a00] leading-relaxed border border-[#f5e6a3]" aria-label="삭제 전 확인사항">
        <p className="font-bold uppercase tracking-wide">삭제 전 마지막 확인</p>
        <ul className="mt-1 list-disc pl-4 space-y-0.5">
          <li>내년에 쓸 <b>연말정산 장애인증명서</b>와 <b>실손보험 청구 서류</b>는 모두 내려받으셨나요?</li>
          {stats?.docCount ? <li>보관해 둔 <b>서류 글자 {stats.docCount}건</b>도 영구 삭제되어 다시 열람할 수 없어요.</li> : null}
        </ul>
      </aside>

      <label htmlFor="del" className="text-sm">확인을 위해 <b>삭제</b>라고 입력해주세요</label>
      <input id="del" value={text} onChange={(e) => setText(e.target.value)} className={field} autoComplete="off" />
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <button disabled={pending || text.trim() !== "삭제"} onClick={() => run(() => deleteCase(auth))} className="mt-3 w-full rounded-xl bg-warn px-5 py-3 font-semibold text-white disabled:opacity-40">
        {pending ? "삭제하는 중…" : "기록 전체 삭제"}
      </button>
    </div>
  );
}

const FONTS = [["", "보통"], ["l", "크게"], ["xl", "아주 크게"]] as const;
export function FontSize() {
  const [cur, setCur] = useState("");
  // eslint-disable-next-line react-hooks/set-state-in-effect -- 저장소는 클라이언트에서만 읽을 수 있다
  useEffect(() => { setCur(document.documentElement.dataset.font ?? ""); }, []);
  const pick = (v: string) => {
    setCur(v);
    document.documentElement.setAttribute("data-font", v);
    try { localStorage.setItem("bc:font", v); } catch {}
  };
  return (
    <div role="group" aria-label="글자 크기" className="mt-3 flex rounded-full bg-card p-1 shadow-card">
      {FONTS.map(([v, label]) => (
        <button key={v} type="button" aria-pressed={cur === v} onClick={() => pick(v)} className={`flex-1 rounded-full text-sm transition-colors ${cur === v ? "bg-accent-soft font-semibold text-accent" : "text-muted"}`}>{label}</button>
      ))}
    </div>
  );
}

export function UnlinkKakao({ auth }: { auth: Auth }) {
  const { run, pending, err } = useAct();
  return (
    <>
      <p className="mt-3 rounded-xl bg-accent-soft px-4 py-3 text-sm font-medium text-accent">카카오 계정이 연결되어 있어요</p>
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <button disabled={pending} onClick={() => run(() => unlinkKakao(auth))} className="mt-1 w-full text-sm text-muted underline">연결 끊기</button>
    </>
  );
}

export function LeaveCase({ auth }: { auth: Auth }) {
  const [ask, setAsk] = useState(false);
  const { run, pending, err } = useAct();
  if (!ask) return <button onClick={() => setAsk(true)} className="mt-3 w-full rounded-xl border border-line px-5 py-3 text-muted">가족에서 나가기</button>;
  return (
    <div className="mt-3 rounded-xl border border-warn bg-warn-soft p-4">
      <p className="text-warn">정말 나갈까요? 다시 들어오려면 새 초대 링크가 필요해요.</p>
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setAsk(false)} className="flex-1 rounded-xl bg-card px-4 shadow-card">취소</button>
        <button disabled={pending} onClick={() => run(() => leaveCase(auth))} className="flex-1 rounded-xl bg-warn px-4 font-semibold text-white">나가기</button>
      </div>
    </div>
  );
}
