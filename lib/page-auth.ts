import "server-only";
import { notFound } from "next/navigation";
import { actorFromAdminToken, actorFromMemberId, type Auth } from "./db";
import { loadCase } from "./load";

// /c/<토큰> 하나로 모든 가족이 같은 화면을 쓴다. 토큰은 처음 만든 사람의 케이스 토큰(32자리) 또는 참여한 가족의 구성원 ID(UUID).
export async function adminPage(token: string) {
  const isMember = /^[0-9a-f-]{36}$/.test(token);
  const actor = isMember ? await actorFromMemberId(token) : await actorFromAdminToken(token);
  if (!actor) notFound();
  const data = await loadCase(actor.caseId);
  return { actor, data, auth: { k: isMember ? "m" : "c", v: token } as Auth, base: `/c/${token}` };
}
