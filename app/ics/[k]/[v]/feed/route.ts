import type { NextRequest } from "next/server";
import { db, actorFromAdminToken, actorFromMemberId } from "@/lib/db";
import { feedIcs } from "@/lib/ics";
import type { CaseInput } from "@/lib/benefits";

// 일정을 iCalendar 피드로 내려준다 (캘린더 구독 webcal:// 및 .ics 지원). ?scope=mine 내가 맡은 일만, visit 병원 일정만, 없으면 전체
export async function GET(req: NextRequest, ctx: RouteContext<"/ics/[k]/[v]/feed">) {
  const { k, v } = await ctx.params;
  const actor = k === "c" ? await actorFromAdminToken(v) : k === "m" ? await actorFromMemberId(v) : null;
  if (!actor) return new Response("not found", { status: 404 });

  const scope = req.nextUrl.searchParams.get("scope");
  let q = db.from("tasks")
    .select("id,title,due_date,due_time,memo,kind,done")
    .eq("case_id", actor.caseId)
    .not("due_date", "is", null)
    .neq("kind", "question");
  if (scope === "mine") q = q.eq("assignee_id", actor.memberId);
  if (scope === "visit") q = q.eq("kind", "schedule");
  const [{ data: c }, { data: tasks }] = await Promise.all([
    db.from("cases").select("input,hospital").eq("id", actor.caseId).single(),
    q.order("due_date", { ascending: true }),
  ]);

  // 내가 맡은 일만 고르면 퇴원하는 날은 뺀다(담당이 없는 날이라서)
  const dischargeDate = scope === "mine" ? null : (c?.input as CaseInput | undefined)?.dischargeDate ?? null;
  const icsText = feedIcs(tasks ?? [], {
    calName: `${actor.name}님의 씩씩케어`,
    hospital: c?.hospital ?? "",
    dischargeDate,
  });

  return new Response(icsText, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="bravecare-schedule.ics"',
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
    },
  });
}
