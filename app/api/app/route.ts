import { db, actorFromToken } from "@/lib/db";
import { loadCase } from "@/lib/load";
import { buildReminders } from "@/lib/reminders";

// 앱이 켜질 때 부른다: 푸시 토큰을 맡기고, 휴대폰에 예약해 둘 알림 목록을 받아 간다. 케이스 토큰이나 구성원 ID가 권한이다.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const actor = typeof body?.token === "string" ? await actorFromToken(body.token) : null;
  if (!actor) return Response.json({ ok: false }, { status: 401 });
  if (typeof body.pushToken === "string" && /^Expo(nent)?PushToken\[[\w-]{1,100}\]$/.test(body.pushToken)) {
    await db.from("members").update({ push_token: body.pushToken }).eq("id", actor.memberId);
  }
  const data = await loadCase(actor.caseId);
  // daily: 회복 완료로 데일리 체크를 마쳤으면 저녁 8시 안부 알림을 잡지 않게 한다
  return Response.json({ ok: true, daily: !data.input.dailyCompleted, reminders: buildReminders({ ...data, meId: actor.memberId, now: Date.now() }) });
}
