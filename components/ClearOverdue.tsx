"use client";
import { useState } from "react";
import { clearOverdue, reopenTasks } from "@/app/actions";
import { announceUndo } from "./UndoToast";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";
import Sheet from "./Sheet";

// 날짜가 지난 일 중 이미 끝낸 것을 골라 끝냄으로 정리한다. 대부분 이미 했을 거라 처음엔 전부 체크해 두고, 안 한 것만 풀게 한다.
// 지원 신청과 반복 일은 여기 넣지 않는다(목록에서 하나씩 처리).
export default function ClearOverdue({ auth, items, skipped = 0 }: { auth: Auth; items: { id: string; title: string }[]; skipped?: number }) {
  const [open, setOpen] = useState(false);
  const [off, setOff] = useState<Set<string>>(new Set());
  const { run, pending, err } = useAct();
  if (!items.length) return null;
  const picked = items.filter((t) => !off.has(t.id));
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex min-h-9 w-full items-center justify-end gap-1 text-sm font-semibold text-accent">지난 일 정리하기</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="이미 끝낸 일 정리">
        <p className="text-sm text-muted">체크한 일을 끝냄으로 바꿔요. 아직 안 한 일은 체크를 풀어 주세요.</p>
        {skipped > 0 && <p className="mt-1 text-xs text-muted">지원 신청과 반복하는 일 {skipped}개는 여기 안 나와요. 목록에서 하나씩 정리해 주세요.</p>}
        <ul className="mt-3 max-h-[45vh] space-y-1.5 overflow-y-auto text-sm">
          {items.map((t) => (
            <li key={t.id}>
              <label className="flex min-h-11 items-center gap-3 rounded-lg bg-background px-3 py-2">
                <input type="checkbox" checked={!off.has(t.id)} onChange={() => setOff((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })} className="h-5 w-5 shrink-0 accent-primary" />
                <span>{t.title}</span>
              </label>
            </li>
          ))}
        </ul>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full bg-background px-5 py-3 font-semibold text-muted">취소</button>
          <button type="button" disabled={pending || !picked.length} onClick={() => run(async () => { const ids = await clearOverdue(auth, picked.map((t) => t.id)); if (ids.length) announceUndo(`지난 일 ${ids.length}개를 정리했어요`, () => reopenTasks(auth, ids)); }, () => setOpen(false))} className="flex-[2] rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">{picked.length}개 끝냄으로 정리</button>
        </div>
      </Sheet>
    </>
  );
}
