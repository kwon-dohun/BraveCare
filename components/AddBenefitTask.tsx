"use client";
import { createBenefitTask } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { useAct } from "./useAct";

// 지원 상세에서 이 지원의 신청을 할 일(과 달력)로 넣는다
export default function AddBenefitTask({ auth, benefitId }: { auth: Auth; benefitId: string }) {
  const { run, pending, err } = useAct();
  return (
    <>
      <button disabled={pending} onClick={() => run(() => createBenefitTask(auth, benefitId))} className="w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-60">
        {pending ? "넣는 중…" : "할 일에 넣기"}
      </button>
      {err && <p role="alert" className="mt-2 text-sm text-warn">{err}</p>}
    </>
  );
}
