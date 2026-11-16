import "server-only";
import { after } from "next/server";
import { db } from "./db";

// 가족 활동을 남기고, 앱을 쓰는 다른 가족에게 푸시로 알린다. 한 사람(memberId)은 자기 알림과 새 소식에서 빠진다.
export async function act(caseId: string, text: string, memberId?: string) {
  await db.from("activity").insert({ case_id: caseId, text, member_id: memberId ?? null });
  // 푸시는 응답을 보낸 뒤에. 실패해도 사용자 흐름을 막지 않는다.
  after(async () => {
    const { data } = await db.from("members").select("id,push_token").eq("case_id", caseId).not("push_token", "is", null);
    const to = (data ?? []).filter((m) => m.id !== memberId);
    if (!to.length) return;
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(to.map((m) => ({ to: m.push_token, title: "씩씩케어", body: text, channelId: "family", data: { path: "/news" } }))),
    }).catch(() => {});
  });
}
