"use client";
import { deleteDocument } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";

export default function Kept({ auth, docs }: { auth: Auth; docs: { id: string; label: string; preview: string; date: string }[] }) {
  const { run, pending, err } = useAct();
  return (
    <>
      {err && <p role="alert" className="text-warn">{err}</p>}
      <ul className={`mt-2 divide-y divide-line rounded-xl bg-card shadow-card ${pending ? "opacity-60" : ""}`}>
        {docs.map((d) => (
          <li key={d.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{d.label} <span className="text-sm font-normal text-muted">{d.date}</span></p>
              <p className="truncate text-sm text-muted">{d.preview}</p>
            </div>
            <button disabled={pending} onClick={() => run(() => deleteDocument(auth, d.id))} className="px-2 text-sm text-muted underline" aria-label={`${d.label} ${d.date} 지우기`}>지우기</button>
          </li>
        ))}
      </ul>
    </>
  );
}
