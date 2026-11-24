"use client";
import { useState } from "react";
import Bright from "@/components/Bright";
import VisitSheet from "@/components/VisitSheet";
import type { Auth } from "@/lib/db";

type Q = { id: string; text: string };

// 말로 설명하기 번거로울 때 폰을 그대로 보여주는 고대비 전체 화면. 열려 있는 동안 앱에서는 화면 밝기를 최대로 올린다.
// 진료실에서는 보여주기만 하고, 이 창을 닫을 때(=방금 진료가 끝났을 때) 의사 답변을 적는 시트를 띄운다. 단순히 리포트를 보고 나갈 때는 뜨지 않는다.
export default function DoctorView({ auth, questions, visitTitle, scanHref, today, children }: { auth: Auth; questions: Q[]; visitTitle: string; scanHref: string; today: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [memo, setMemo] = useState(false);
  const close = () => { setOpen(false); if (questions.length) setMemo(true); };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="min-h-0 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-ink print:hidden">의사에게 보여주기</button>
      {open && (
        <div role="dialog" aria-modal="true" aria-label="의사 선생님께 보여주기" className="fixed inset-0 z-[100] overflow-y-auto bg-white p-5 text-black">
          <Bright />
          <button type="button" onClick={close} className="fixed right-4 top-4 rounded-full border-2 border-black bg-white px-4 py-2 text-base font-semibold">닫기</button>
          {children}
        </div>
      )}
      <VisitSheet open={memo} onClose={() => setMemo(false)} auth={auth} questions={questions} visitTitle={visitTitle} scanHref={scanHref} today={today} />
    </>
  );
}
