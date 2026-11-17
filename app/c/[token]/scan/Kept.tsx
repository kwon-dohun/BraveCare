"use client";
import { deleteDocument } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import type { SavedDoc } from "./ScanFlow";

// 내 서류함: 서류마다 접힌 서랍. 펼치면 읽은 글자 전체가 나온다.
export default function Kept({ auth, docs, onDelete }: { auth: Auth; docs: SavedDoc[]; onDelete?: (id: string) => void }) {
  const { run, pending, err } = useAct();
  return (
    <>
      {err && <p role="alert" className="text-warn">{err}</p>}
      <ul className={`mt-2 space-y-2 ${pending ? "opacity-60" : ""}`}>
        {docs.map((d) => (
          <li key={d.id}>
            <details className="rounded-xl bg-card shadow-card">
              <summary className="cursor-pointer px-4 py-3">
                <span className="inline-flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{d.label} <span className="text-sm font-normal text-muted">{d.date}</span></span>
                  <span className="truncate text-sm text-muted">{d.summary?.length ? d.summary.slice(0, 2).map((l) => l.label).join(", ") + (d.summary.length > 2 ? ` 외 ${d.summary.length - 2}개` : "") : d.text.split("\n")[0]}</span>
                </span>
              </summary>
              <div className="px-4 pb-4">
                {/* 정리본(원문에서 그대로 옮긴 핵심 줄)이 있으면 먼저, 원문은 접어 둔다 */}
                {d.summary?.length ? (
                  <>
                    <dl className="divide-y divide-line rounded-lg bg-background px-3">
                      {d.summary.map((l, i) => (
                        <div key={i} className="py-2.5">
                          <dt className="text-sm font-semibold">{l.label}</dt>
                          <dd className="mt-0.5 text-sm leading-relaxed text-muted">{l.value}</dd>
                        </div>
                      ))}
                    </dl>
                    <details className="mt-2">
                      <summary className="cursor-pointer py-1 text-sm text-muted">원문 전체 보기</summary>
                      <p className="mt-1 whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-relaxed">{d.text}</p>
                    </details>
                  </>
                ) : (
                  <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-relaxed">{d.text}</p>
                )}
                <button disabled={pending} onClick={() => run(async () => { await deleteDocument(auth, d.id); onDelete?.(d.id); })} className="mt-2 min-h-0 py-1 text-sm text-muted underline underline-offset-2">이 서류 지우기</button>
              </div>
            </details>
          </li>
        ))}
      </ul>
    </>
  );
}
