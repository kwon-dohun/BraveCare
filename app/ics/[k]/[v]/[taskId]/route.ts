import type { NextRequest } from "next/server";
import { db, actorFromAdminToken, actorFromMemberId } from "@/lib/db";
import { taskIcs } from "@/lib/ics";

// 할 일 하나를 캘린더 파일로 내려준다. 주소 속 토큰이 권한이다(케이스 토큰 c, 구성원 ID m).
export async function GET(_req: NextRequest, ctx: RouteContext<"/ics/[k]/[v]/[taskId]">) {
  const { k, v, taskId } = await ctx.params;
  const actor = k === "c" ? await actorFromAdminToken(v) : k === "m" ? await actorFromMemberId(v) : null;
  if (!actor || !/^[0-9a-f-]{36}$/.test(taskId)) return new Response("not found", { status: 404 });
  const [{ data: t }, { data: c }] = await Promise.all([
    db.from("tasks").select("id,title,due_date,memo,kind").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle(),
    db.from("cases").select("hospital").eq("id", actor.caseId).single(),
  ]);
  if (!t?.due_date) return new Response("not found", { status: 404 });
  return new Response(taskIcs(t, c?.hospital ?? ""), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'attachment; filename="bravecare.ics"', "Cache-Control": "no-store" },
  });
}
