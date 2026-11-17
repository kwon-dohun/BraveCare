"use server";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, soloOwner, type Auth } from "@/lib/db";
import { act } from "@/lib/push";
import { todaySeoul } from "@/lib/load";
import { askJson, hasModel } from "@/lib/openai";
import { EXTRACT_PROMPT, parseModelJson, verifyItems, toDocItems, itemsFromText, maskIds, validateTranscript, verifyFields, cleanFields, fieldLines, DOC_TYPES, type DocFields, type DocItem, type DocType } from "@/lib/extract";
import { buildChatPrompt, parseChatJson, verifyAnswer, type ChatAnswer, type Source } from "@/lib/chat";
import { DOC_TYPE_LABEL } from "@/lib/extract";
import { loadCase } from "@/lib/load";
import { caseBrief } from "@/lib/brief";
import { krDate } from "@/lib/format";

const seoulDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
import { glossaryText } from "@/lib/glossary";


// 비용 방어: 케이스당 하루 횟수 제한
async function limit(caseId: string, event: string, max: number, msg: string) {
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("name", event).gte("created_at", since);
  if ((count ?? 0) >= max) throw new Error(msg);
  await logEvent(caseId, event);
}

// 원본 사진은 저장하지 않는다. 옮겨 적은 글자만 보관함에 남기고, 챗봇은 그 글자만 근거로 쓴다.

export async function extractFromImage(a: Auth, jpegBase64: string): Promise<{
  items: DocItem[];
  docType: DocType;
  empty: boolean;
  transcript: string;
  fields: DocFields;
  docId: string | null;
}> {
  const actor = await resolve(a);
  if (!hasModel()) throw new Error("서류 인식 설정이 아직 안 됐어요. 할 일을 직접 추가해주세요");
  if (!/^[A-Za-z0-9+/=]+$/.test(jpegBase64) || jpegBase64.length > 3_500_000) throw new Error("사진 크기가 너무 커요. 다시 촬영해주세요");
  await limit(actor.caseId, "doc_scan_started", 20, "오늘은 서류 인식 횟수를 다 썼어요. 내일 다시 시도하거나 할 일을 직접 추가해주세요");

  const raw = await askJson(EXTRACT_PROMPT, [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}`, detail: "high" } }]);
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
  return {
    items,
    docType: parsed.docType,
    empty: items.length === 0,
    transcript,
    fields,
    docId: inserted?.id ?? null,
  };
}

// 병원 문자·알림톡 붙여넣기. AI 없이 날짜가 있는 줄만 일정 후보로 뽑는다.
export async function extractFromPaste(a: Auth, text: string): Promise<{ items: DocItem[]; docId: string | null; transcript: string }> {
  const actor = await resolve(a);
  const t = text.trim().slice(0, 2000);
  if (t.length < 5) throw new Error("병원에서 받은 문자를 붙여넣어 주세요");
  const { data: inserted, error: saveErr } = await db.from("documents").insert({
    case_id: actor.caseId,
    doc_type: "message",
    transcript: maskIds(t),
  }).select("id").maybeSingle();
  if (saveErr) throw new Error("읽은 글자를 보관하지 못했어요. 잠시 뒤 다시 시도해 주세요");
  revalidatePath("/c/[token]", "layout");
  return { items: itemsFromText(t, todaySeoul()), docId: inserted?.id ?? null, transcript: maskIds(t) };
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

  const owner = await soloOwner(actor.caseId, actor.memberId);
  const { error } = await db.from("tasks").insert(rows.map((r) => ({ ...r, assignee_id: owner })));
  if (error) throw error;
  await act(actor.caseId, `${actor.name}님이 서류에서 할 일 ${rows.length}개를 추가했어요`, actor.memberId);
  await logEvent(actor.caseId, "doc_items_confirmed", { count: rows.length });
  if (past) await logEvent(actor.caseId, "cycle_renewed", { cycle_number: past + 1 });
  revalidatePath("/c/[token]", "layout");
}

// 찍은 뒤 확인 카드에서 '맞아요'를 누르면: 사람이 고친 칸과 서류 종류를 저장하고 확인한 시각을 남긴다
export async function confirmDocument(a: Auth, id: string, docType: string, fields: unknown) {
  const actor = await resolve(a);
  if (!DOC_TYPES.includes(docType as DocType)) throw new Error("서류 종류를 다시 골라 주세요");
  const f = cleanFields(docType as DocType, fields);
  const masked: DocFields = { values: Object.fromEntries(Object.entries(f.values).map(([k, v]) => [k, maskIds(v)])), meds: f.meds };
  const { error } = await db.from("documents").update({ doc_type: docType, fields: masked, confirmed_at: new Date().toISOString() }).eq("id", id).eq("case_id", actor.caseId);
  if (error) throw new Error("저장하지 못했어요. 다시 시도해 주세요");
  await logEvent(actor.caseId, "doc_confirmed", { doc_type: docType, meds: f.meds.length });
  revalidatePath("/c/[token]", "layout");
  return masked;
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
    db.from("documents").select("doc_type,transcript,fields,confirmed_at,created_at").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(5),
    loadCase(actor.caseId),
  ]);
  const sources: Source[] = [
    // 서류마다 넣은 날을 붙이고(최근 것부터), 정리본이 있으면 원문 앞에 둔다. 정리본 값도 원문 글자 그대로라 근거로 인용할 수 있다
    // 같은 날 여러 장을 넣어도 구분되게 시각까지 붙이고, 종류마다 가장 최근 한 장에 표시를 단다(목록이 최신순이라 처음 나온 것)
    ...(docs ?? []).map((d, i, all) => ({
      label: `서류(${DOC_TYPE_LABEL[d.doc_type as DocType] ?? "기타"}, ${krDate(seoulDay(d.created_at as string))} ${new Date(d.created_at as string).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" })} 넣음${all.findIndex((x) => x.doc_type === d.doc_type) === i ? `, 가장 최근 ${DOC_TYPE_LABEL[d.doc_type as DocType] ?? "서류"}` : ""})`,
      // 사람이 확인한 칸이 있으면 그것을 먼저(씩씩이는 이걸 원문보다 우선한다), 그다음 원문
      text: [
        d.fields ? `${d.confirmed_at ? "[사용자가 확인한 내용]" : "[서류에서 읽은 내용]"}\n${fieldLines(d.doc_type as DocType, d.fields as DocFields).join("\n")}` : "",
        `[원문]\n${d.transcript as string}`,
      ].filter(Boolean).join("\n"),
    })),
    { label: "씩씩케어 정보", text: caseBrief(data) },
    { label: "쉬운 용어 사전", text: glossaryText() },
  ];
  const prompt = buildChatPrompt(!!data.isSelfCare);
  const raw = await askJson(prompt, [{ type: "text", text: `[자료]\n${sources.map((s) => `--- ${s.label} ---\n${s.text}`).join("\n")}\n\n[질문]\n${q}` }]);
  if (raw === null) throw new Error("지금은 답을 만들지 못했어요. 잠시 뒤에 다시 물어봐 주세요");
  return verifyAnswer(parseChatJson(raw), sources);
}

import { findExtraHelp } from "@/lib/ai-benefits";

// ---- 기본 26개 제도 밖의 추가 지원 확인처 (확인된 기관·제도만, AI 생성 없음) ----

export async function searchAdditionalBenefitsAction(a: Auth, extraTags: string[] = [], customKeyword = "") {
  const actor = await resolve(a);
  const data = await loadCase(actor.caseId);
  await logEvent(actor.caseId, "extra_help_searched", { tags: extraTags.length, keyword: !!customKeyword.trim() });
  return findExtraHelp({
    sido: data.input.sido,
    sigungu: data.input.sigungu || undefined,
    reason: data.input.reason,
    income: data.input.income,
    extraTags,
    customKeyword: customKeyword.slice(0, 50),
  });
}
