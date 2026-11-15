import "server-only";
import { cache } from "react";
import { db } from "./db";
import { evaluate, sortResults, normalizeInput, type Result } from "./benefits";

export interface Member { id: string; name: string; role: "admin" | "member" }
export interface Task {
  id: string; title: string; kind: "prep" | "question" | "schedule" | "admin" | "custom";
  due_date: string | null; rel_day: number | null; assignee_id: string | null;
  done: boolean; done_at: string | null; done_by: string | null; source: string; source_quote: string | null; memo: string | null;
}

export const todaySeoul = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });

export const loadCase = cache(async (caseId: string) => {
  const [c, m, t, s, a] = await Promise.all([
    db.from("cases").select("input,share_token,share_expires_at,admin_token,hospital,silson24,docs_checked").eq("id", caseId).single(),
    db.from("members").select("id,name,role").eq("case_id", caseId).order("created_at"),
    db.from("tasks").select("id,title,kind,due_date,rel_day,assignee_id,done,done_at,done_by,source,source_quote,memo").eq("case_id", caseId),
    db.from("benefit_status").select("benefit_id,status,docs_checked").eq("case_id", caseId),
    db.from("activity").select("id,text,created_at").eq("case_id", caseId).order("created_at", { ascending: false }).limit(20),
  ]);
  if (c.error) throw c.error;
  const input = normalizeInput(c.data.input);
  const today = todaySeoul();
  const tasks = ((t.data ?? []) as Task[]).sort(
    (x, y) => (x.due_date ?? "9999").localeCompare(y.due_date ?? "9999") || (x.rel_day ?? 999) - (y.rel_day ?? 999),
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
