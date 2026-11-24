"use client";
import { useEffect, useRef, useState } from "react";

type U = { label: string; undo: () => Promise<unknown> };

// 체크나 한꺼번에 정리처럼 되돌리고 싶은 동작 뒤에 부른다. 어느 화면에서 불러도 이 토스트(레이아웃에 하나)가 6초 동안 '되돌리기'를 보여 준다.
export const announceUndo = (label: string, undo: () => Promise<unknown>) =>
  window.dispatchEvent(new CustomEvent<U>("bravecare:undo", { detail: { label, undo } }));

export default function UndoToast() {
  const [u, setU] = useState<U | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const on = (e: Event) => {
      setU((e as CustomEvent<U>).detail);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setU(null), 6000);
    };
    window.addEventListener("bravecare:undo", on);
    return () => { window.removeEventListener("bravecare:undo", on); clearTimeout(timer.current); };
  }, []);
  if (!u) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-24 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-xl bg-foreground px-4 py-3 text-sm text-white shadow-card">
      <span className="min-w-0 truncate">{u.label}</span>
      <button type="button" disabled={busy} className="min-h-9 shrink-0 font-semibold text-primary"
        onClick={async () => { setBusy(true); try { await u.undo(); } finally { setBusy(false); setU(null); } }}>되돌리기</button>
    </div>
  );
}
