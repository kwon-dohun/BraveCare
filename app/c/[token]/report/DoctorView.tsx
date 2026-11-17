"use client";
import { useState } from "react";
import Bright from "@/components/Bright";
import Sheet from "@/components/Sheet";
import { setTaskMemo, toggleTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

const CHIPS = ["가능해요", "아직 안 돼요", "다음 외래 때 결정"] as const;
type Q = { id: string; text: string };

// 말로 설명하기 번거로울 때 폰을 그대로 보여주는 고대비 전체 화면. 열려 있는 동안 앱에서는 화면 밝기를 최대로 올린다.
// 진료실에서는 보여주기만 하고, 이 창을 닫을 때(=방금 진료가 끝났을 때) 의사 답변을 적는 시트를 띄운다. 단순히 리포트를 보고 나갈 때는 뜨지 않는다.
export default function DoctorView({ auth, questions, children }: { auth: Auth; questions: Q[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState(false);
  const [ans, setAns] = useState<Record<string, { chip?: string; note: string }>>({});
  const { run, pending, err } = useAct();
  const close = () => { setOpen(false); if (questions.length) setMemo(true); };
  const text = (id: string) => { const a = ans[id]; return a ? [a.chip, a.note.trim()].filter(Boolean).join(" · ") : ""; };
  const filled = questions.filter((q) => text(q.id));
  const save = () => run(async () => {
    for (const q of filled) { await setTaskMemo(auth, q.id, text(q.id)); await toggleTask(auth, q.id, true); }
  }, () => { setMemo(false); setAns({}); });
  const set = (id: string, p: Partial<{ chip?: string; note: string }>) => setAns((s) => ({ ...s, [id]: { ...s[id], ...p, note: p.note ?? s[id]?.note ?? "" } }));

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-ink print:hidden">의사에게 보여주기</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="의사 선생님께 보여주기" className="fixed inset-0 z-[100] overflow-y-auto bg-white p-5 text-black">
          <Bright />
          <button type="button" onClick={close} className="fixed right-4 top-4 rounded-full border-2 border-black bg-white px-4 py-2 text-base font-semibold">닫기</button>
          {children}
        </div>
      )}
      <Sheet open={memo} onClose={() => setMemo(false)} title="방금 외래 진료 보셨나요?">
        <p className="-mt-2 mb-4 text-sm text-muted">잊어버리기 전에 의사 선생님 답변만 간단히 적어두세요. 씩씩이가 기억해 두었다가 나중에 &ldquo;그때 뭐라고 하셨지?&rdquo;에 답해 드려요.</p>
        <ul className="max-h-[55vh] space-y-4 overflow-y-auto">
          {questions.map((q) => (
            <li key={q.id}>
              <p className="text-sm font-semibold">{q.text}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CHIPS.map((c) => (
                  <button key={c} type="button" aria-pressed={ans[q.id]?.chip === c} onClick={() => set(q.id, { chip: ans[q.id]?.chip === c ? undefined : c })}
                    className={`min-h-0 rounded-full px-3 py-2 text-xs font-semibold ${ans[q.id]?.chip === c ? "bg-accent-soft text-accent ring-[1.5px] ring-primary" : "bg-background text-ink"}`}>{c}</button>
                ))}
              </div>
              <input aria-label={`${q.text} 한 줄 메모`} maxLength={200} value={ans[q.id]?.note ?? ""} onChange={(e) => set(q.id, { note: e.target.value })} placeholder="한 줄 메모 (예: 다음 주부터, 사우나는 한 달 뒤)" className="mt-2 w-full rounded-xl border border-line px-3 py-2 text-base" />
            </li>
          ))}
        </ul>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setMemo(false)} className="flex-1 rounded-full bg-background px-5 py-3 font-semibold text-muted">나중에</button>
          <button type="button" disabled={pending || !filled.length} onClick={save} className="flex-[2] rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">저장</button>
        </div>
      </Sheet>
    </>
  );
}
