import "server-only";
import { cache } from "react";
import { db } from "./db";
import { evaluate, sortResults, normalizeInput, type Result } from "./benefits";

export interface Member { id: string; name: string; role: "admin" | "member" }
export interface Task {
  id: string; title: string; kind: "prep" | "question" | "schedule" | "admin" | "custom";
  due_date: string | null; rel_day: number | null; assignee_id: string | null;
  done: boolean; done_at: string | null; done_by: string | null; source: string; source_quote: string | null; memo: string | null;
  due_time: string | null; repeat: "daily" | "weekly" | null;
}

export const todaySeoul = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export const loadCase = cache(async (caseId: string) => {
  const [c, m, t, s, a] = await Promise.all([
    db.from("cases").select("input,share_token,share_expires_at,admin_token,hospital,silson24,docs_checked").eq("id", caseId).single(),
    db.from("members").select("id,name,role").eq("case_id", caseId).order("created_at"),
    db.from("tasks").select("id,title,kind,due_date,rel_day,assignee_id,done,done_at,done_by,source,source_quote,memo,due_time,repeat").eq("case_id", caseId),
    db.from("benefit_status").select("benefit_id,status,docs_checked").eq("case_id", caseId),
    db.from("activity").select("id,text,created_at").eq("case_id", caseId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (c.error) throw c.error;
  const input = normalizeInput(c.data.input);
  const today = todaySeoul();
  // DB의 시간은 14:00:00 꼴이라 분까지만 쓴다
  const tasks = ((t.data ?? []) as Task[]).map((x) => ({ ...x, due_time: x.due_time?.slice(0, 5) ?? null })).sort(
    (x, y) => (x.due_date ?? "9999").localeCompare(y.due_date ?? "9999") || (x.due_time ?? "99").localeCompare(y.due_time ?? "99") || (x.rel_day ?? 999) - (y.rel_day ?? 999),
  );
  const status = Object.fromEntries((s.data ?? []).map((r) => [r.benefit_id, r.status as string]));
  const docsChecked = Object.fromEntries((s.data ?? []).map((r) => [r.benefit_id, (r.docs_checked ?? []) as string[]]));
  const results: Result[] = sortResults(evaluate(input, today));
  return {
    input, today, shareToken: c.data.share_token as string, adminToken: c.data.admin_token as string,
    shareExpiresAt: c.data.share_expires_at as string, shareExpired: Date.parse(c.data.share_expires_at) < Date.now(),
    hospital: (c.data.hospital ?? "") as string, silson24: c.data.silson24 as "yes" | "no" | null, packet: (c.data.docs_checked ?? []) as string[],
    members: (m.data ?? []) as Member[], tasks, status, docsChecked, results,
    activity: (a.data ?? []) as { id: string; text: string; created_at: string }[],
  };
});

// 내가 아직 안 본 가족 소식 수. 내가 한 일은 세지 않는다.
export async function unreadCount(caseId: string, memberId: string) {
  const { data: m } = await db.from("members").select("seen_at").eq("id", memberId).single();
  const { count } = await db.from("activity").select("id", { count: "exact", head: true })
    .eq("case_id", caseId).gt("created_at", m?.seen_at ?? "1970-01-01").or(`member_id.is.null,member_id.neq.${memberId}`);
  return count ?? 0;
}

// 내가 찜한 지원(구성원별). 최근에 찜한 것부터.
export async function loadSaved(memberId: string): Promise<string[]> {
  const { data } = await db.from("saved_benefits").select("item").eq("member_id", memberId).order("created_at", { ascending: false });
  return (data ?? []).map((r) => r.item as string);
}
