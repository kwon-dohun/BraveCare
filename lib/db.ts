import "server-only";
import { createClient } from "@supabase/supabase-js";

// 모든 접근은 서버에서 service role로만. RLS 정책이 없어 공개 키로는 아무것도 못 읽는다.
export const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

export interface Actor {
  caseId: string;
  memberId: string;
  name: string;
  role: "admin" | "member";
}

// URL 속 추측 불가능한 토큰이 곧 권한이다. 처음 만든 사람은 케이스 토큰, 참여한 가족은 구성원 ID로 /c/<값>에 들어온다. 권한은 모두 같다.
export async function actorFromAdminToken(token: string): Promise<Actor | null> {
  const { data: c } = await db.from("cases").select("id").eq("admin_token", token).maybeSingle();
  if (!c) return null;
  const { data: m } = await db.from("members").select("id,name").eq("case_id", c.id).eq("role", "admin").limit(1).single();
  return m ? { caseId: c.id, memberId: m.id, name: m.name, role: "admin" } : null;
}

export async function actorFromMemberId(memberId: string): Promise<Actor | null> {
  if (!/^[0-9a-f-]{36}$/.test(memberId)) return null;
  const { data: m } = await db.from("members").select("id,name,case_id").eq("id", memberId).maybeSingle();
  return m ? { caseId: m.case_id, memberId: m.id, name: m.name, role: "member" } : null;
}

// 화면이 들고 있는 열쇠: 케이스 토큰("c") 또는 구성원 ID("m")
export type Auth = { k: "c" | "m"; v: string };
export async function resolve(a: Auth): Promise<Actor> {
  const actor = a.k === "c" ? await actorFromAdminToken(a.v) : await actorFromMemberId(a.v);
  if (!actor) throw new Error("접근 권한이 없어요");
  return actor;
}

// KPI용 이벤트. 실패해도 사용자 흐름을 막지 않는다. 이름·토큰 같은 식별 정보는 넣지 않는다.
export async function logEvent(caseId: string | null, name: string, meta: Record<string, unknown> = {}) {
  await db.from("events").insert({ case_id: caseId, name, meta });
}
