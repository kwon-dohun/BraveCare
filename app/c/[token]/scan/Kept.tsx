"use client";
import { useState } from "react";
import { deleteDocument } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import { DOC_TYPE_LABEL, fieldLines, hasForm, type DocFields, type DocType } from "@/lib/extract";
import type { SavedDoc } from "./ScanFlow";
import ConfirmCard from "./ConfirmCard";

const isUnchecked = (d: SavedDoc) => !!d.fields && !d.confirmed && hasForm(d.type);

// 내 서류함: 서류마다 접힌 서랍. 펼치면 양식으로 정리한 내용이 먼저, 원문은 접어 둔다.
// 아직 사람이 확인하지 않은 서류에는 '확인 안 함' 표시와 확인하기 버튼.
export default function Kept({ auth, docs, onDelete, onConfirmed }: {
  auth: Auth; docs: SavedDoc[]; onDelete?: (id: string) => void; onConfirmed?: (id: string, type: DocType, fields: DocFields) => void;
}) {
  const { run, pending, err } = useAct();
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <>
      {err && <p role="alert" className="text-warn">{err}</p>}
      <ul className={`mt-2 space-y-2 ${pending ? "opacity-60" : ""}`}>
        {[...docs].sort((a, b) => Number(isUnchecked(b)) - Number(isUnchecked(a))).map((d) => { // 확인하지 않은 서류를 위로(나머지는 최근 순 그대로)
          const lines = d.fields ? fieldLines(d.type, d.fields) : [];
          const unchecked = isUnchecked(d);
          const preview = d.fields?.meds.length
            ? `${d.fields.meds.slice(0, 2).map((m) => m.name).join(", ")}${d.fields.meds.length > 2 ? ` 외 ${d.fields.meds.length - 2}개` : ""}`
            : lines[0] ?? d.text.split("\n")[0];
          return (
            <li key={d.id}>
              <details className="rounded-xl bg-card shadow-card">
                <summary className="cursor-pointer px-4 py-3">
                  <span className="inline-flex min-w-0 flex-1 flex-col">
                    <span className="flex items-center gap-1.5 font-medium">
                      {DOC_TYPE_LABEL[d.type]} <span className="text-sm font-normal text-muted">{d.date}</span>
                      {unchecked && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-caption font-semibold text-warn">확인 안 함</span>}
                    </span>
                    <span className="truncate text-sm text-muted">{preview}</span>
                  </span>
                </summary>
                <div className="px-4 pb-4">
                  {editing === d.id && d.fields ? (
                    <ConfirmCard auth={auth} id={d.id} type={d.type} fields={d.fields}
                      onDone={(t, f) => { onConfirmed?.(d.id, t, f); setEditing(null); }} onLater={() => setEditing(null)} />
                  ) : (
                    <>
                      {lines.length > 0 && (
                        <dl className="divide-y divide-line rounded-lg bg-background px-3">
                          {lines.map((l, i) => {
                            const [k, ...v] = l.split(": ");
                            return (
                              <div key={i} className="py-2.5">
                                <dt className="text-sm font-semibold">{k}</dt>
                                <dd className="mt-0.5 text-sm leading-relaxed text-muted">{v.join(": ")}</dd>
                              </div>
                            );
                          })}
                        </dl>
                      )}
                      {d.fields && hasForm(d.type) && (
                        <button type="button" onClick={() => setEditing(d.id)} className={`mt-2 w-full rounded-full px-4 py-2.5 text-sm font-semibold ${unchecked ? "bg-primary text-ink" : "bg-accent-soft text-accent"}`}>
                          {unchecked ? "맞는지 확인하기" : "고치기"}
                        </button>
                      )}
                      {lines.length === 0 && <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-relaxed">{d.text}</p>}
                      <button disabled={pending} onClick={() => { if (confirm("이 서류를 지울까요? 읽어 둔 글자도 함께 사라져요.")) run(async () => { await deleteDocument(auth, d.id); onDelete?.(d.id); }); }} className="mt-2 min-h-0 py-1 text-sm text-muted underline underline-offset-2">이 서류 지우기</button>
                    </>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </>
  );
}
