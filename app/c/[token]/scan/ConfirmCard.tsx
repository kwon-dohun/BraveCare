"use client";
import { useEffect, useState } from "react";
import { confirmDocument, suggestDrugNames, kcdCheck } from "@/app/scan-actions";
import { baseName } from "@/lib/drug";
import type { Auth } from "@/lib/db";
import type { KcdHit } from "@/lib/kcd";
import { DOC_TYPE_LABEL, FIELD_LABELS, hasForm, missingCount, receiptNote, type DocFields, type DocType } from "@/lib/extract";
import { useAct } from "@/components/useAct";
import Icon from "@/components/Icon";

const TYPES: DocType[] = ["medication", "guide", "certificate", "receipt", "other"];

// 찍은 서류를 양식에 맞춰 보여주고 틀린 칸만 고쳐 저장한다. 약은 한 번에 하나씩 넘겨 보고, 못 읽은 칸은 비워 두고 눈에 띄게.
export default function ConfirmCard({ auth, id, type: t0, fields: f0, onDone, onLater }: {
  auth: Auth; id: string; type: DocType; fields: DocFields;
  onDone: (type: DocType, fields: DocFields) => void; onLater?: () => void;
}) {
  const [type, setType] = useState<DocType>(t0);
  const [values, setValues] = useState<Record<string, string>>(f0.values);
  const [meds, setMeds] = useState(f0.meds.length || t0 !== "medication" ? f0.meds : [{ name: "", how: "" }]);
  const [step, setStep] = useState(0);
  const { run, pending, err } = useAct();
  const miss = missingCount(type, { values, meds: meds.filter((m) => m.name.trim()) });
  const field = (empty: boolean) => `mt-1 w-full rounded-xl border bg-card px-3 py-2.5 ${empty ? "border-warn/50 bg-warn-soft/40" : "border-line"}`;
  const setMed = (i: number, p: Partial<{ name: string; how: string }>) => setMeds((ms) => ms.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const save = () => run(async () => onDone(type, await confirmDocument(auth, id, type, { values, meds })));
  // 처음 열 때 한 번: 읽은 약 이름을 식약처 허가 목록과 맞춰 보고, 한두 글자 다르면 공식 이름을 제안한다
  const [suggest, setSuggest] = useState<Record<string, string[]>>({});
  // 진단서: 질병코드는 사진에서 병명보다 정확히 읽히니, 코드로 공식 병명을 찾아 보여 주고 사람이 고른다
  const [kcd, setKcd] = useState<{ asked: string; hit: KcdHit | null } | null>(null);
  const checkKcd = (code: string) => {
    if (type !== "certificate" || !code.trim()) return setKcd(null);
    kcdCheck(auth, code).then((hit) => setKcd({ asked: code.trim(), hit })).catch(() => {});
  };
  useEffect(() => {
    const code = f0.values["질병코드"]?.trim();
    if (t0 === "certificate" && code) kcdCheck(auth, code).then((hit) => setKcd({ asked: code, hit })).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 읽은 코드로 한 번만
  }, []);
  useEffect(() => {
    if (t0 !== "medication" || !f0.meds.length) return;
    suggestDrugNames(auth, f0.meds.map((m) => m.name)).then(setSuggest).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 처음 읽은 이름으로 한 번만
  }, []);

  const medMode = type === "medication";
  const total = medMode ? meds.length + 1 : 1; // 약마다 한 단계 + 마지막에 나머지 칸
  const at = Math.min(step, total - 1);
  const isMed = medMode && at < meds.length;
  const isLast = at === total - 1;
  const m = isMed ? meds[at] : null;

  return (
    <section className="view-in mt-4 rounded-xl bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold">{DOC_TYPE_LABEL[type]}{isMed && <span className="ml-2 text-sm font-normal text-muted tabular-nums">약 {at + 1}/{meds.length}</span>}</h2>
        {onLater && <button type="button" aria-label="닫기" onClick={onLater} className="-mr-2 flex h-11 w-11 min-h-0 items-center justify-center text-muted"><Icon name="close" size={18} /></button>}
      </div>
      {miss > 0 && <p className="text-sm text-muted">못 읽은 칸 {miss}개</p>}

      {isMed && m && (
        <div className="mt-3">
          <label className="block text-sm font-semibold">약 이름
            <input value={m.name} onChange={(e) => setMed(at, { name: e.target.value })} className={`${field(!m.name.trim())} font-semibold`} />
          </label>
          {suggest[m.name]?.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-muted">
              혹시
              {suggest[m.name].map((x) => (
                <button key={x} type="button" onClick={() => setMed(at, { name: m.name.replace(baseName(m.name), x) })} className="min-h-0 rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent">{x}</button>
              ))}
            </div>
          )}
          <label className="mt-3 block text-sm font-semibold">먹는 법
            <input value={m.how} onChange={(e) => setMed(at, { how: e.target.value })} placeholder="예: 1일 3회 식후" className={`${field(!m.how.trim())} font-normal`} />
          </label>
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={() => { setMeds((ms) => (ms.length > 1 ? ms.filter((_, j) => j !== at) : [{ name: "", how: "" }])); setStep(Math.max(0, at - (at === meds.length - 1 ? 1 : 0))); }} className="min-h-0 py-2 text-sm text-muted underline underline-offset-2">이 약 빼기</button>
            <button type="button" onClick={() => { setMeds((ms) => [...ms, { name: "", how: "" }]); setStep(meds.length); }} className="flex min-h-0 items-center gap-1 py-2 text-sm font-semibold text-accent"><Icon name="plus" size={14} />약 추가</button>
          </div>
        </div>
      )}

      {!isMed && (
        <>
          <label className="mt-3 block text-sm font-semibold">서류 종류
            <select value={type} onChange={(e) => { setType(e.target.value as DocType); setStep(0); }} className={field(false)}>
              {TYPES.map((k) => <option key={k} value={k}>{DOC_TYPE_LABEL[k]}</option>)}
            </select>
          </label>
          {hasForm(type) && (
            <div className="mt-3 space-y-2.5">
              {FIELD_LABELS[type].map((k) => (
                <label key={k} className="block text-sm font-semibold">{k}
                  <input value={values[k] ?? ""} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} onBlur={k === "질병코드" ? (e) => checkKcd(e.target.value) : undefined} className={`${field(!(values[k] ?? "").trim())} font-normal`} />
                </label>
              ))}
            </div>
          )}
        </>
      )}

      {!isMed && type === "receipt" && receiptNote(values) && <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">{receiptNote(values)}</p>}

      {!isMed && type === "certificate" && kcd && (
        kcd.hit ? (
          <div className="mt-3 rounded-xl bg-background p-3 text-sm">
            {kcd.hit.names.some((n) => n === (values["병명"] ?? "").trim()) ? (
              <p className="font-semibold text-accent">병명이 질병코드 {kcd.hit.code}와 맞아요</p>
            ) : (
              <>
                <p>질병코드 <b>{kcd.hit.code}</b>의 공식 병명 <span className="text-xs text-muted">(건강보험심사평가원{kcd.hit.exact ? "" : ", 뒷자리는 서류 그대로"})</span></p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {kcd.hit.names.map((n) => (
                    <button key={n} type="button" onClick={() => setValues((v) => ({ ...v, 병명: n }))} className="min-h-0 rounded-full bg-accent-soft px-3 py-1.5 font-semibold text-accent">{n}</button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <p className="mt-3 rounded-xl bg-warn-soft p-3 text-sm text-warn">‘{kcd.asked}’는 질병코드 목록에 없어요. 서류의 코드를 다시 확인해 주세요.</p>
        )
      )}

      {err && <p role="alert" className="mt-2 text-sm text-warn">{err}</p>}
      <div className={`mt-4 grid gap-2 ${at > 0 ? "grid-cols-[auto_1fr]" : ""}`}>
        {at > 0 && <button type="button" onClick={() => setStep(at - 1)} className="rounded-full bg-accent-soft px-6 py-3.5 font-semibold text-accent">이전</button>}
        <button type="button" disabled={pending} onClick={isLast ? save : () => setStep(at + 1)} className="rounded-full bg-primary px-5 py-3.5 font-semibold text-ink">
          {isLast ? (pending ? "저장 중…" : "저장") : "다음"}
        </button>
      </div>
    </section>
  );
}
