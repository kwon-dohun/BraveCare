"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractFromPaste, confirmDocItems } from "@/app/scan-actions";
import type { ScanResult, ScanProgress } from "@/lib/scan";
import type { Auth } from "@/lib/db";
import Link from "next/link";
import { DOC_TYPE_LABEL, hasForm, dateWarning, type DocFields, type DocItem, type DocType } from "@/lib/extract";
import ConfirmCard from "./ConfirmCard";
import { BLUR_MIN, sharpness } from "@/lib/blur";
import { toApp, useInApp } from "@/lib/app";
import Mascot from "@/components/Mascot";
import Icon from "@/components/Icon";
import Kept from "./Kept";

const KIND: Record<DocItem["kind"], string> = { schedule: "일정", medication: "복약", caution: "주의사항", contact: "문의처" };
const MAX = 3; // 한 번에 읽는 사진 수

// 올리기 전에 사진이 너무 흐린지 잰다(640px 폭 회색조). 읽을 수 없는 사진을 몇 초 기다린 뒤에야 알게 되는 일을 줄인다.
async function isBlurry(file: Blob): Promise<boolean> {
  try {
    const bmp = await createImageBitmap(file);
    const w = 640, h = Math.max(3, Math.round((bmp.height * w) / bmp.width));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(bmp, 0, 0, w, h);
    const px = ctx.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let i = 0; i < gray.length; i++) gray[i] = (px[i * 4] * 299 + px[i * 4 + 1] * 587 + px[i * 4 + 2] * 114) / 1000;
    return sharpness(gray, w, h) < BLUR_MIN;
  } catch {
    return false; // 재지 못하면 막지 않고 그냥 읽는다
  }
}

// 화면에는 영어·오류 코드를 보이지 않는다. 서버가 한글로 준 말은 그대로, 그 밖(연결 끊김·시간 초과 등)은 이유를 풀어 쓴다.
// retryable: 같은 사진으로 다시 읽어 볼 만한 오류(연결·시간·일시 장애). 서류가 아니라는 판정 같은 건 다시 해도 같으니 false.
function friendly(e: unknown): { msg: string; retryable: boolean } {
  const m = e instanceof Error ? e.message : "";
  if (m === "TIMEOUT") return { msg: "읽는 시간이 너무 오래 걸려서 멈췄어요. 서류에 글자가 아주 많거나 연결이 느릴 때 생겨요.", retryable: true };
  if (!/[가-힣]/.test(m)) return { msg: "인터넷 연결이 끊겨서 읽지 못했어요. 화면을 켜 둔 채 연결을 확인하고 다시 읽어 주세요.", retryable: true };
  return { msg: m, retryable: /^(지금은 서류 인식이 어려워요|읽는 도중|서류를 읽지 못했어요)/.test(m) };
}

// 서류 사진을 읽는 동안 서버가 흘려 주는 진행 상황(서류 종류, 옮겨 적은 글자 수)을 받아 화면에 알리고, 끝나면 결과를 돌려준다
async function scanImage(auth: Auth, image: string, onProgress: (p: ScanProgress) => void): Promise<ScanResult> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 21_000); // 서버는 18초에 포기한다. 그보다 조금 더 기다린 뒤 화면이 먼저 알린다
  try {
    return await readScan(auth, image, onProgress, ctl.signal);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw new Error("TIMEOUT");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function readScan(auth: Auth, image: string, onProgress: (p: ScanProgress) => void, signal: AbortSignal): Promise<ScanResult> {
  const res = await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auth, image }), signal });
  if (!res.ok || !res.body) throw new Error("서류를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요");
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let result: ScanResult | null = null;
  const take = (line: string) => {
    if (!line.trim()) return;
    const m = JSON.parse(line);
    if (m.err) throw new Error(m.err);
    if (m.p) onProgress(m.p);
    if (m.done) result = m.done;
  };
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    lines.forEach(take);
  }
  take(buf);
  if (!result) throw new Error("읽는 도중 연결이 끊겼어요. 같은 사진으로 다시 읽어 볼 수 있어요");
  return result;
}

export interface SavedDoc { id: string; type: DocType; text: string; date: string; fields?: DocFields | null; confirmed: boolean }

interface Row extends DocItem { quote: string; include: boolean; warn?: string | null }

// 스마트폰 고화질 원본(10~20MB)을 1200px / 수백 KB로 전처리 압축하여 Vercel 타임아웃 및 OpenAI 페이로드 초과를 방지
async function toJpegBase64(file: Blob): Promise<string> {
  const drawAndExport = (source: CanvasImageSource, width: number, height: number): string => {
    const s = Math.min(1, 1200 / Math.max(width, height));
    const c = document.createElement("canvas");
    c.width = Math.round(width * s);
    c.height = Math.round(height * s);
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("캔버스를 초기화하지 못했어요");
    ctx.drawImage(source, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.82).split(",")[1];
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
  const [toConfirm, setToConfirm] = useState<string[]>([]); // 방금 찍어 확인을 기다리는 서류 id
  // 확인하면 서류함의 그 서류도 바로 바꾼다
  const confirmed = (id: string, type: DocType, fields: DocFields) => {
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, type, fields, confirmed: true } : d)));
    setToConfirm((ids) => ids.filter((x) => x !== id));
  };
  const [err, setErr] = useState("");
  const [failedRead, setFailedRead] = useState(false); // 사진 읽기에서 난 오류(전용 안내 카드)
  const [retry, setRetry] = useState<Blob[]>([]); // 다시 읽어 볼 만한 사진(성공한 것은 빼서 중복 저장 방지)
  const [busy, setBusy] = useState("");
  const [phase, setPhase] = useState<"prep" | "read">("read"); // 지금 실제로 하고 있는 일
  const [live, setLive] = useState<ScanProgress>({ chars: 0, sorting: false });
  const [paste, setPaste] = useState("");
  const [pending, start] = useTransition();

  // 고를 것은 달력에 넣을 날짜(외래·검사)뿐이다. 약 이름·주의사항·문의처는 서류함 글자로만 남기고 할 일로 만들지 않는다
  const toRows = (items: DocItem[]) => {
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
    return items.filter((i) => i.kind === "schedule").map((i) => {
      const warn = i.date ? dateWarning(i.date, today) : null; // 지난 날짜·너무 먼 날짜는 체크를 빼 두고 알려 준다
      return { ...i, quote: i.text, include: !i.needsCheck && !warn, warn };
    });
  };

  const app = useInApp();

  const [blurAsk, setBlurAsk] = useState<Blob[] | null>(null); // 흐린 사진이 있어 읽기 전에 물어보는 중

  const onFiles = async (list: FileList | Blob[] | null, force = false) => {
    const files = [...(list ?? [])].slice(0, MAX);
    if (!files.length) return;
    setBlurAsk(null);
    if (!force) {
      setBusy("사진 확인"); setPhase("prep");
      const blurry = (await Promise.all(files.map(isBlurry))).some(Boolean);
      setBusy("");
      if (blurry) { setBlurAsk(files); return; }
    }
    setErr(""); setFailedRead(false); setRetry([]); setRows(null); setFound([]); setToConfirm([]);
    const all: Row[] = [];
    const again: Blob[] = [];
    const types: DocType[] = [];

    for (const [i, f] of files.entries()) {
      setBusy(files.length > 1 ? `${files.length}장 중 ${i + 1}장째` : "서류 1장");
      setPhase("prep");
      try {
        const b64 = await toJpegBase64(f);
        setPhase("read");
        setLive({ chars: 0, sorting: false });
        const r = await scanImage(auth, b64, setLive);
        types.push(r.docType);
        all.push(...toRows(r.items));
        if (r.docId) {
          setDocs((prev) => [{ id: r.docId!, type: r.docType, text: r.transcript, date: "방금", fields: r.fields, confirmed: false }, ...prev]);
          if (hasForm(r.docType)) setToConfirm((ids) => [...ids, r.docId!]);
        }
      } catch (e) {
        const { msg, retryable } = friendly(e);
        setErr(msg); setFailedRead(true);
        if (retryable) again.push(f);
      }
    }
    setBusy("");
    setRetry(again);
    if (types.length > 0) {
      setFound([...new Set(types)]);
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
    setErr(""); setRows(null); setFound([]); setBusy("병원 문자"); setPhase("read");
    try {
      const res = await extractFromPaste(auth, paste);
      setRows(toRows(res.items));
      setFound(["message"]);
      if (res.docId) setDocs((prev) => [{ id: res.docId!, type: "message", text: res.transcript, date: "방금", confirmed: false }, ...prev]);
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
      {r.warn && <p className="mt-2 text-xs font-medium text-warn">{r.warn}</p>}
      <p className="mt-2 text-xs text-muted">서류에 적힌 그대로: “{r.quote}”</p>
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
      <p className="mt-2 text-sm text-muted">사진은 글자만 읽고 저장하지 않아요. 한 번에 최대 {MAX}장까지 고를 수 있어요.</p>

      <details className="mt-4 rounded-xl bg-card shadow-card p-4">
        <summary className="cursor-pointer font-semibold">병원 문자·알림톡 붙여넣기</summary>
        <p className="mt-2 text-sm text-muted">예약 안내 문자를 복사해서 붙여넣으면 날짜가 적힌 줄을 일정으로 만들어요.</p>
        <button type="button" onClick={fromClipboard} className="mt-2 w-full rounded-xl border border-line px-4 py-2">복사한 글 붙여넣기</button>
        <label htmlFor="pt" className="sr-only">병원 문자 내용</label>
        <textarea id="pt" rows={4} maxLength={2000} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="예: [OO병원] 11월 27일(금) 14:00 정형외과 외래 예약" className="mt-2 w-full rounded-xl border border-line px-3 py-2" />
        <button type="button" disabled={!!busy || paste.trim().length < 5} onClick={onPaste} className="mt-2 w-full rounded-full bg-accent-soft px-4 py-3 font-semibold text-accent disabled:opacity-40">일정 찾기</button>
      </details>

      {busy ? (
        <ScanningCard key={busy} busyText={busy} phase={phase} live={live} photo={busy !== "병원 문자"} />
      ) : null}
      {blurAsk && (
        <section role="alert" className="view-in mt-4 rounded-xl bg-warn-soft p-4">
          <p className="font-semibold text-ink">사진이 많이 흐려요</p>
          <p className="mt-1 text-sm leading-relaxed text-warn">흐린 사진은 약 이름이나 숫자를 틀리게 읽을 수 있어요. 밝은 곳에서 종이 전체가 또렷하게 보이게 다시 찍으면 훨씬 정확해요.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setBlurAsk(null)} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-ink">다시 찍을게요</button>
            <button type="button" onClick={() => onFiles(blurAsk, true)} className="rounded-full bg-card px-4 py-2.5 text-sm font-semibold shadow-card">그래도 읽기</button>
          </div>
        </section>
      )}
      {err && !failedRead && <p role="alert" className="mt-3 text-warn font-medium leading-relaxed">{err}</p>}
      {err && failedRead && (
        <section role="alert" className="view-in mt-4 rounded-xl bg-warn-soft p-4">
          <p className="font-semibold text-ink">서류를 읽지 못했어요</p>
          <p className="mt-1 text-sm leading-relaxed text-warn">{err}</p>
          <p className="mt-2 text-sm text-muted">사진은 저장되지 않았고, 찍은 내용은 그대로 안전해요.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {retry.length > 0 && (
              <button type="button" disabled={!!busy} onClick={() => onFiles(retry, true)} className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-ink">같은 사진으로 다시 읽기</button>
            )}
            <Link href={`${base}/tasks`} className="flex items-center rounded-full bg-card px-4 py-2.5 text-sm font-semibold shadow-card">일정 직접 추가하기</Link>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-muted">계속 안 되면 밝은 곳에서 종이 전체가 보이게 다시 찍어 보세요. 병원 문자는 아래 ‘병원 문자·알림톡 붙여넣기’로 바로 일정을 만들 수 있어요.</p>
        </section>
      )}
      {found.length > 0 && (
        <section role="status" className="view-in mt-4 rounded-xl bg-accent-soft p-4 text-sm text-accent">
          <p className="font-semibold text-ink">{found.map((t) => DOC_TYPE_LABEL[t]).join(", ")}을 읽어서 내 서류함에 넣었어요</p>
          <p className="mt-1">사진은 저장하지 않고 글자만 남겨요. 아래 내 서류함에서 다시 볼 수 있고, 씩씩이에게 물어보면 이 내용으로 답해요.</p>
          {found.includes("guide") && rows && rows.length === 0 && (
            <p className="mt-2 text-ink/80">외래·검사 날짜를 찾지 못했어요. 날짜가 보이게 다시 찍거나, 일정 탭에서 직접 추가해 주세요.</p>
          )}
          {found.includes("receipt") && (
            <p className="mt-2 text-ink/80">영수증은 보험 청구에 쓰는 서류예요. <Link href={`${base}/docs`} className="font-semibold underline">보험 청구 서류</Link>에서 챙긴 서류를 체크해 두세요.</p>
          )}
        </section>
      )}

      {/* 방금 찍은 서류마다 양식으로 확인받기(강제하지 않음: 나중에 서류함에서 해도 된다) */}
      {toConfirm.map((id) => {
        const d = docs.find((x) => x.id === id);
        return d?.fields ? (
          <ConfirmCard key={id} auth={auth} id={id} type={d.type} fields={d.fields} onDone={(t, f) => confirmed(id, t, f)} onLater={() => setToConfirm((ids) => ids.filter((x) => x !== id))} />
        ) : null;
      })}

      {/* 고를 것이 있을 때만: 서류에 적힌 외래·검사 날짜를 달력에 넣을지 */}
      {rows && rows.length > 0 && (
        <section className="view-in mt-5" aria-labelledby="rv">
          <h2 id="rv" className="font-semibold">달력에 넣을 병원 일정</h2>
          <p className="text-sm text-muted">서류에서 찾은 날짜예요. 맞는 것만 체크해서 넣어 주세요.</p>
          <ul className="mt-3 space-y-3">{rows.map((r, i) => rowItem(r, i))}</ul>
          <button onClick={confirm} disabled={pending || chosen.length === 0} className="mt-4 w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">
            {pending ? "넣는 중…" : chosen.length ? `${chosen.length}개 달력에 넣기` : "넣을 일정을 체크해 주세요"}
          </button>
        </section>
      )}

      <section className="mt-8" aria-labelledby="kp">
        <h2 id="kp" className="font-semibold">내 서류함 <span className="tabular-nums text-muted">{docs.length}</span></h2>
        <p className="text-sm text-muted">찍은 서류의 글자가 여기 모여요. 씩씩이는 이 내용을 보고 답해요.</p>
        {docs.length > 0 ? (
          <Kept
            auth={auth}
            docs={docs}
            onDelete={(id) => setDocs((prev) => prev.filter((d) => d.id !== id))}
            onConfirmed={confirmed}
          />
        ) : (
          <div className="mt-3 rounded-xl bg-card p-4 text-center text-xs text-muted shadow-card">
            아직 넣어 둔 서류가 없어요. 위에서 서류를 찍거나 병원 문자를 붙여 넣어 보세요.
          </div>
        )}
      </section>
    </>
  );
}

// 실제로 처리 중인 단계만 보여준다: 폰에서 사진 줄이기 → 서버에서 글자 읽기(날짜 찾기·원문 대조까지 한 번에).
// 서버 안의 세부 단계는 밖에서 알 수 없어서 시간으로 꾸며 내지 않는다. 대신 막대는 계속 흘러 멈춘 느낌이 없게 한다.
function ScanningCard({ busyText, phase, live, photo }: { busyText: string; phase: "prep" | "read"; live: ScanProgress; photo: boolean }) {
  const [slow, setSlow] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setSlow(true), 8000);
    const id2 = setTimeout(() => setLong(true), 15000);
    return () => { clearTimeout(id); clearTimeout(id2); };
  }, []);
  const steps: [string, boolean, boolean][] = photo
    ? [
        ["사진을 읽기 좋게 줄이는 중", phase === "read", phase === "prep"],
        [live.docType ? DOC_TYPE_LABEL[live.docType] + "로 보여요" : "어떤 서류인지 보는 중", !!live.docType, phase === "read" && !live.docType],
        [live.chars > 0 ? "글자를 옮겨 적는 중 · " + live.chars + "자" : "글자를 옮겨 적는 중", live.sorting, !!live.docType && !live.sorting],
        ["일정·약 이름을 정리하는 중", false, live.sorting],
      ]
    : [["문자에서 날짜를 찾는 중", false, true]];

  return (
    <section aria-live="polite" className="view-in mt-5 rounded-2xl bg-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Mascot size={40} className="mascot-bob shrink-0" />
        <p className="text-sm font-semibold">{busyText} 읽는 중</p>
      </div>
      <ol className="mt-4 space-y-2.5">
        {steps.map(([label, done, now], i) => (
          <li key={i} className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${now ? "font-semibold text-ink" : "text-muted"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${done ? "bg-primary text-ink" : now ? "bg-accent-soft ring-[1.5px] ring-primary" : "bg-line"}`}>
              {done ? <Icon name="check" size={12} /> : now ? <span className="dot-bounce h-1.5 w-1.5 rounded-full bg-accent" /> : null}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-line" aria-hidden>
        <div className="pulse-bar h-full w-1/2 rounded-full bg-primary" />
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        {long ? "평소보다 오래 걸리고 있어요. 곧 멈추고 다시 읽을 수 있게 알려 드릴게요." : slow ? "조금 더 걸리고 있어요. 글자가 많은 서류는 10초쯤 걸릴 수 있어요." : "보통 3~8초 걸려요. 화면을 닫지 말고 잠시만 기다려 주세요."}
      </p>
    </section>
  );
}
