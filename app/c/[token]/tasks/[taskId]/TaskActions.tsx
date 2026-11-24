"use client";
import { useState } from "react";
import { toggleTask, claimTask, unclaimTask } from "@/app/actions";
import { helpRequestText } from "@/lib/task-help";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

// 상세 화면의 행동: 담당이 없으면 먼저 맡거나 부탁하고, 끝냈다고 체크한다(진한 버튼은 끝냈어요 하나)
export default function TaskActions({ auth, id, done, canClaim, mine = false, help, note }: { auth: Auth; id: string; done: boolean; canClaim: boolean; mine?: boolean; note?: string; help?: { title: string; when: string; memo: string | null } }) {
  const { run, pending, err } = useAct();
  const [copied, setCopied] = useState(false);
  // 담당이 없는 일을 가족 단톡방에 부탁하는 문구를 복사한다(목록에서는 빼고 여기서만)
  const copyHelp = async () => {
    try { await navigator.clipboard.writeText(helpRequestText(help!, window.location.origin)); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch {}
  };
  return (
    <div className="mt-6 space-y-2 border-t border-line pt-5">
      {err && <p role="alert" className="text-sm text-warn">{err}</p>}
      {canClaim && !done && (
        <div className={`grid gap-2 ${help ? "grid-cols-2" : ""}`}>
          <button disabled={pending} onClick={() => run(() => claimTask(auth, id))} className="rounded-full border border-accent/40 px-3 py-3 text-sm font-semibold text-accent">내가 할게</button>
          {help && <button type="button" onClick={copyHelp} className="rounded-full bg-card px-3 py-3 text-sm font-semibold text-ink shadow-card">카톡으로 부탁하기</button>}
        </div>
      )}
      {copied && <p className="text-center text-xs text-accent">복사했어요. 단톡방에 붙여 넣어 주세요</p>}
      <button disabled={pending} onClick={() => run(() => toggleTask(auth, id, !done))}
        className={done ? "w-full rounded-full bg-accent-soft px-5 py-3.5 font-semibold text-accent" : "w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink"}>
        {pending ? "바꾸는 중…" : done ? "아직 안 끝났어요" : "끝냈어요"}
      </button>
      {note && !done && <p className="text-center text-xs text-muted">{note}</p>}
      {mine && !done && (
        <button disabled={pending} onClick={() => run(() => unclaimTask(auth, id))} className="w-full text-sm text-muted underline underline-offset-2">내가 맡은 것 취소하기</button>
      )}
    </div>
  );
}
