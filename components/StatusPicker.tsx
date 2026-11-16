"use client";
import { useState } from "react";
import { setBenefitStatus, setDocsChecked } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/benefits";
import Sheet from "./Sheet";
import { useAct } from "./useAct";

const HINT: Record<string, string> = {
  none: "아직 신청하지 않았어요",
  applied: "신청을 마쳤어요. 홈의 마감 안내에서 빠져요",
  approved: "기관에서 승인됐어요",
  rejected: "대상이 아니라는 답을 받았어요",
  dropped: "신청하지 않기로 했어요",
};

// 신청 상태: 현재 상태를 보여주고, 바꿀 때만 바텀시트를 연다
export function StatusPicker({ auth, benefitId, current }: { auth: Auth; benefitId: string; current: string }) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState(current);
  const { run, pending, err } = useAct();
  return (
    <div className="rounded-xl bg-card shadow-card p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted">신청 상태</p>
          <p className="text-headline font-semibold">{STATUS_LABEL[current]}</p>
        </div>
        <button onClick={() => { setPick(current); setOpen(true); }} className="rounded-full bg-accent-soft px-4 font-semibold text-accent">상태 바꾸기</button>
      </div>
      <Sheet open={open} onClose={() => setOpen(false)} title="신청 상태를 알려주세요">
        <div role="radiogroup" aria-label="신청 상태" className="space-y-2">
          {Object.entries(STATUS_LABEL).map(([v, l]) => (
            <label key={v} className={`flex items-center gap-3 rounded-xl p-3 ${pick === v ? "bg-accent-soft font-semibold text-accent ring-[1.5px] ring-primary" : "bg-card shadow-card"}`}>
              <input type="radio" name="st" value={v} checked={pick === v} onChange={() => setPick(v)} className="h-5 w-5" />
              <span><span className="font-medium">{l}</span><span className="block text-sm text-muted">{HINT[v]}</span></span>
            </label>
          ))}
        </div>
        {err && <p role="alert" className="mt-2 text-warn">{err}</p>}
        <button disabled={pending || pick === current} onClick={() => run(() => setBenefitStatus(auth, benefitId, pick), () => setOpen(false))} className="mt-4 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">
          {pending ? "저장하는 중…" : "저장"}
        </button>
        <p className="mt-2 text-center text-sm text-muted">바꾸면 가족 활동에 공유돼요</p>
      </Sheet>
    </div>
  );
}

import Link from "next/link";
import { matchPacketDoc } from "@/lib/packet";

export function DocsChecklist({
  auth,
  benefitId,
  docs,
  checked,
  packetChecked = [],
  docsHref,
}: {
  auth: Auth;
  benefitId: string;
  docs: string[];
  checked: string[];
  packetChecked?: string[];
  docsHref?: string;
}) {
  const [sel, setSel] = useState(checked);
  const { run, err } = useAct();
  const toggle = (d: string) => {
    const next = sel.includes(d) ? sel.filter((x) => x !== d) : [...sel, d];
    setSel(next);
    run(() => setDocsChecked(auth, benefitId, next));
  };

  const hasHospitalDoc = docs.some((d) => matchPacketDoc(d) !== null);

  return (
    <>
      <ul className="mt-2 divide-y divide-line rounded-xl bg-card shadow-card">
        {docs.map((d) => {
          const matched = matchPacketDoc(d);
          const isPacketReady = matched ? packetChecked.includes(matched.id) : false;
          return (
            <li key={d}>
              <label className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer">
                <div className="flex items-center gap-3 min-w-0">
                  <input type="checkbox" checked={sel.includes(d)} onChange={() => toggle(d)} className="h-5 w-5 shrink-0 accent-primary" />
                  <span className={`text-sm ${sel.includes(d) ? "text-muted line-through" : ""}`}>{d}</span>
                </div>
                {matched && (
                  <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-semibold ${isPacketReady ? "bg-accent-soft text-accent" : "bg-[#fff4cc] text-[#7a5a00]"}`}>
                    {isPacketReady ? "원무과 서류 챙김" : "퇴원 시 발급 필요"}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
        <span>{sel.length}/{docs.length} 준비됨 · 체크는 가족과 함께 봐요</span>
        {hasHospitalDoc && docsHref && (
          <Link href={docsHref} className="font-semibold text-accent hover:underline">
            원무과 서류 4종 관리로 이동 ↗
          </Link>
        )}
      </div>
      {err && <p role="alert" className="mt-1 text-sm text-warn">{err}</p>}
    </>
  );
}
