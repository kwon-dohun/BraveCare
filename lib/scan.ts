import "server-only";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, type Auth } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { streamJson, hasModel } from "@/lib/openai";
import { EXTRACT_PROMPT, progressOf, type ScanProgress, parseModelJson, verifyItems, toDocItems, maskIds, validateTranscript, verifyFields, type DocFields, type DocItem, type DocType } from "@/lib/extract";

// 비용 방어: 케이스당 하루 횟수 제한
export async function limit(caseId: string, event: string, max: number, msg: string) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("name", event).gte("created_at", since);
  if ((count ?? 0) >= max) throw new Error(msg);
  await logEvent(caseId, event);
}

export type { ScanProgress };
export interface ScanResult { items: DocItem[]; docType: DocType; empty: boolean; transcript: string; fields: DocFields; docId: string | null }

// 원본 사진은 저장하지 않는다. 옮겨 적은 글자만 보관함에 남기고, 챗봇은 그 글자만 근거로 쓴다.
export async function extractImage(a: Auth, jpegBase64: string, onProgress?: (p: ScanProgress) => void): Promise<ScanResult> {
  const actor = await resolve(a);
  if (!hasModel()) throw new Error("서류 인식 설정이 아직 안 됐어요. 할 일을 직접 추가해주세요");
  if (!/^[A-Za-z0-9+/=]+$/.test(jpegBase64) || jpegBase64.length > 3_500_000) throw new Error("사진 크기가 너무 커요. 다시 촬영해주세요");
  await limit(actor.caseId, "doc_scan_started", 20, "오늘은 서류 인식 횟수를 다 썼어요. 내일 다시 시도하거나 할 일을 직접 추가해주세요");

  const raw = await streamJson(EXTRACT_PROMPT, [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}`, detail: "high" } }], (acc) => onProgress?.(progressOf(acc)));
  if (raw === null) throw new Error("지금은 서류 인식이 어려워요. 병원 문자를 복사해 ‘병원 문자·알림톡 붙여넣기’에 넣으면 바로 일정을 만들 수 있어요. 아니면 잠시 뒤 다시 시도하거나 할 일을 직접 추가해 주세요");
  const parsed = parseModelJson(raw);

  // 원문에 없는 항목은 여기서 버린다
  const items = toDocItems(verifyItems(parsed.transcript, parsed.items), todaySeoul());
  // 셀카·풍경처럼 병원 서류가 아닌 사진은 보관하지 않는다
  if (!validateTranscript(parsed.transcript, items.length)) {
    throw new Error("병원 서류(진단서, 퇴원 안내문, 약봉투, 영수증 등)로 읽히지 않았어요. 글자가 잘 보이게 밝은 곳에서 다시 찍어 주세요");
  }
  const transcript = maskIds(parsed.transcript).slice(0, 6000);
  // 종류별 양식 칸: 원문에 그대로 있는 값만 채운다. 사람이 확인하기 전까지는 '확인 안 함'
  const fields = verifyFields(transcript, parsed.docType, parsed);
  const { data: inserted, error: saveErr } = await db.from("documents").insert({
    case_id: actor.caseId,
    doc_type: parsed.docType,
    transcript,
    fields,
  }).select("id").maybeSingle();
  if (saveErr) throw new Error("읽은 글자를 보관하지 못했어요. 잠시 뒤 다시 시도해 주세요");

  revalidatePath("/c/[token]", "layout");
  return { items, docType: parsed.docType, empty: items.length === 0, transcript, fields, docId: inserted?.id ?? null };
}
