import { NextResponse, type NextRequest } from "next/server";
import { db, actorFromToken } from "@/lib/db";

// 카카오에서 돌아오는 곳. 카카오 회원번호만 받아 쓴다(이름·이메일·전화번호는 요청하지 않는다).
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const go = (path: string) => {
    const res = NextResponse.redirect(new URL(path, url.origin), 303);
    res.cookies.delete({ name: "bc_kakao", path: "/api/kakao" });
    return res;
  };
  const key = process.env.KAKAO_REST_KEY;
  const code = url.searchParams.get("code");
  let saved: { state?: string; link?: string } = {};
  try { saved = JSON.parse(req.cookies.get("bc_kakao")?.value ?? "{}"); } catch {}
  if (!key || !code || !saved.state || saved.state !== url.searchParams.get("state")) return go("/?kakao=fail");

  const tok = await fetch("https://kauth.kakao.com/oauth/token", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" },
    body: new URLSearchParams({
      grant_type: "authorization_code", client_id: key, redirect_uri: `${url.origin}/api/kakao/callback`, code,
      ...(process.env.KAKAO_CLIENT_SECRET ? { client_secret: process.env.KAKAO_CLIENT_SECRET } : {}),
    }),
  }).then((r) => r.json()).catch(() => null);
  const me = tok?.access_token
    ? await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${tok.access_token}` } }).then((r) => r.json()).catch(() => null)
    : null;
  if (!me?.id) return go("/?kakao=fail");
  const kakaoId = String(me.id);

  // 연결: 지금 보고 있던 내 화면에 카카오 계정을 붙인다
  if (saved.link) {
    const actor = await actorFromToken(saved.link);
    if (!actor) return go("/?kakao=fail");
    await db.from("members").update({ kakao_id: kakaoId }).eq("id", actor.memberId);
    return go(`/c/${saved.link}/settings?kakao=ok`);
  }

  // 찾기: 이 카카오 계정이 연결된 내 화면으로 보낸다
  // shortcut: 환자 1명 전제라 가장 최근에 연결한 곳 하나로 보낸다. 환자 여러 명을 지원하면 고르는 화면이 필요하다.
  const { data: m } = await db.from("members").select("id,role,case_id").eq("kakao_id", kakaoId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!m) return go("/?kakao=none");
  if (m.role !== "admin") return go(`/c/${m.id}`);
  const { data: c } = await db.from("cases").select("admin_token").eq("id", m.case_id).single();
  return go(c ? `/c/${c.admin_token}` : "/?kakao=fail");
}
