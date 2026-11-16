"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractFromImage, extractFromPaste, confirmDocItems } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import { DOC_TYPE_LABEL, type DocItem } from "@/lib/extract";
import { toApp, useInApp } from "@/lib/app";

const KIND: Record<DocItem["kind"], string> = { schedule: "일정", medication: "복약", caution: "주의사항", contact: "문의처" };
const MAX = 3; // 한 번에 읽는 사진 수

interface Row extends DocItem { quote: string; include: boolean }

// 서버 업로드 한도와 속도를 위해 긴 변 1600px JPEG로 줄인다
async function toJpegBase64(file: Blob): Promise<string> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * s);
  c.height = Math.round(bmp.height * s);
  c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.82).split(",")[1];
}

export default function ScanFlow({ auth, base }: { auth: Auth; base: string }) {
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [paste, setPaste] = useState("");
  const [pending, start] = useTransition();
  const toRows = (items: DocItem[]) => items.map((i) => ({ ...i, quote: i.text, include: !i.needsCheck }));

  const app = useInApp();

  const onFiles = async (list: FileList | Blob[] | null) => {
    const files = [...(list ?? [])].slice(0, MAX);
    if (!files.length) return;
    setErr(""); setRows(null); setFound([]);
    const all: Row[] = [];
    const types: string[] = [];
    let failed = 0;
    for (const [i, f] of files.entries()) {
      setBusy(`${files.length}장 중 ${i + 1}장째 읽는 중… (장당 10초쯤 걸려요)`);
      try {
        const r = await extractFromImage(auth, await toJpegBase64(f));
        types.push(DOC_TYPE_LABEL[r.docType]);
        all.push(...toRows(r.items));
      } catch (e) {
        failed++;
        setErr(e instanceof Error ? e.message : "읽지 못했어요. 다시 촬영해주세요");
      }
    }
    setBusy(""); setFound(types);
    if (failed < files.length) {
      setRows(all);
      if (!all.length) setErr("글자는 보관했지만 할 일로 만들 항목은 찾지 못했어요. 글자가 흐리면 밝은 곳에서 다시 촬영하거나, 할 일을 직접 추가해주세요.");
    }
  };

  // 앱의 문서 스캐너(자동으로 반듯하게 잘라 줌)가 찍은 사진을 받는다. 매번 최신 onFiles를 쓰도록 의존성 없이 다시 건다.
  useEffect(() => {
    const got = async (e: Event) => {
      const shots = (e as CustomEvent<string[]>).detail ?? [];
      onFiles(await Promise.all(shots.map((b) => fetch(`data:image/jpeg;base64,${b}`).then((r) => r.blob()))));
    };
    window.addEventListener("bravecare:scan", got);
    return () => window.removeEventListener("bravecare:scan", got);
  });

  const onPaste = async () => {
    setErr(""); setRows(null); setFound([]); setBusy("읽는 중…");
    try { setRows(toRows((await extractFromPaste(auth, paste)).items)); setFound([DOC_TYPE_LABEL.message]); }
    catch (e) { setErr(e instanceof Error ? e.message : "읽지 못했어요"); }
    setBusy("");
  };
  const fromClipboard = async () => {
    try { setPaste(await navigator.clipboard.readText()); } catch { setErr("붙여넣기가 막혀 있어요. 아래 칸을 길게 눌러 직접 붙여넣어 주세요."); }
  };

  const upd = (idx: number, patch: Partial<Row>) => setRows((rs) => rs!.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  // 일정인데 날짜가 불분명하면 직접 입력하기 전까지 반영할 수 없다
  const blocked = (r: Row) => r.kind === "schedule" && !r.date;
  const chosen = (rows ?? []).filter((r) => r.include && !blocked(r) && r.text.trim());

  const confirm = () =>
    start(async () => {
      try {
        await confirmDocItems(auth, chosen.map((r) => ({ kind: r.kind, text: r.text, quote: r.quote, date: r.date })));
        router.push(`${base}/tasks`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "추가하지 못했어요");
      }
    });

  return (
    <>
      {app && (
        <button type="button" disabled={!!busy} onClick={() => toApp({ t: "scan", max: MAX })} className="mb-2 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink">
          {busy ? "읽는 중…" : "문서 스캔하기 (자동으로 반듯하게)"}
        </button>
      )}
      <label className={`flex cursor-pointer items-center justify-center px-5 font-semibold ${app ? "rounded-full bg-accent-soft py-3 text-accent" : "rounded-xl bg-primary py-3.5 text-ink"}`}>
        {app ? "사진첩에서 고르기" : busy ? "읽는 중…" : rows ? "다시 촬영하기" : "촬영하거나 사진 고르기"}
        <input type="file" accept="image/*" multiple className="sr-only" disabled={!!busy} onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} />
      </label>
      <p className="mt-2 text-sm text-muted">퇴원 안내문, 약봉투, 영수증을 한 번에 {MAX}장까지 고를 수 있어요. 종이 전체가 보이게 밝은 곳에서 찍어주세요. 사진은 글자를 읽은 뒤 저장하지 않고, 읽은 글자만 보관해요.</p>

      <details className="mt-4 rounded-xl bg-card shadow-card p-4">
        <summary className="cursor-pointer font-semibold">병원 문자·알림톡 붙여넣기</summary>
        <p className="mt-2 text-sm text-muted">예약 안내 문자를 복사해서 붙여넣으면 날짜가 적힌 줄을 일정으로 만들어요.</p>
        <button type="button" onClick={fromClipboard} className="mt-2 w-full rounded-xl border border-line px-4 py-2">복사한 글 붙여넣기</button>
        <label htmlFor="pt" className="sr-only">병원 문자 내용</label>
        <textarea id="pt" rows={4} maxLength={2000} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="예: [OO병원] 11월 27일(금) 14:00 정형외과 외래 예약" className="mt-2 w-full rounded-xl border border-line px-3 py-2" />
        <button type="button" disabled={!!busy || paste.trim().length < 5} onClick={onPaste} className="mt-2 w-full rounded-full bg-accent-soft px-4 py-3 font-semibold text-accent disabled:opacity-40">일정 찾기</button>
      </details>

      {busy && <p role="status" className="mt-4 rounded-xl bg-card shadow-card p-4 text-muted">{busy}</p>}
      {err && <p role="alert" className="mt-3 text-warn">{err}</p>}
      {found.length > 0 && <p role="status" className="mt-3 text-sm text-accent">읽은 서류: {found.join(", ")}</p>}

      {rows && rows.length > 0 && (
        <section className="mt-5" aria-labelledby="rv">
          <h2 id="rv" className="font-semibold">찾은 항목을 원문과 비교해 주세요</h2>
          <p className="text-sm text-muted">서류와 비교해 맞는 것만 체크하세요. 체크한 항목만 타임라인에 들어가요.</p>
          <ul className="mt-3 space-y-3">
            {rows.map((r, i) => (
              <li key={i} className={`rounded-xl border p-3 ${blocked(r) ? "border-warn bg-warn-soft" : "border-line bg-card"}`}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1.5 h-5 w-5" checked={r.include && !blocked(r)} disabled={blocked(r)} onChange={(e) => upd(i, { include: e.target.checked })} />
                  <span className="flex-1">
                    <span className="text-sm font-medium text-accent">{KIND[r.kind]}</span>
                    {blocked(r) && <span className="ml-2 text-sm font-medium text-warn">날짜가 맞는지 직접 넣어주세요</span>}
                    <textarea
                      value={r.text} rows={2} aria-label="항목 내용"
                      onChange={(e) => upd(i, { text: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-line bg-white px-3 py-2"
                    />
                  </span>
                </label>
                {r.kind === "schedule" && (
                  <input type="date" aria-label="날짜" value={r.date ?? ""} onChange={(e) => upd(i, { date: e.target.value || null, include: !!e.target.value })} className="mt-2 w-full rounded-lg border border-line bg-white px-3 py-2" />
                )}
                <p className="mt-2 text-xs text-muted">원문: “{r.quote}”</p>
              </li>
            ))}
          </ul>
          <button onClick={confirm} disabled={pending || chosen.length === 0} className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">
            {pending ? "추가하는 중…" : `확인한 ${chosen.length}개를 할 일에 추가`}
          </button>
        </section>
      )}
    </>
  );
}
