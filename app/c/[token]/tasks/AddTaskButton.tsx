"use client";
import { useState } from "react";
import type { Auth } from "@/lib/db";
import Sheet from "@/components/Sheet";
import Icon from "@/components/Icon";
import AddTask from "./AddTask";

// 위쪽 "추가" 버튼: 작은 말풍선 대신 아래에서 올라오는 창에서 입력한다(수정 창과 같은 모양). 넣으면 창이 닫힌다.
export default function AddTaskButton({ auth, defaultVisit, label, members, solo, meId, autoOpen = false }: {
  auth: Auth; defaultVisit: boolean; label: string; members: { id: string; name: string }[]; solo: boolean; meId: string; autoOpen?: boolean;
}) {
  const [open, setOpen] = useState(autoOpen);
  return (
    <>
      <button type="button" aria-label={label} onClick={() => setOpen(true)} className="flex h-8 cursor-pointer items-center justify-center gap-1 whitespace-nowrap rounded-full bg-card px-3 text-xs font-semibold shadow-card text-ink hover:text-accent">
        <Icon name="plus" size={14} />추가
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="일정·할 일 추가">
        {open && <AddTask auth={auth} plain defaultVisit={defaultVisit} members={members} solo={solo} meId={meId} onAdded={() => setOpen(false)} />}
      </Sheet>
    </>
  );
}
