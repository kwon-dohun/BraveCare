"use client";
import { useEffect, useRef } from "react";
import Icon from "./Icon";

// 바텀시트. 네이티브 <dialog>라 포커스 가두기·ESC 닫기가 기본으로 된다.
export default function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref} onClose={onClose} aria-label={title}
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
      className="sheet m-0 mx-auto mt-auto w-full max-w-md rounded-t-[1.5rem] bg-card p-0 backdrop:bg-black/40"
    >
      <div className="p-5 pb-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-headline font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="닫기" className="-mr-2 flex w-11 items-center justify-center text-muted"><Icon name="close" size={22} /></button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
