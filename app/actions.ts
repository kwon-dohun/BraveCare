"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, resolve, type Auth } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { evaluate, dayDiff, BENEFITS, STATUS_LABEL, type CaseInput } from "@/lib/benefits";
import { seedTasks, addDays } from "@/lib/timeline";

const REASONS = ["ortho", "cancer", "brain", "heart", "surgery", "internal", "other"];
const LIVINGS = ["alone", "spouse", "family"];

export async function createCase(raw: CaseInput, adminName: string) {
  const today = todaySeoul();
  const name = adminName.trim().slice(0, 20) || "나";
  const ok =
    Number.isInteger(raw.birthYear) && raw.birthYear >= 1900 && raw.birthYear <= Number(today.slice(0, 4)) &&
    REASONS.includes(raw.reason) && LIVINGS.includes(raw.living) &&
    typeof raw.sido === "string" && raw.sido.length > 0 &&
    (raw.dischargeDate === null || (dayDiff(raw.dischargeDate, today) >= -30 && dayDiff(raw.dischargeDate, today) <= 60));
  if (!ok) throw new Error("입력값을 확인해주세요");
  const input: CaseInput = {
    dischargeDate: raw.dischargeDate, birthYear: raw.birthYear, sido: raw.sido, sigungu: raw.sigungu ?? "",
    reason: raw.reason, living: raw.living, helpers: Math.min(5, Math.max(0, raw.helpers | 0)), income: raw.income ?? null,
  };

  const adminToken = randomUUID().replaceAll("-", "");
  const { data: c, error } = await db.from("cases").insert({ admin_token: adminToken, share_token: randomUUID().replaceAll("-", ""), input }).select("id").single();
  if (error) throw error;
  await db.from("members").insert({ case_id: c.id, name, role: "admin" });

  const results = evaluate(input, today);
  await db.from("benefit_status").insert(results.filter((r) => r.verdict !== "no").map((r) => ({ case_id: c.id, benefit_id: r.benefit.id })));
  await db.from("tasks").insert(
    seedTasks(input, results).map((t) => ({
      case_id: c.id, title: t.title, kind: t.kind, rel_day: t.rel, source: t.source,
      due_date: input.dischargeDate ? addDays(input.dischargeDate, t.rel) : null,
    })),
  );
  await db.from("activity").insert({ case_id: c.id, text: `${name}님이 퇴원노트를 만들었어요` });
  redirect(`/c/${adminToken}`);
}

export async function joinCase(shareToken: string, name: string) {
  const n = name.trim().slice(0, 20);
  if (!n) throw new Error("이름을 입력해주세요");
  const { data: c } = await db.from("cases").select("id").eq("share_token", shareToken).maybeSingle();
  if (!c) throw new Error("만료되었거나 잘못된 링크예요");
  const { data: m, error } = await db.from("members").insert({ case_id: c.id, name: n, role: "member" }).select("id").single();
  if (error) throw error;
  await db.from("activity").insert({ case_id: c.id, text: `${n}님이 가족으로 참여했어요` });
  redirect(`/m/${m.id}`);
}

export async function toggleTask(a: Auth, taskId: string, done: boolean) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("title,assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  // 가족 참여자는 자기 담당 할 일만 완료할 수 있다
  if (actor.role === "member" && t.assignee_id !== actor.memberId) throw new Error("내 담당 할 일만 체크할 수 있어요");
  await db.from("tasks").update({ done, done_at: done ? new Date().toISOString() : null, done_by: done ? actor.name : null }).eq("id", taskId);
  if (done) await db.from("activity").insert({ case_id: actor.caseId, text: `${actor.name}님이 완료했어요: ${t.title}` });
  revalidatePath("/c/[token]", "layout");
  revalidatePath("/m/[id]", "layout");
}

export async function assignTask(a: Auth, taskId: string, memberId: string | null) {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("담당자는 관리자만 지정할 수 있어요");
  if (memberId) {
    const { data: m } = await db.from("members").select("name").eq("id", memberId).eq("case_id", actor.caseId).maybeSingle();
    if (!m) throw new Error("가족을 찾을 수 없어요");
    const { data: t } = await db.from("tasks").select("title").eq("id", taskId).eq("case_id", actor.caseId).single();
    await db.from("activity").insert({ case_id: actor.caseId, text: `담당 지정 (${m.name}): ${t?.title}` });
  }
  await db.from("tasks").update({ assignee_id: memberId }).eq("id", taskId).eq("case_id", actor.caseId);
  revalidatePath("/c/[token]", "layout");
}

export async function addTask(a: Auth, title: string, dueDate: string | null) {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("할 일 추가는 관리자만 할 수 있어요");
  const t = title.trim().slice(0, 100);
  if (!t) return;
  await db.from("tasks").insert({ case_id: actor.caseId, title: t, kind: "custom", source: "manual", due_date: dueDate || null });
  revalidatePath("/c/[token]", "layout");
}

const STATUSES = ["none", "applied", "approved", "rejected", "dropped"];
export async function setBenefitStatus(a: Auth, benefitId: string, status: string) {
  const actor = await resolve(a);
  if (!STATUSES.includes(status)) throw new Error("잘못된 상태예요");
  await db.from("benefit_status").upsert({ case_id: actor.caseId, benefit_id: benefitId, status, updated_by: actor.name, updated_at: new Date().toISOString() });
  const bname = BENEFITS.find((b) => b.id === benefitId)?.name ?? benefitId;
  await db.from("activity").insert({ case_id: actor.caseId, text: `${actor.name}님이 "${bname}" 상태를 변경했어요: ${STATUS_LABEL[status]}` });
  revalidatePath("/c/[token]", "layout");
}
