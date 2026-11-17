"use client";
import { toggleTask, claimTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

// 상세 화면의 주 버튼: 끝냈다고 체크하거나, 담당이 없으면 내가 맡기
export default function TaskActions({ auth, id, done, canClaim }: { auth: Auth; id: string; done: boolean; canClaim: boolean }) {
  const { run, pending, err } = useAct();
  return (
    <div className="mt-4 space-y-2">
      {err && <p role="alert" className="text-sm text-warn">{err}</p>}
      <button disabled={pending} onClick={() => run(() => toggleTask(auth, id, !done))}
        className={done ? "w-full rounded-full bg-accent-soft px-5 py-3.5 font-semibold text-accent" : "w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink"}>
        {pending ? "바꾸는 중…" : done ? "아직 안 끝났어요" : "끝냈어요"}
      </button>
      {canClaim && !done && (
        <button disabled={pending} onClick={() => run(() => claimTask(auth, id))} className="w-full rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">내가 할게</button>
      )}
    </div>
  );
}
