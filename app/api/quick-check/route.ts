import { actorFromAdminToken, actorFromMemberId } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { ALL_GOOD, upsertDaily } from "@/lib/daily";

// 앱 알림의 "특이사항 없음" 버튼이 화면을 열지 않고 부르는 주소. 케이스 토큰이나 구성원 ID가 권한이다.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const actor = /^[0-9a-f]{32}$/.test(token) ? await actorFromAdminToken(token) : /^[0-9a-f-]{36}$/.test(token) ? await actorFromMemberId(token) : null;
  if (!actor) return Response.json({ ok: false }, { status: 401 });
  await upsertDaily(actor.caseId, actor.name, todaySeoul(), ALL_GOOD);
  return Response.json({ ok: true });
}
