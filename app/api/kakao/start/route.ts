import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

// 카카오 로그인 시작. link(내 화면 토큰)가 있으면 '계정 연결', 없으면 '내 씩씩케어 찾기'.
// 폼 POST로 받아 토큰이 주소·기록에 남지 않게 한다.
export async function POST(req: Request) {
  const key = process.env.KAKAO_REST_KEY;
  if (!key) return new Response("not found", { status: 404 });
  const link = String((await req.formData()).get("link") ?? "");
  const state = randomUUID();
  const origin = new URL(req.url).origin;
  const q = new URLSearchParams({ client_id: key, redirect_uri: `${origin}/api/kakao/callback`, response_type: "code", state });
  const res = NextResponse.redirect(`https://kauth.kakao.com/oauth/authorize?${q}`, 303);
  res.cookies.set("bc_kakao", JSON.stringify({ state, link }), { httpOnly: true, secure: origin.startsWith("https"), sameSite: "lax", maxAge: 600, path: "/api/kakao" });
  return res;
}
