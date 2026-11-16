"use client";
import { useState } from "react";
import { toggleSaved } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";
import Icon from "./Icon";

// 지원 찜 하트. 누르면 바로 바뀌고, 저장에 실패하면 되돌린다.
export default function SaveButton({ auth, item, saved, className = "" }: { auth: Auth; item: string; saved: boolean; className?: string }) {
  const [on, setOn] = useState(saved);
  const { run, pending } = useAct();
  const toggle = () => {
    const next = !on;
    setOn(next);
    run(() => toggleSaved(auth, item, next).catch((e) => { setOn(!next); throw e; }));
  };
  return (
    <button type="button" onClick={toggle} disabled={pending} aria-pressed={on} aria-label={on ? "찜 해제" : "찜하기"}
      className={`flex h-11 w-11 items-center justify-center rounded-full transition-colors ${on ? "text-[#e0517a]" : "text-muted hover:text-ink"} ${className}`}>
      <Icon name="like" size={22} className={on ? "fill-current" : ""} />
    </button>
  );
}
