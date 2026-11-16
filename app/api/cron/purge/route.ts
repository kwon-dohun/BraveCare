import { db, logEvent } from "@/lib/db";

// 마지막 이용일로부터 1년이 지난 케이스를 모든 기록과 함께 파기한다. Vercel Cron이 매일 한 번 부른다(vercel.json).
// 마지막 이용일 = 케이스 생성·가족 활동·화면 열기·안부 기록·할 일 완료 중 가장 늦은 시각(DB 함수 purge_inactive_cases).
// 보관 기간은 개인정보처리방침과 같아야 하므로 365일을 코드에 고정한다. ?dry=1이면 지우지 않고 대상 수만 센다.
const KEEP_DAYS = 365;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const { data, error } = await db.rpc("purge_inactive_cases", { keep_days: KEEP_DAYS, dry });
  if (error) { console.error("자동 파기 실패", error.code); return Response.json({ ok: false }, { status: 500 }); }
  if (!dry && data > 0) await logEvent(null, "cases_purged", { count: data }); // 개수만 남긴다
  return Response.json({ ok: true, dry, count: data });
}
