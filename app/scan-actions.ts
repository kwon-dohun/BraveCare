"use server";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, type Auth } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { EXTRACT_PROMPT, parseModelJson, verifyItems, toDocItems, type DocItem } from "@/lib/extract";

const MODEL = process.env.GPT_MODEL ?? "gpt-4o"; // 이 모델이 계정에서 안 되면 .env.local에 GPT_MODEL로 바꾼다

export async function extractFromImage(a: Auth, jpegBase64: string): Promise<{ items: DocItem[]; empty: boolean }> {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("안내문 촬영은 관리자만 할 수 있어요");
  if (!process.env.GPT_API_KEY) throw new Error("안내문 인식 설정이 아직 안 됐어요. 할 일을 직접 추가해주세요");
  if (!/^[A-Za-z0-9+/=]+$/.test(jpegBase64) || jpegBase64.length > 3_500_000) throw new Error("사진 크기가 너무 커요. 다시 촬영해주세요");

  // 비용 방어: 케이스당 하루 20번까지만 인식한다
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await db.from("events").select("id", { count: "exact", head: true }).eq("case_id", actor.caseId).eq("name", "doc_scan_started").gte("created_at", since);
  if ((count ?? 0) >= 20) throw new Error("오늘은 안내문 인식 횟수를 다 썼어요. 내일 다시 시도하거나 할 일을 직접 추가해주세요");
  await logEvent(actor.caseId, "doc_scan_started");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.GPT_API_KEY}` },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{
        role: "user",
        content: [
          { type: "text", text: EXTRACT_PROMPT },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${jpegBase64}`, detail: "high" } },
        ],
      }],
    }),
  });
  if (!res.ok) {
    console.error("OpenAI 호출 실패", res.status, (await res.text()).slice(0, 300)); // 키·이미지는 로그에 남기지 않는다
    throw new Error("안내문을 읽지 못했어요. 잠시 후 다시 시도하거나 할 일을 직접 추가해주세요");
  }
  const raw: string = (await res.json()).choices?.[0]?.message?.content ?? "";
  const parsed = parseModelJson(raw);
  // 원문에 없는 항목은 여기서 버린다. 원본 이미지는 저장하지 않는다(요청 처리 후 폐기).
  const items = toDocItems(verifyItems(parsed.transcript, parsed.items), todaySeoul());
  return { items, empty: items.length === 0 };
}

const KIND_MAP = { schedule: "schedule", medication: "prep", caution: "prep", contact: "custom" } as const;

export async function confirmDocItems(a: Auth, items: { kind: DocItem["kind"]; text: string; quote: string; date: string | null }[]) {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("관리자만 할 수 있어요");
  const rows = items
    .filter((i) => i.text.trim() && i.kind in KIND_MAP)
    .slice(0, 30)
    .map((i) => ({
      case_id: actor.caseId, title: i.text.trim().slice(0, 200), kind: KIND_MAP[i.kind], source: "doc",
      source_quote: i.quote.slice(0, 300), due_date: i.date && /^\d{4}-\d{2}-\d{2}$/.test(i.date) ? i.date : null,
    }));
  if (!rows.length) return;
  const { error } = await db.from("tasks").insert(rows);
  if (error) throw error;
  await db.from("activity").insert({ case_id: actor.caseId, text: `${actor.name}님이 안내문에서 할 일 ${rows.length}개를 추가했어요` });
  await logEvent(actor.caseId, "doc_items_confirmed", { count: rows.length });
  revalidatePath("/c/[token]", "layout");
}
