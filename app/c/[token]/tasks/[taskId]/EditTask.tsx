"use client";
import { useState } from "react";
import type { Auth } from "@/lib/db";
import Sheet from "@/components/Sheet";
import TaskForm from "./TaskForm";

type Task = React.ComponentProps<typeof TaskForm>["task"];

// 제목 옆 "수정" 버튼 → 아래에서 올라오는 창에서 고친다. 저장하면 창만 닫히고 이 화면에 남아 바뀐 내용을 바로 본다(삭제하면 이전 화면으로).
export default function EditTask({ auth, back, members, solo, task, sourceLabel }: {
  auth: Auth; back: string; members: { id: string; name: string }[]; solo: boolean; task: Task; sourceLabel: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="mt-1 shrink-0 rounded-full bg-accent-soft px-3.5 py-1.5 text-sm font-semibold text-accent">수정</button>
      <Sheet open={open} onClose={() => setOpen(false)} title="할 일 고치기">
        <p className="text-xs text-muted">출처: {sourceLabel}</p>
        {open && <TaskForm auth={auth} back={back} members={members} solo={solo} task={task} onSaved={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}
