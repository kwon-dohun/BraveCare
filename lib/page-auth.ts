import "server-only";
import { notFound } from "next/navigation";
import { actorFromAdminToken, actorFromMemberId, type Auth } from "./db";
import { loadCase } from "./load";

export async function adminPage(token: string) {
  const actor = await actorFromAdminToken(token);
  if (!actor) notFound();
  const data = await loadCase(actor.caseId);
  return { actor, data, auth: { k: "c", v: token } as Auth, base: `/c/${token}` };
}

export async function memberPage(id: string) {
  const actor = await actorFromMemberId(id);
  if (!actor) notFound();
  const data = await loadCase(actor.caseId);
  return { actor, data, auth: { k: "m", v: id } as Auth };
}
