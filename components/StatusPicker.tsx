"use client";
import { useState, useTransition } from "react";
import { setBenefitStatus } from "@/app/actions";
import type { Auth } from "@/lib/db";
import { STATUS_LABEL } from "@/lib/benefits";

export default function StatusPicker({ auth, benefitId, current }: { auth: Auth; benefitId: string; current: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  return (
    <div>
      <label className="block text-sm text-muted" htmlFor="st">신청 상태</label>
      <select
        id="st"
        value={current}
        disabled={pending}
        onChange={(e) => start(async () => { setErr(""); try { await setBenefitStatus(auth, benefitId, e.target.value); } catch (x) { setErr(x instanceof Error ? x.message : "문제가 생겼어요"); } })}
        className="mt-1 w-full rounded-xl border border-line bg-card px-4 py-3 text-lg"
      >
        {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {err && <p role="alert" className="mt-1 text-warn">{err}</p>}
    </div>
  );
}
