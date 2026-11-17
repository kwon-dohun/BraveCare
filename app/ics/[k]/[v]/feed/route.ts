import type { NextRequest } from "next/server";
import { db, actorFromAdminToken, actorFromMemberId } from "@/lib/db";
import { feedIcs } from "@/lib/ics";
import type { CaseInput } from "@/lib/benefits";

// 전체 일정을 iCalendar 피드로 내려준다 (캘린더 구독 webcal:// 및 .ics 지원)
export async function GET(_req: NextRequest, ctx: RouteContext<"/ics/[k]/[v]/feed">) {
  const { k, v } = await ctx.params;
  const actor = k === "c" ? await actorFromAdminToken(v) : k === "m" ? await actorFromMemberId(v) : null;
  if (!actor) return new Response("not found", { status: 404 });

  const [{ data: c }, { data: tasks }] = await Promise.all([
    db.from("cases").select("input,hospital").eq("id", actor.caseId).single(),
    db.from("tasks")
      .select("id,title,due_date,due_time,memo,kind,done")
      .eq("case_id", actor.caseId)
      .not("due_date", "is", null)
      .neq("kind", "question")
      .order("due_date", { ascending: true }),
  ]);

  const dischargeDate = (c?.input as CaseInput | undefined)?.dischargeDate ?? null;
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
