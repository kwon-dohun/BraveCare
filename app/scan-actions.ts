"use server";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, type Auth, type Actor } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { askJson, hasModel } from "@/lib/openai";
import { EXTRACT_PROMPT, parseModelJson, verifyItems, toDocItems, itemsFromText, maskIds, type DocItem, type DocType } from "@/lib/extract";
import { CHAT_PROMPT, parseChatJson, verifyAnswer, type ChatAnswer } from "@/lib/chat";

async function admin(a: Auth): Promise<Actor> {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("관리자만 할 수 있어요");
  return actor;
}

// 비용 방어: 케이스당 하루 횟수 제한
async function limit(caseId: string, event: string, max: number, msg: string) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("name", event).gte("created_at", since);
  if ((count ?? 0) >= max) throw new Error(msg);
  await logEvent(caseId, event);
}

// 원본 사진은 저장하지 않는다. 옮겨 적은 글자만 보관함에 남기고, 챗봇은 그 글자만 근거로 쓴다.
const keep = (caseId: string, docType: DocType, transcript: string) =>
  db.from("documents").insert({ case_id: caseId, doc_type: docType, transcript: maskIds(transcript).slice(0, 6000) });

export async function extractFromImage(a: Auth, jpegBase64: string): Promise<{ items: DocItem[]; docType: DocType; empty: boolean }> {
  const actor = await admin(a);
  if (!hasModel()) throw new Error("서류 인식 설정이 아직 안 됐어요. 할 일을 직접 추가해주세요");
  if (!/^[A-Za-z0-9+/=]+$/.test(jpegBase64) || jpegBase64.length > 3_500_000) throw new Error("사진 크기가 너무 커요. 다시 촬영해주세요");
  await limit(actor.caseId, "doc_scan_started", 20, "오늘은 서류 인식 횟수를 다 썼어요. 내일 다시 시도하거나 할 일을 직접 추가해주세요");

  const raw = await askJson(EXTRACT_PROMPT, [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}`, detail: "high" } }]);
  if (raw === null) throw new Error("서류를 읽지 못했어요. 잠시 후 다시 시도하거나 할 일을 직접 추가해주세요");
  const parsed = parseModelJson(raw);
  // 원문에 없는 항목은 여기서 버린다
  const items = toDocItems(verifyItems(parsed.transcript, parsed.items), todaySeoul());
  if (parsed.transcript.trim()) await keep(actor.caseId, parsed.docType, parsed.transcript);
  revalidatePath("/c/[token]", "layout");
  return { items, docType: parsed.docType, empty: items.length === 0 };
}

// 병원 문자·알림톡 붙여넣기. AI 없이 날짜가 있는 줄만 일정 후보로 뽑는다.
export async function extractFromPaste(a: Auth, text: string): Promise<{ items: DocItem[] }> {
  const actor = await admin(a);
  const t = text.trim().slice(0, 2000);
  if (t.length < 5) throw new Error("병원에서 받은 문자를 붙여넣어 주세요");
  await keep(actor.caseId, "message", t);
  revalidatePath("/c/[token]", "layout");
  return { items: itemsFromText(t, todaySeoul()) };
}

const KIND_MAP = { schedule: "schedule", medication: "prep", caution: "prep", contact: "custom" } as const;

export async function confirmDocItems(a: Auth, items: { kind: DocItem["kind"]; text: string; quote: string; date: string | null }[]) {
  const actor = await admin(a);
  const today = todaySeoul();
  const rows = items
    .filter((i) => i.text.trim() && i.kind in KIND_MAP)
    .slice(0, 30)
    .map((i) => ({
      case_id: actor.caseId, title: i.text.trim().slice(0, 200), kind: KIND_MAP[i.kind], source: "doc",
      source_quote: i.quote.slice(0, 300), due_date: i.date && /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : null,
    }));
  if (!rows.length) return;

  // 이미 지난 병원 일정이 있는데 새 일정을 등록하면 외래 사이클 갱신으로 본다
  const adds = rows.some((r) => r.kind === "schedule" && r.due_date && r.due_date >= today);
  const { count: past } = adds
    ? await db.from("tasks").select("id", { count: "exact", head: true }).eq("case_id", actor.caseId).eq("kind", "schedule").lt("due_date", today)
    : { count: 0 };

  const { error } = await db.from("tasks").insert(rows);
  if (error) throw error;
  await db.from("activity").insert({ case_id: actor.caseId, text: `${actor.name}님이 서류에서 할 일 ${rows.length}개를 추가했어요` });
  await logEvent(actor.caseId, "doc_items_confirmed", { count: rows.length });
  if (past) await logEvent(actor.caseId, "cycle_renewed", { cycle_number: past + 1 });
  revalidatePath("/c/[token]", "layout");
}

export async function deleteDocument(a: Auth, id: string) {
  const actor = await admin(a);
  await db.from("documents").delete().eq("id", id).eq("case_id", actor.caseId);
  revalidatePath("/c/[token]", "layout");
}

// ---- 돌봄 챗봇 ----

export async function askChat(a: Auth, question: string): Promise<ChatAnswer> {
  const actor = await admin(a);
  const q = question.trim().slice(0, 300);
  if (!q) throw new Error("질문을 입력해주세요");
  if (!hasModel()) throw new Error("챗봇 설정이 아직 안 됐어요");
  const { data: docs } = await db.from("documents").select("doc_type,transcript").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(5);
  if (!docs?.length) throw new Error("먼저 약봉투나 안내문을 촬영해주세요. 보관한 서류에 적힌 내용만 답해드려요");
  await limit(actor.caseId, "chat_asked", 30, "오늘은 질문 횟수를 다 썼어요. 급한 내용은 병원에 직접 문의해주세요");

  const transcripts = docs.map((d) => d.transcript as string);
  const raw = await askJson(CHAT_PROMPT, [{ type: "text", text: `[서류]\n${transcripts.map((t, i) => `--- 서류 ${i + 1} ---\n${t}`).join("\n")}\n\n[질문]\n${q}` }]);
  if (raw === null) throw new Error("지금은 답을 만들지 못했어요. 보관한 서류 글자를 아래에서 직접 확인해 보세요");
  return verifyAnswer(parseChatJson(raw), transcripts);
}
