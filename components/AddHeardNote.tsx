"use client";
import { useState } from "react";
import { addHeardNote } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";
import Sheet from "./Sheet";

// 물어볼 것 없이 진료 중에 들은 말을 적는다. 적으면 '들은 답'에 바로 쌓인다.
export default function AddHeardNote({ auth }: { auth: Auth }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const { run, pending, err } = useAct();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-2 flex min-h-11 w-full items-center justify-center rounded-full bg-accent-soft px-5 text-base font-semibold text-accent print:hidden">그 외에 들은 말 적기</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="그 외에 들은 말">
        <label htmlFor="heard-note" className="sr-only">들은 말</label>
        <textarea id="heard-note" rows={5} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 2주 뒤 실밥 제거, 그전까지 샤워 금지" className="w-full rounded-xl border border-line px-3 py-2 text-base" />
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <button type="button" disabled={pending || !text.trim()} onClick={() => run(() => addHeardNote(auth, text), () => { setOpen(false); setText(""); })} className="mt-4 w-full rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">저장</button>
      </Sheet>
    </>
  );
}
