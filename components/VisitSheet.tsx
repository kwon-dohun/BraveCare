"use client";
import { useState } from "react";
import Link from "next/link";
import Sheet from "./Sheet";
import { recordVisit, setTaskMemo, toggleTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";

const CHIPS = ["가능해요", "아직 안 돼요", "다음 외래 때 결정"] as const;
type Q = { id: string; text: string };
type A = { chip?: string; note: string };
export type VisitSheetProps = { auth: Auth; questions: Q[]; visitTitle: string; scanHref: string; today: string };

// 진료 직후 한 번에 남기는 시트: 물어본 것에 들은 답, 다음 외래 날짜, 새로 생긴 할 일, 약이 바뀌었을 때 약봉투 찍기.
// 날짜와 할 일은 적은 대로만 들어가고, 저장 버튼 위에 무엇이 추가되는지 먼저 보여 준다.
export default function VisitSheet({ auth, open, onClose, questions, visitTitle, scanHref, today }: VisitSheetProps & { open: boolean; onClose: () => void }) {
  const [ans, setAns] = useState<Record<string, A>>({});
  const [nextDate, setNextDate] = useState("");
  const [nextTime, setNextTime] = useState("");
  const [tasks, setTasks] = useState([""]);
  const { run, pending, err } = useAct();
  const text = (id: string) => { const a = ans[id]; return a ? [a.chip, a.note.trim()].filter(Boolean).join(" · ") : ""; };
  const filled = questions.filter((q) => text(q.id));
  const newTasks = tasks.map((t) => t.trim()).filter(Boolean);
  const adds = [nextDate && `다음 외래 ${Number(nextDate.slice(5, 7))}월 ${Number(nextDate.slice(8))}일${nextTime ? ` ${nextTime}` : ""}`, newTasks.length && `새 할 일 ${newTasks.length}개`].filter(Boolean).join(" · ");
  const set = (id: string, p: Partial<A>) => setAns((s) => ({ ...s, [id]: { ...s[id], ...p, note: p.note ?? s[id]?.note ?? "" } }));
  const save = () => run(async () => {
    for (const q of filled) { await setTaskMemo(auth, q.id, text(q.id)); await toggleTask(auth, q.id, true); }
    await recordVisit(auth, { nextDate: nextDate || null, nextTime: nextTime || null, title: visitTitle, tasks: newTasks });
  }, () => { onClose(); setAns({}); setNextDate(""); setNextTime(""); setTasks([""]); });
  const base = "rounded-xl border border-line bg-card px-3 py-2";
  const field = `${base} w-full`;

  return (
    <Sheet open={open} onClose={onClose} title="방금 외래 진료 보셨나요?">
      <div className="max-h-[60vh] space-y-5 overflow-y-auto">
        {questions.length > 0 && (
          <section>
            <p className="mb-3 text-sm text-muted">들은 답을 적어 두면 씩씩이가 나중에 &ldquo;그때 뭐라고 하셨지?&rdquo;에 답해 드려요.</p>
            <ul className="space-y-4">
              {questions.map((q) => (
                <li key={q.id}>
                  <p className="text-sm font-semibold">{q.text}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CHIPS.map((c) => (
                      <button key={c} type="button" aria-pressed={ans[q.id]?.chip === c} onClick={() => set(q.id, { chip: ans[q.id]?.chip === c ? undefined : c })}
                        className={`min-h-0 rounded-full px-3 py-2 text-xs font-semibold ${ans[q.id]?.chip === c ? "bg-accent-soft text-accent ring-[1.5px] ring-primary" : "bg-background text-ink"}`}>{c}</button>
                    ))}
                  </div>
                  <input aria-label={`${q.text} 한 줄 메모`} maxLength={200} value={ans[q.id]?.note ?? ""} onChange={(e) => set(q.id, { note: e.target.value })} placeholder="한 줄 메모 (예: 다음 주부터 가능)" className={`mt-2 ${field}`} />
                </li>
              ))}
            </ul>
          </section>
        )}
        <section>
          <label htmlFor="vnext" className="text-sm font-semibold">다음 외래 날짜 <span className="font-normal text-muted">(정해졌다면)</span></label>
          <div className="mt-2 flex gap-2">
            <input id="vnext" type="date" min={today} value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={`${base} min-w-0 flex-1`} />
            {nextDate && <input aria-label="다음 외래 시간" type="time" value={nextTime} onChange={(e) => setNextTime(e.target.value)} className={`${base} w-28 shrink-0`} />}
          </div>
        </section>
        <section>
          <p className="text-sm font-semibold">새로 생긴 할 일 <span className="font-normal text-muted">(있다면)</span></p>
          <div className="mt-2 space-y-2">
            {tasks.map((t, i) => (
              <input key={i} aria-label={`새 할 일 ${i + 1}`} maxLength={100} value={t} onChange={(e) => setTasks((s) => s.map((x, j) => (j === i ? e.target.value : x)))} placeholder="예: 2주 뒤 실밥 제거" className={field} />
            ))}
            {tasks.length < 3 && tasks[tasks.length - 1].trim() && (
              <button type="button" onClick={() => setTasks((s) => [...s, ""])} className="min-h-0 text-sm font-semibold text-accent underline underline-offset-2">할 일 하나 더</button>
            )}
          </div>
        </section>
        <Link href={scanHref} className="flex items-center justify-between rounded-xl bg-background px-4 py-3 text-sm font-semibold">
          약이 바뀌었나요? 약봉투·처방전 찍기<span aria-hidden className="text-muted">›</span>
        </Link>
      </div>
      {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
      {adds && <p className="mt-3 text-center text-sm text-muted">저장하면 {adds}가 추가돼요</p>}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onClose} className="flex-1 rounded-full bg-background px-5 py-3 font-semibold text-muted">나중에</button>
        <button type="button" disabled={pending || !(filled.length || nextDate || newTasks.length)} onClick={save} className="flex-[2] rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">저장</button>
      </div>
    </Sheet>
  );
}
