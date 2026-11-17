"use client";
import { useState } from "react";
import { deleteDocument } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { useAct } from "@/components/useAct";
import { DOC_TYPE_LABEL, fieldLines, hasForm, type DocFields, type DocType } from "@/lib/extract";
import type { SavedDoc } from "./ScanFlow";
import ConfirmCard from "./ConfirmCard";

// 내 서류함: 서류마다 접힌 서랍. 펼치면 양식으로 정리한 내용이 먼저, 원문은 접어 둔다.
// 아직 사람이 확인하지 않은 서류에는 '확인 안 함' 표시와 확인하기 버튼.
export default function Kept({ auth, docs, onDelete, onConfirmed }: {
  auth: Auth; docs: SavedDoc[]; onDelete?: (id: string) => void; onConfirmed?: (id: string, type: DocType, fields: DocFields) => void;
}) {
  const { run, pending, err } = useAct();
  const [editing, setEditing] = useState<string | null>(null);
  const [opened, setOpened] = useState<string[]>([]); // 줄이 많은 서류에서 '더 보기'를 누른 서류
  const SHOW = 3;
  return (
    <>
      {err && <p role="alert" className="text-warn">{err}</p>}
      <ul className={`mt-2 space-y-2 ${pending ? "opacity-60" : ""}`}>
        {docs.map((d) => {
          const lines = d.fields ? fieldLines(d.type, d.fields) : [];
          const all = opened.includes(d.id);
          const unchecked = !!d.fields && !d.confirmed && hasForm(d.type);
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
                          {(all ? lines : lines.slice(0, SHOW)).map((l, i) => {
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
                      {lines.length > SHOW && (
                        <button type="button" onClick={() => setOpened((o) => (all ? o.filter((x) => x !== d.id) : [...o, d.id]))} className="mt-2 w-full min-h-0 py-2 text-sm font-semibold text-accent">
                          {all ? "접기" : `${lines.length - SHOW}개 더 보기`}
                        </button>
                      )}
                      {d.fields && hasForm(d.type) && (
                        <button type="button" onClick={() => setEditing(d.id)} className={`mt-2 w-full rounded-full px-4 py-2.5 text-sm font-semibold ${unchecked ? "bg-primary text-ink" : "bg-accent-soft text-accent"}`}>
                          {unchecked ? "내용 확인하기" : "내용 고치기"}
                        </button>
                      )}
                      {lines.length > 0 ? (
                        <details className="mt-2">
                          <summary className="cursor-pointer py-1 text-sm text-muted">원문 전체 보기</summary>
                          <p className="mt-1 whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-relaxed">{d.text}</p>
                        </details>
                      ) : (
                        <p className="whitespace-pre-wrap rounded-lg bg-background p-3 text-sm leading-relaxed">{d.text}</p>
                      )}
                      <button disabled={pending} onClick={() => run(async () => { await deleteDocument(auth, d.id); onDelete?.(d.id); })} className="mt-2 min-h-0 py-1 text-sm text-muted underline underline-offset-2">이 서류 지우기</button>
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
