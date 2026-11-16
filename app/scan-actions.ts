"use server";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, type Auth } from "@/lib/db";
import { act } from "@/lib/push";
import { todaySeoul } from "@/lib/load";
import { askJson, hasModel } from "@/lib/openai";
import { EXTRACT_PROMPT, parseModelJson, verifyItems, toDocItems, itemsFromText, maskIds, extractCautionTags, type DocItem, type DocType } from "@/lib/extract";
import { CHAT_PROMPT, parseChatJson, verifyAnswer, type ChatAnswer, type Source } from "@/lib/chat";
import { DOC_TYPE_LABEL } from "@/lib/extract";
import { loadCase } from "@/lib/load";
import { caseBrief } from "@/lib/brief";
import { glossaryText } from "@/lib/glossary";


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

export async function extractFromImage(a: Auth, jpegBase64: string): Promise<{ items: DocItem[]; docType: DocType; empty: boolean; cautions: string[] }> {
  const actor = await resolve(a);
  if (!hasModel()) throw new Error("서류 인식 설정이 아직 안 됐어요. 할 일을 직접 추가해주세요");
  if (!/^[A-Za-z0-9+/=]+$/.test(jpegBase64) || jpegBase64.length > 3_500_000) throw new Error("사진 크기가 너무 커요. 다시 촬영해주세요");
  await limit(actor.caseId, "doc_scan_started", 20, "오늘은 서류 인식 횟수를 다 썼어요. 내일 다시 시도하거나 할 일을 직접 추가해주세요");

  const raw = await askJson(EXTRACT_PROMPT, [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}`, detail: "high" } }]);
  if (raw === null) throw new Error("지금은 서류 인식이 어려워요. 병원 문자를 복사해 ‘병원 문자·알림톡 붙여넣기’에 넣으면 바로 일정을 만들 수 있어요. 아니면 잠시 뒤 다시 시도하거나 할 일을 직접 추가해 주세요");
  const parsed = parseModelJson(raw);
  // 원문에 없는 항목은 여기서 버린다
  const items = toDocItems(verifyItems(parsed.transcript, parsed.items), todaySeoul());
  const cautions = extractCautionTags(parsed.transcript);
  if (parsed.transcript.trim()) await keep(actor.caseId, parsed.docType, parsed.transcript);
  revalidatePath("/c/[token]", "layout");
  return { items, docType: parsed.docType, empty: items.length === 0, cautions };
}

// 병원 문자·알림톡 붙여넣기. AI 없이 날짜가 있는 줄만 일정 후보로 뽑는다.
export async function extractFromPaste(a: Auth, text: string): Promise<{ items: DocItem[] }> {
  const actor = await resolve(a);
  const t = text.trim().slice(0, 2000);
  if (t.length < 5) throw new Error("병원에서 받은 문자를 붙여넣어 주세요");
  await keep(actor.caseId, "message", t);
  revalidatePath("/c/[token]", "layout");
  return { items: itemsFromText(t, todaySeoul()) };
}

const KIND_MAP = { schedule: "schedule", medication: "prep", caution: "prep", contact: "custom" } as const;

export async function confirmDocItems(a: Auth, items: { kind: DocItem["kind"]; text: string; quote: string; date: string | null }[]) {
  const actor = await resolve(a);
  const today = todaySeoul();
  const rawRows = items
    .filter((i) => i.text.trim() && i.kind in KIND_MAP)
    .slice(0, 30)
    .map((i) => ({
      case_id: actor.caseId, title: maskIds(i.text.trim()).slice(0, 200), kind: KIND_MAP[i.kind], source: "doc",
      source_quote: maskIds(i.quote).slice(0, 300), due_date: i.date && /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : null,
    }));
  if (!rawRows.length) return;

  // 이미 등록된 할 일과 제목 및 날짜가 완전히 동일한 중복 항목은 제외한다 (외래 예약증 중복 스캔 방어)
  const { data: existing } = await db.from("tasks").select("title,due_date").eq("case_id", actor.caseId);
  const existingSet = new Set((existing ?? []).map((t) => `${t.title}::${t.due_date ?? ""}`));
  const rows = rawRows.filter((r) => !existingSet.has(`${r.title}::${r.due_date ?? ""}`));
  if (!rows.length) return;

  // 이미 지난 병원 일정이 있는데 새 일정을 등록하면 외래 사이클 갱신으로 본다
  const adds = rows.some((r) => r.kind === "schedule" && r.due_date && r.due_date >= today);
  const { count: past } = adds
    ? await db.from("tasks").select("id", { count: "exact", head: true }).eq("case_id", actor.caseId).eq("kind", "schedule").lt("due_date", today)
    : { count: 0 };

  const { error } = await db.from("tasks").insert(rows);
  if (error) throw error;
  await act(actor.caseId, `${actor.name}님이 서류에서 할 일 ${rows.length}개를 추가했어요`, actor.memberId);
  await logEvent(actor.caseId, "doc_items_confirmed", { count: rows.length });
  if (past) await logEvent(actor.caseId, "cycle_renewed", { cycle_number: past + 1 });
  revalidatePath("/c/[token]", "layout");
}

export async function deleteDocument(a: Auth, id: string) {
  const actor = await resolve(a);
  await db.from("documents").delete().eq("id", id).eq("case_id", actor.caseId);
  revalidatePath("/c/[token]", "layout");
}

// ---- 돌봄 챗봇 ----

export async function askChat(a: Auth, question: string): Promise<ChatAnswer> {
  const actor = await resolve(a);
  const q = question.trim().slice(0, 300);
  if (!q) throw new Error("질문을 입력해주세요");
  if (!hasModel()) throw new Error("챗봇 설정이 아직 안 됐어요");
  await limit(actor.caseId, "chat_asked", 30, "오늘은 질문 횟수를 다 썼어요. 급한 내용은 병원에 직접 문의해주세요");

  // 자료: 보관한 서류 + 우리 집 씩씩케어 정보 + 쉬운 용어 사전. 답의 근거 문장은 이 글자 안에서만 인정한다.
  const [{ data: docs }, data] = await Promise.all([
    db.from("documents").select("doc_type,transcript").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(5),
    loadCase(actor.caseId),
  ]);
  const sources: Source[] = [
    ...(docs ?? []).map((d) => ({ label: `서류(${DOC_TYPE_LABEL[d.doc_type as DocType] ?? "기타"})`, text: d.transcript as string })),
    { label: "씩씩케어 정보", text: caseBrief(data) },
    { label: "쉬운 용어 사전", text: glossaryText() },
  ];
  const raw = await askJson(CHAT_PROMPT, [{ type: "text", text: `[자료]\n${sources.map((s) => `--- ${s.label} ---\n${s.text}`).join("\n")}\n\n[질문]\n${q}` }]);
  if (raw === null) throw new Error("지금은 답을 만들지 못했어요. 잠시 뒤에 다시 물어봐 주세요");
  return verifyAnswer(parseChatJson(raw), sources);
}
