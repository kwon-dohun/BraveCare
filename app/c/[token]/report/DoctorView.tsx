"use client";
import { useState } from "react";
import Bright from "@/components/Bright";

// 말로 설명하기 번거로울 때 폰을 그대로 보여주는 고대비 전체 화면. 열려 있는 동안 앱에서는 화면 밝기를 최대로 올린다.
export default function DoctorView({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-ink print:hidden">의사에게 보여주기</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="의사 선생님께 보여주기" className="fixed inset-0 z-[100] overflow-y-auto bg-white p-5 text-black">
          <Bright />
          <button type="button" onClick={() => setOpen(false)} className="fixed right-4 top-4 rounded-full border border-black px-4 py-2 text-base font-semibold">닫기</button>
          {children}
        </div>
      )}
    </>
  );
}
