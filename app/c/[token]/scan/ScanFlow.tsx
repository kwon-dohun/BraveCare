"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractFromImage, confirmDocItems } from "@/app/scan-actions";
import type { Auth } from "@/lib/db";
import type { DocItem } from "@/lib/extract";

const KIND: Record<DocItem["kind"], string> = { schedule: "일정", medication: "복약", caution: "주의사항", contact: "문의처" };

interface Row extends DocItem { quote: string; include: boolean }

// 서버 업로드 한도와 속도를 위해 긴 변 1600px JPEG로 줄인다
async function toJpegBase64(file: File): Promise<string> {
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
  const [preview, setPreview] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setErr(""); setRows(null); setBusy(true);
    setPreview(URL.createObjectURL(f));
    try {
      const { items, empty } = await extractFromImage(auth, await toJpegBase64(f));
      if (empty) setErr("인식하지 못한 부분이 있어요. 더 밝은 곳에서 다시 촬영하거나, 할 일을 직접 추가해주세요.");
      setRows(items.map((i) => ({ ...i, quote: i.text, include: !i.needsCheck })));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "인식에 실패했어요. 다시 촬영해주세요");
    } finally {
      setBusy(false);
    }
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
      <label className="flex cursor-pointer items-center justify-center rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white">
        {busy ? "읽는 중…" : rows ? "다시 촬영하기" : "안내문 촬영 또는 사진 선택"}
        <input type="file" accept="image/*" capture="environment" className="sr-only" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
      <p className="mt-2 text-sm text-muted">종이 전체가 보이게, 밝은 곳에서 찍어주세요. 사진은 글자를 읽은 뒤 저장하지 않고 버려요.</p>
      {err && <p role="alert" className="mt-3 text-warn">{err}</p>}

      {preview && rows && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="촬영한 안내문" className="mt-4 max-h-56 w-full rounded-xl border border-line object-contain" />
      )}

      {rows && rows.length > 0 && (
        <section className="mt-5" aria-labelledby="rv">
          <h2 id="rv" className="font-bold">안내문에서 찾은 항목</h2>
          <p className="text-sm text-muted">사진과 비교해 맞는 것만 체크하세요. 체크한 항목만 타임라인에 들어가요.</p>
          <ul className="mt-3 space-y-3">
            {rows.map((r, i) => (
              <li key={i} className={`rounded-xl border p-3 ${blocked(r) ? "border-warn bg-warn-soft" : "border-line bg-card"}`}>
                <label className="flex items-start gap-3">
                  <input type="checkbox" className="mt-1.5 h-5 w-5" checked={r.include && !blocked(r)} disabled={blocked(r)} onChange={(e) => upd(i, { include: e.target.checked })} />
                  <span className="flex-1">
                    <span className="text-sm font-medium text-accent">{KIND[r.kind]}</span>
                    {blocked(r) && <span className="ml-2 text-sm font-medium text-warn">확인 필요 · 날짜를 입력해주세요</span>}
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
          <button onClick={confirm} disabled={pending || chosen.length === 0} className="mt-5 w-full rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white disabled:opacity-40">
            {pending ? "추가하는 중…" : `선택한 ${chosen.length}개 할 일에 추가`}
          </button>
        </section>
      )}
    </>
  );
}
