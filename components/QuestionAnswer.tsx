"use client";
import { useState } from "react";
import { deleteTask, renameTask, setTaskMemo, toggleTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";
import Sheet from "./Sheet";

// 의료진에게 물어본 질문의 '들은 답' 메모. 저장하면 확인한 질문이 되고, 씩씩이가 이 메모를 근거로 나중에 다시 알려 준다.
// '질문 고치기'에서 문구를 바꾸거나 질문을 지운다.
export default function QuestionAnswer({ auth, task, full = false }: { auth: Auth; task: { id: string; title: string; memo: string | null; done: boolean }; full?: boolean }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(false);
  const [text, setText] = useState(task.memo ?? "");
  const [title, setTitle] = useState(task.title);
  const { run, pending, err } = useAct();
  const save = () => run(async () => {
    await setTaskMemo(auth, task.id, text);
    if (text.trim() && !task.done) await toggleTask(auth, task.id, true);
  }, () => setOpen(false));
  const rename = () => run(() => renameTask(auth, task.id, title), () => setEdit(false));
  const remove = () => { if (confirm("이 질문을 지울까요? 적어 둔 답도 함께 지워져요.")) run(() => deleteTask(auth, task.id), () => setEdit(false)); };
  const link = "-my-1 mt-1 min-h-0 py-1 text-xs font-semibold underline underline-offset-2 print:hidden";
  return (
    <>
      {task.memo && <p className={`mt-1.5 ${full ? "" : "line-clamp-3"} whitespace-pre-line rounded-lg bg-accent-soft px-2.5 py-1.5 text-sm text-ink`}>{task.memo}</p>}
      <div className="flex gap-4">
        <button type="button" onClick={() => { setText(task.memo ?? ""); setOpen(true); }} className={`${link} text-accent`}>
          {task.memo ? "답 고치기" : "들은 답 적기"}
        </button>
        <button type="button" onClick={() => { setTitle(task.title); setEdit(true); }} className={`${link} text-muted`}>고치기·지우기</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="의사 선생님 답변">
        <p className="mb-3 text-sm text-muted">{task.title}</p>
        <label htmlFor={`qa-${task.id}`} className="sr-only">들은 답</label>
        <textarea id={`qa-${task.id}`} rows={5} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 다음 주부터 가벼운 샤워 가능, 사우나는 한 달 뒤" className="w-full rounded-xl border border-line px-3 py-2 text-base" />
        <p className="mt-1.5 text-xs text-muted">저장하면 확인한 질문으로 옮겨지고, 씩씩이가 나중에 &ldquo;그때 뭐라고 하셨지?&rdquo;에 이 메모로 답해요.</p>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <button type="button" disabled={pending || !text.trim()} onClick={save} className="mt-4 w-full rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">저장</button>
      </Sheet>
      <Sheet open={edit} onClose={() => setEdit(false)} title="질문 고치기">
        <label htmlFor={`qt-${task.id}`} className="mb-2 block text-sm text-muted">물어볼 내용</label>
        <textarea id={`qt-${task.id}`} rows={3} maxLength={100} value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-line px-3 py-2 text-base" />
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <button type="button" disabled={pending || !title.trim() || title.trim() === task.title} onClick={rename} className="mt-4 w-full rounded-full bg-primary px-5 py-3 font-semibold text-ink disabled:opacity-40">저장</button>
        <button type="button" disabled={pending} onClick={remove} className="mt-6 w-full min-h-0 py-2 text-sm text-warn underline underline-offset-2">이 질문 지우기</button>
      </Sheet>
    </>
  );
}
