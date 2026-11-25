import { db } from "@/lib/db";
import { act } from "@/lib/push";
import { todaySeoul } from "@/lib/load";
import { addDays } from "@/lib/timeline";

// 환자가 직접 안부를 남기던 집에서 오늘 안부가 아직 없으면 저녁에 가족에게 알린다.
// 아직 켜지 않았다: 켜려면 vercel.json crons에 { "path": "/api/cron/patient-check", "schedule": "0 11 * * *" }(20:00 KST)를 추가한다.
// 마지막 환자 안부가 최근 3일 안이어야 하므로 안부를 멈춘 날부터 최대 3번만 알리고 그 뒤로는 조용하다(잔소리 방지).
// 한 번도 안부를 남기지 않은 집, 회복 완료로 마친 집은 보내지 않는다. ?dry=1이면 보내지 않고 대상 수만 센다.
const QUIET_AFTER_DAYS = 3;
const MSG = "오늘 환자분 안부가 아직 없어요. 전화로 한번 여쭤봐 주세요";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const today = todaySeoul();
  const { data: checks, error } = await db.from("daily_checks").select("case_id,check_date")
    .eq("source_role", "patient").gte("check_date", addDays(today, -QUIET_AFTER_DAYS)).lte("check_date", today);
  if (error) { console.error("환자 안부 조회 실패", error.code); return Response.json({ ok: false }, { status: 500 }); }

  const doneToday = new Set((checks ?? []).filter((c) => c.check_date === today).map((c) => c.case_id as string));
  const missing = [...new Set((checks ?? []).map((c) => c.case_id as string))].filter((id) => !doneToday.has(id));
  if (!missing.length) return Response.json({ ok: true, dry, count: 0 });

  const { data: cases } = await db.from("cases").select("id,input").in("id", missing);
  const targets = (cases ?? []).filter((c) => !(c.input as { dailyCompleted?: boolean }).dailyCompleted).map((c) => c.id as string);
  if (!dry) await Promise.all(targets.map((id) => act(id, MSG)));
  return Response.json({ ok: true, dry, count: targets.length });
}
