"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractFromImage, extractFromPaste, confirmDocItems } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import Link from "next/link";
import { DOC_TYPE_LABEL, type DocItem, type DocType } from "@/lib/extract";
import { toApp, useInApp } from "@/lib/app";
import Mascot from "@/components/Mascot";
import Kept from "./Kept";

const KIND: Record<DocItem["kind"], string> = { schedule: "일정", medication: "복약", caution: "주의사항", contact: "문의처" };
const MAX = 3; // 한 번에 읽는 사진 수

export interface SavedDoc {
  id: string;
  label: string;
  preview: string;
  date: string;
  cautions?: string[];
}

interface Row extends DocItem { quote: string; include: boolean }

// 고화질 서류의 작은 글자도 식별할 수 있도록 1800px 캔버스로 변환하며, 브라우저 호환성을 위해 Image fallback 지원
async function toJpegBase64(file: Blob): Promise<string> {
  const drawAndExport = (source: CanvasImageSource, width: number, height: number): string => {
    const s = Math.min(1, 1800 / Math.max(width, height));
    const c = document.createElement("canvas");
    c.width = Math.round(width * s);
    c.height = Math.round(height * s);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("캔버스를 초기화하지 못했어요");
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.88).split(",")[1];
  };

  try {
    const bmp = await createImageBitmap(file);
    return drawAndExport(bmp, bmp.width, bmp.height);
  } catch {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        try {
          resolve(drawAndExport(img, img.naturalWidth, img.naturalHeight));
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("사진 이미지를 불러오지 못했어요. 다시 촬영해 주세요"));
      };
      img.src = url;
    });
  }
}

export default function ScanFlow({ auth, base, initialDocs = [] }: { auth: Auth; base: string; initialDocs?: SavedDoc[] }) {
  const router = useRouter();
  const [docs, setDocs] = useState<SavedDoc[]>(initialDocs);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [found, setFound] = useState<DocType[]>([]);
  const [cautions, setCautions] = useState<string[]>([]);
  const [scannedDocs, setScannedDocs] = useState<{ docType: DocType; transcript: string; itemsCount: number }[]>([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [paste, setPaste] = useState("");
  const [pending, start] = useTransition();

  // 날짜가 있는 일정만 기본으로 넣는다. 약·주의사항·문의처는 보관함에 글자로 남기고, 할 일로 만들지는 사용자가 고른다
  const toRows = (items: DocItem[]) => items.map((i) => ({ ...i, quote: i.text, include: i.kind === "schedule" && !i.needsCheck }));

  const app = useInApp();

  const onFiles = async (list: FileList | Blob[] | null) => {
    const files = [...(list ?? [])].slice(0, MAX);
    if (!files.length) return;
    setErr(""); setRows(null); setFound([]); setCautions([]); setScannedDocs([]);
    const all: Row[] = [];
    const types: DocType[] = [];
    const allCautions: string[] = [];
    const newScanned: { docType: DocType; transcript: string; itemsCount: number }[] = [];
    let failed = 0;

    for (const [i, f] of files.entries()) {
      setBusy(`${files.length}장 중 ${i + 1}장째 읽는 중… (장당 10초쯤 걸려요)`);
      try {
        const b64 = await toJpegBase64(f);
        const r = await extractFromImage(auth, b64);
        types.push(r.docType);
        all.push(...toRows(r.items));
        if (r.cautions?.length) allCautions.push(...r.cautions);
        newScanned.push({ docType: r.docType, transcript: r.transcript, itemsCount: r.items.length });
        if (r.docId && r.transcript) {
          setDocs((prev) => [
            {
              id: r.docId!,
              label: DOC_TYPE_LABEL[r.docType] ?? "기타 서류",
              preview: r.transcript.slice(0, 60),
              date: "방금",
              cautions: r.cautions,
            },
            ...prev,
          ]);
        }
      } catch (e) {
        failed++;
        setErr(e instanceof Error ? e.message : "읽지 못했어요. 다시 촬영해주세요");
      }
    }
    setBusy("");
    if (types.length > 0) {
      setFound([...new Set(types)]);
      setCautions([...new Set(allCautions)]);
      setScannedDocs(newScanned);
      setRows(all);
      router.refresh();
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
    setErr(""); setRows(null); setFound([]); setScannedDocs([]); setBusy("읽는 중…");
    try {
      const res = await extractFromPaste(auth, paste);
      setRows(toRows(res.items));
      setFound(["message"]);
      setScannedDocs([{ docType: "message", transcript: res.transcript, itemsCount: res.items.length }]);
      if (res.docId) {
        setDocs((prev) => [
          {
            id: res.docId!,
            label: "병원 문자",
            preview: res.transcript.slice(0, 60),
            date: "방금",
          },
          ...prev,
        ]);
      }
      router.refresh();
    }
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
        // 일정만 넣었으면 달력으로, 할 일도 넣었으면 목록으로
        router.push(chosen.every((r) => r.kind === "schedule") ? `${base}/tasks` : `${base}/tasks?view=list`);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "추가하지 못했어요");
      }
    });

  const rowItem = (r: Row, i: number) => (
    <li key={i} className={`rounded-xl p-3 ${blocked(r) ? "bg-warn-soft" : "bg-background"}`}>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1.5 h-5 w-5" checked={r.include && !blocked(r)} disabled={blocked(r)} onChange={(e) => upd(i, { include: e.target.checked })} />
        <span className="flex-1">
          <span className="text-sm font-medium text-accent">{KIND[r.kind]}</span>
          {blocked(r) && <span className="ml-2 text-sm font-medium text-warn">날짜가 맞는지 직접 넣어주세요</span>}
          <textarea value={r.text} rows={2} aria-label="항목 내용" onChange={(e) => upd(i, { text: e.target.value })} className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2" />
        </span>
      </label>
      {r.kind === "schedule" && (
        <input type="date" aria-label="날짜" value={r.date ?? ""} onChange={(e) => upd(i, { date: e.target.value || null, include: !!e.target.value })} className="mt-2 w-full rounded-lg border border-line bg-card px-3 py-2" />
      )}
      <p className="mt-2 text-xs text-muted">원문: “{r.quote}”</p>
    </li>
  );

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
      <p className="mt-2 text-sm text-muted">진단서·확인서, 퇴원 안내문, 약봉투, 영수증을 한 번에 {MAX}장까지 고를 수 있어요. 종이 전체가 보이게 밝은 곳에서 찍어주세요. 사진은 글자를 읽은 뒤 저장하지 않고, 읽은 글자만 보관해요.</p>

      <details className="mt-4 rounded-xl bg-card shadow-card p-4">
        <summary className="cursor-pointer font-semibold">병원 문자·알림톡 붙여넣기</summary>
        <p className="mt-2 text-sm text-muted">예약 안내 문자를 복사해서 붙여넣으면 날짜가 적힌 줄을 일정으로 만들어요.</p>
        <button type="button" onClick={fromClipboard} className="mt-2 w-full rounded-xl border border-line px-4 py-2">복사한 글 붙여넣기</button>
        <label htmlFor="pt" className="sr-only">병원 문자 내용</label>
        <textarea id="pt" rows={4} maxLength={2000} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="예: [OO병원] 11월 27일(금) 14:00 정형외과 외래 예약" className="mt-2 w-full rounded-xl border border-line px-3 py-2" />
        <button type="button" disabled={!!busy || paste.trim().length < 5} onClick={onPaste} className="mt-2 w-full rounded-full bg-accent-soft px-4 py-3 font-semibold text-accent disabled:opacity-40">일정 찾기</button>
      </details>

      {busy ? (
        <ScanningCard busyText={busy} />
      ) : null}
      {err && <p role="alert" className="mt-3 text-warn font-medium leading-relaxed">{err}</p>}
      {found.length > 0 && (
        <section role="status" className="mt-4 rounded-xl bg-accent-soft p-4 text-sm text-accent">
          <p className="font-semibold text-ink">✅ 서류 분석 완료: {found.map((t) => DOC_TYPE_LABEL[t]).join(", ")}</p>
          <p className="mt-1 font-medium">
            사진 원본은 개인정보 보호를 위해 저장하지 않고, <strong>읽어낸 글자만 서류 보관함에 안전하게 저장했어요.</strong>
          </p>
          <p className="mt-1 text-xs text-muted">
            화면 아래 &lsquo;보관한 서류 글자&rsquo;에서 언제든 확인하실 수 있고, 씩씩이에게 질문할 때 답변 근거로 쓰여요.
          </p>
          {found.includes("medication") && (
            <p className="mt-2 text-xs text-ink/80">약봉투는 데일리 체크에서 복약 여부를 챙겨드리므로 별도 할 일로 등록하지 않아요.</p>
          )}
          {found.includes("receipt") && (
            <p className="mt-2 text-xs text-ink/80">영수증은 보험 청구에 쓰는 서류예요. <Link href={`${base}/docs`} className="font-semibold underline">보험 청구 서류</Link>에서 챙긴 서류를 체크해 두세요.</p>
          )}
        </section>
      )}

      {scannedDocs.length > 0 && (
        <div className="mt-3 space-y-3">
          {scannedDocs.map((s, idx) => (
            <div key={idx} className="rounded-xl border border-line bg-card p-4 shadow-sm text-xs">
              <div className="flex items-center justify-between font-semibold text-ink">
                <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-accent">{DOC_TYPE_LABEL[s.docType]}</span>
                <span className="text-[11px] font-normal text-muted">보관함에 저장 완료</span>
              </div>
              <p className="mt-2 text-ink/80 bg-background p-2.5 rounded-lg line-clamp-4 font-mono whitespace-pre-wrap leading-relaxed">
                {s.transcript}
              </p>
              {s.itemsCount === 0 && (
                <p className="mt-2 text-xs text-muted">
                  ℹ️ 서류 글자가 보관함에 안전하게 저장되었어요. 외래 방문 일정이 적힌 서류가 아니라서 캘린더에 추가할 일정은 없습니다. 씩씩이에게 이 서류 내용을 물어보시면 즉시 답변해 드려요!
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {cautions.length > 0 && (
        <aside className="mt-3 rounded-xl bg-[#fff4cc] p-3.5 text-sm text-[#7a5a00]" aria-label="약 보관 및 복약 주의사항">
          <p className="text-xs font-semibold">약 보관 및 복약 주의사항</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {cautions.map((c) => (
              <span key={c} className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-[#7a5a00]">{c}</span>
            ))}
          </div>
        </aside>
      )}

      {rows && rows.some((r) => r.kind === "schedule") && (
        <section className="mt-5" aria-labelledby="rv">
          <h2 id="rv" className="font-semibold">일정으로 넣을 것</h2>
          <p className="text-sm text-muted">서류와 비교해 맞는 것만 체크하세요. 체크한 일정은 가족 달력에 들어가요.</p>
          <ul className="mt-3 space-y-3">{rows.map((r, i) => r.kind === "schedule" && rowItem(r, i))}</ul>
        </section>
      )}

      {rows && rows.some((r) => r.kind !== "schedule") && (
        <details className="mt-5 rounded-xl bg-card p-4 shadow-card">
          <summary className="cursor-pointer font-semibold">참고 내용 {rows.filter((r) => r.kind !== "schedule").length}개 <span className="text-sm font-normal text-muted">· 보관함에 저장됨</span></summary>
          <p className="mt-2 text-sm text-muted">약 이름·주의사항·문의처예요. 따로 할 일로 만들 필요는 없어요. 챙겨야 할 것만 체크하면 할 일로 넣어요.</p>
          <ul className="mt-3 space-y-3">{rows.map((r, i) => r.kind !== "schedule" && rowItem(r, i))}</ul>
        </details>
      )}

      {rows && rows.length > 0 && (
        <button onClick={confirm} disabled={pending || chosen.length === 0} className="mt-5 w-full rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">
          {pending ? "넣는 중…" : chosen.length ? `선택한 ${chosen.length}개 넣기` : "넣을 일정이 없어요 (글자는 저장됨)"}
        </button>
      )}

      <section className="mt-8" aria-labelledby="kp">
        <h2 id="kp" className="font-semibold">보관한 서류 글자 ({docs.length})</h2>
        <p className="text-sm text-muted">&lsquo;서류 내용 물어보기&rsquo;가 이 글자만 근거로 답해요. 지우면 바로 사라져요.</p>
        {docs.length > 0 ? (
          <Kept
            auth={auth}
            docs={docs}
            onDelete={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
          />
        ) : (
          <div className="mt-3 rounded-xl bg-card p-4 text-center text-xs text-muted shadow-card">
            아직 보관한 서류가 없어요. 위에서 서류를 촬영하거나 병원 문자를 붙여넣어 보세요.
          </div>
        )}
      </section>
    </>
  );
}

const SCAN_STEPS = [
  "1단계: 서류에 적힌 글자를 그대로 읽어내고 있어요",
  "2단계: 외래 일정과 주의사항을 찾고 있어요",
  "3단계: 원문에 실제로 있는 내용인지 대조하고 있어요",
];

function ScanningCard({ busyText }: { busyText: string }) {
  const [stepIdx, setStepIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIdx((i) => (i + 1) % SCAN_STEPS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, []);

  return (
    <section aria-live="polite" className="mt-5 overflow-hidden rounded-2xl bg-card p-5 shadow-card border border-line">
      <div className="flex items-center gap-3">
        <Mascot size={40} className="mascot-bob shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{busyText}</p>
          <p className="mt-0.5 text-xs font-medium text-accent transition-all duration-300">
            {SCAN_STEPS[stepIdx]}
          </p>
        </div>
      </div>

      {/* 가상 서류 스캔 비주얼 박스 */}
      <div className="relative mt-4 h-24 overflow-hidden rounded-xl border border-dashed border-[#c5d9cf] bg-background p-3 flex flex-col justify-around">
        {/* 스캔 레이저 바 */}
        <div className="scan-beam absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_8px_#62deae]" />
        
        {/* 가상 텍스트 라인 스켈레톤 */}
        <div className="h-2 w-3/4 rounded-full bg-line" />
        <div className="h-2 w-1/2 rounded-full bg-line" />
        <div className="h-2 w-4/5 rounded-full bg-line" />
        <div className="h-2 w-2/3 rounded-full bg-line" />
      </div>

      {/* 부드러운 진행 프로그레스 바 */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line">
        <div className="pulse-bar h-full w-1/2 rounded-full bg-primary" />
      </div>

      <p className="mt-2 text-center text-xs text-muted">
        서류 1장당 5~10초 정도 걸려요. 화면을 닫지 말고 잠시만 기다려 주세요.
      </p>
    </section>
  );
}
