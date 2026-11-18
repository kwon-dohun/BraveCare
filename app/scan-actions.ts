"use server";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, soloOwner, type Auth } from "@/lib/db";
import { act } from "@/lib/push";
import { todaySeoul } from "@/lib/load";
import { askJson, hasModel } from "@/lib/openai";
import { limit } from "@/lib/scan";
import { kcdLookup, type KcdHit } from "@/lib/kcd";
import { itemsFromText, maskIds, cleanFields, fieldLines, DOC_TYPES, type DocFields, type DocItem, type DocType } from "@/lib/extract";
import { buildChatPrompt, parseChatJson, verifyAnswer, type ChatAnswer, type Source } from "@/lib/chat";
import { DOC_TYPE_LABEL } from "@/lib/extract";
import { loadCase } from "@/lib/load";
import { caseBrief } from "@/lib/brief";
import { krDate } from "@/lib/format";
import { baseName, drugInfo, suggestNames, durMeds, durFindings } from "@/lib/drug";

const seoulDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
import { glossaryText } from "@/lib/glossary";


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

// 확인 카드: 사진에서 읽은 약 이름이 식약처 허가 목록과 한두 글자 다르면 공식 이름을 제안한다
// 진단서 확인 카드: 읽은 질병코드의 공식 병명을 심평원 상병마스터에서 찾는다(없는 코드면 null)
export async function kcdCheck(a: Auth, code: string): Promise<KcdHit | null> {
  await resolve(a);
  return kcdLookup(String(code).slice(0, 20));
}

export async function suggestDrugNames(a: Auth, names: string[]): Promise<Record<string, string[]>> {
  await resolve(a);
  const list = names.filter((n) => typeof n === "string" && n.trim()).slice(0, 30).map((n) => n.slice(0, 60));
  const pairs = await Promise.all(list.map(async (n) => [n, await suggestNames(n)] as const));
  return Object.fromEntries(pairs.filter((p) => p[1].length));
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
  // 서류함에 있는 약 이름이 질문에 나오면, 그 약의 식약처 허가정보(효능·주의사항)를 근거로 더한다(최대 2개)
  const medNames = [...new Set((docs ?? []).flatMap((d) => ((d.fields as DocFields | null)?.meds ?? []).map((m) => m.name)))];
  const asked = medNames.filter((n) => { const b = baseName(n); return b.length >= 2 && q.includes(b); }).slice(0, 2);
  for (const info of await Promise.all(asked.map(drugInfo))) {
    if (info) sources.push({ label: `식약처 의약품 허가정보(${info.name})`, text: info.text });
  }
  // '같이 먹어도 돼?', 'CT 찍는데', '조심할 거' 같은 질문이면 가장 최근 약봉투의 약끼리 식약처 DUR로 맞춰 본 결과를 더한다
  const latestMeds = ((docs ?? []).find((d) => d.doc_type === "medication" && (d.fields as DocFields | null)?.meds?.length)?.fields as DocFields | undefined)?.meds.map((m) => m.name) ?? [];
  if (latestMeds.length && /같이|함께|병용|섞|조심|주의|부작용|금기|괜찮|먹어도|조영|CT|MRI|검사|겹치|중복/i.test(q)) {
    const age = Number(data.today.slice(0, 4)) - data.input.birthYear;
    const found = durFindings(await durMeds(latestMeds), age >= 65);
    sources.push({ label: "식약처 DUR(의약품 안전사용 정보, 가장 최근 약봉투의 약끼리 확인)", text: found.length ? found.join("\n") : `가장 최근 약봉투의 약(${latestMeds.map(baseName).join(", ")})끼리는 식약처 DUR 병용금기·효능군중복에 걸리는 조합이 없어요.` });
  }
  const prompt = buildChatPrompt(!!data.isSelfCare);
  const raw = await askJson(prompt, [{ type: "text", text: `[자료]\n${sources.map((s) => `--- ${s.label} ---\n${s.text}`).join("\n")}\n\n[질문]\n${q}` }]);
  if (raw === null) throw new Error("지금은 답을 만들지 못했어요. 잠시 뒤에 다시 물어봐 주세요");
  return verifyAnswer(parseChatJson(raw), sources);
}

import { findExtraHelp } from "@/lib/ai-benefits";

// ---- 기본 47개 제도 밖의 추가 지원 확인처 (확인된 기관·제도만, AI 생성 없음) ----

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
