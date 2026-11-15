"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, type Auth, type Actor } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { evaluate, validateInput, BENEFITS, STATUS_LABEL, type CaseInput } from "@/lib/benefits";
import { seedTasks, addDays } from "@/lib/timeline";
import { PACKET } from "@/lib/packet";
import { validDaily, upsertDaily } from "@/lib/daily";
import { krDate } from "@/lib/format";

const token = () => randomUUID().replaceAll("-", "");
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const SHARE_DAYS = 7;
const shareExpiry = () => new Date(Date.now() + SHARE_DAYS * 86_400_000).toISOString();

function refresh() {
  revalidatePath("/c/[token]", "layout");
  revalidatePath("/m/[id]", "layout");
}
async function admin(a: Auth): Promise<Actor> {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("관리자만 할 수 있어요");
  return actor;
}
const act = (caseId: string, text: string) => db.from("activity").insert({ case_id: caseId, text });

// ---- 케이스 ----

export async function logStart() {
  await logEvent(null, "onboarding_started");
}

export async function createCase(raw: CaseInput, adminName: string, consented: boolean, durationSec = NaN) {
  const today = todaySeoul();
  if (consented !== true) throw new Error("동의가 필요해요");
  const input = validateInput(raw, today);
  if (!input) throw new Error("입력값을 확인해주세요");
  const name = adminName.trim().slice(0, 20) || "나";

  const adminToken = token();
  const { data: c, error } = await db.from("cases")
    .insert({ admin_token: adminToken, share_token: token(), share_expires_at: shareExpiry(), input, consent_at: new Date().toISOString() })
    .select("id").single();
  if (error) throw new Error("저장하지 못했어요. 잠시 후 다시 시도해주세요");
  await db.from("members").insert({ case_id: c.id, name, role: "admin" });

  const results = evaluate(input, today);
  await db.from("benefit_status").insert(results.filter((r) => r.verdict !== "no").map((r) => ({ case_id: c.id, benefit_id: r.benefit.id })));
  await db.from("tasks").insert(
    seedTasks(input, results).filter((t) => !(t.preOnly && input.dischargeDate && addDays(input.dischargeDate, t.rel) < today)).map((t) => ({
      case_id: c.id, title: t.title, kind: t.kind, rel_day: t.rel, source: t.source,
      due_date: input.dischargeDate ? addDays(input.dischargeDate, t.rel) : null,
    })),
  );
  await act(c.id, `${name}님이 씩씩케어를 시작했어요`);
  await logEvent(c.id, "onboarding_completed", { duration_sec: Number.isFinite(durationSec) ? Math.min(3600, Math.max(0, Math.round(durationSec))) : null, diagnosis: input.reason, living: input.living });
  redirect(`/c/${adminToken}?new=1`);
}

export async function updateCase(a: Auth, raw: CaseInput) {
  const actor = await admin(a);
  const input = validateInput(raw, todaySeoul());
  if (!input) throw new Error("입력값을 확인해주세요. 퇴원일은 오늘 기준 1년 전부터 1년 뒤까지 넣을 수 있어요");
  const { data: prev } = await db.from("cases").select("input").eq("id", actor.caseId).single();
  await db.from("cases").update({ input }).eq("id", actor.caseId);

  // 퇴원일이 바뀌면 상대 일정(D±n)만 다시 계산한다. 사용자가 날짜를 직접 정한 할 일(rel_day 없음)은 그대로.
  if ((prev?.input as CaseInput | undefined)?.dischargeDate !== input.dischargeDate) {
    const { data: rel } = await db.from("tasks").select("id,rel_day").eq("case_id", actor.caseId).not("rel_day", "is", null);
    await Promise.all((rel ?? []).map((t) =>
      db.from("tasks").update({ due_date: input.dischargeDate ? addDays(input.dischargeDate, t.rel_day) : null }).eq("id", t.id)));
    await act(actor.caseId, input.dischargeDate ? `퇴원일이 ${krDate(input.dischargeDate)}로 정해졌어요. 일정을 다시 계산했어요` : "퇴원일이 미정으로 바뀌었어요");
  }
  refresh();
}

export async function deleteCase(a: Auth) {
  const actor = await admin(a);
  await db.from("cases").delete().eq("id", actor.caseId); // members·tasks·상태·활동은 FK cascade로 함께 삭제
  await logEvent(null, "case_deleted");
  redirect("/?deleted=1");
}

// ---- 가족 ----

export async function joinCase(shareToken: string, name: string) {
  const n = name.trim().slice(0, 20);
  if (!n) throw new Error("이름을 입력해주세요");
  const { data: c } = await db.from("cases").select("id,share_expires_at").eq("share_token", shareToken).maybeSingle();
  if (!c || Date.parse(c.share_expires_at) < Date.now()) throw new Error("만료되었거나 잘못된 링크예요. 초대한 가족에게 새 링크를 요청해주세요");
  const { count } = await db.from("members").select("id", { count: "exact", head: true }).eq("case_id", c.id);
  if ((count ?? 0) >= 12) throw new Error("참여 인원이 가득 찼어요");
  const { data: m, error } = await db.from("members").insert({ case_id: c.id, name: n, role: "member" }).select("id").single();
  if (error) throw new Error("참여하지 못했어요. 다시 시도해주세요");
  await act(c.id, `${n}님이 가족으로 참여했어요`);
  await logEvent(c.id, "member_joined");
  redirect(`/m/${m.id}`);
}

// 링크가 새어 나갔을 때를 대비해 초대 링크를 새로 만든다. 이전 링크는 즉시 무효.
export async function renewShareLink(a: Auth) {
  const actor = await admin(a);
  await db.from("cases").update({ share_token: token(), share_expires_at: shareExpiry() }).eq("id", actor.caseId);
  await logEvent(actor.caseId, "invite_link_created");
  refresh();
}

export async function removeMember(a: Auth, memberId: string) {
  const actor = await admin(a);
  if (memberId === actor.memberId) throw new Error("관리자는 내보낼 수 없어요");
  const { data: m } = await db.from("members").select("name").eq("id", memberId).eq("case_id", actor.caseId).maybeSingle();
  if (!m) throw new Error("가족을 찾을 수 없어요");
  await db.from("members").delete().eq("id", memberId).eq("case_id", actor.caseId); // 담당 할 일은 FK set null로 '담당자 없음'이 된다
  await act(actor.caseId, `${m.name}님이 가족에서 빠졌어요`);
  refresh();
}

// ---- 할 일 ----

export async function toggleTask(a: Auth, taskId: string, done: boolean) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("title,assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  // 가족 참여자는 자기 담당 할 일만 완료할 수 있다
  if (actor.role === "member" && t.assignee_id !== actor.memberId) throw new Error("내 담당 할 일만 체크할 수 있어요");
  await db.from("tasks").update({ done: !!done, done_at: done ? new Date().toISOString() : null, done_by: done ? actor.name : null }).eq("id", taskId);
  if (done) {
    await act(actor.caseId, `${actor.name}님이 완료했어요: ${t.title}`);
    await logEvent(actor.caseId, "task_completed", { role: actor.role });
  }
  refresh();
}

export async function assignTask(a: Auth, taskId: string, memberId: string | null) {
  const actor = await admin(a);
  const { data: t } = await db.from("tasks").select("title").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  if (memberId) {
    const { data: m } = await db.from("members").select("name").eq("id", memberId).eq("case_id", actor.caseId).maybeSingle();
    if (!m) throw new Error("가족을 찾을 수 없어요");
    await act(actor.caseId, `담당 지정 (${m.name}): ${t.title}`);
  }
  await db.from("tasks").update({ assignee_id: memberId }).eq("id", taskId).eq("case_id", actor.caseId);
  refresh();
}

// 가족 참여자가 담당자 없는 할 일을 스스로 맡는다("내가 할게"). 이미 담당자가 있으면 바꾸지 못한다.
export async function claimTask(a: Auth, taskId: string) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").update({ assignee_id: actor.memberId })
    .eq("id", taskId).eq("case_id", actor.caseId).is("assignee_id", null).select("title").maybeSingle();
  if (!t) throw new Error("이미 다른 가족이 맡았거나 없는 할 일이에요");
  await act(actor.caseId, `${actor.name}님이 맡았어요: ${t.title}`);
  await logEvent(actor.caseId, "task_claimed", { role: actor.role });
  refresh();
}

// schedule은 병원 방문 일정(그날 홈에 외래 리포트가 먼저 나온다), question은 외래 때 의료진에게 물어볼 것.
export async function addTask(a: Auth, title: string, dueDate: string | null, kind: "custom" | "schedule" | "question" = "custom") {
  const actor = await admin(a);
  const t = title.trim().slice(0, 100);
  if (!t) throw new Error("내용을 입력해주세요");
  if (!["custom", "schedule", "question"].includes(kind)) throw new Error("잘못된 요청이에요");
  if (kind === "schedule" && !isDate(dueDate)) throw new Error("병원 일정은 날짜가 필요해요");
  await db.from("tasks").insert({ case_id: actor.caseId, title: t, kind, source: "manual", due_date: isDate(dueDate) ? dueDate : null });
  refresh();
}

export async function updateTask(a: Auth, taskId: string, patch: { title: string; dueDate: string | null; assigneeId: string | null; memo: string }) {
  const actor = await admin(a);
  const title = patch.title.trim().slice(0, 100);
  if (!title) throw new Error("할 일 내용을 입력해주세요");
  const { data: cur } = await db.from("tasks").select("due_date").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!cur) throw new Error("할 일을 찾을 수 없어요");
  if (patch.assigneeId) {
    const { data: m } = await db.from("members").select("id").eq("id", patch.assigneeId).eq("case_id", actor.caseId).maybeSingle();
    if (!m) throw new Error("가족을 찾을 수 없어요");
  }
  const due = isDate(patch.dueDate) ? patch.dueDate : null;
  await db.from("tasks").update({
    title, due_date: due, assignee_id: patch.assigneeId || null, memo: patch.memo.trim().slice(0, 500) || null,
    // 날짜를 직접 바꾸면 그때부터 퇴원일 변경을 따라가지 않는다
    ...(due !== cur.due_date ? { rel_day: null } : {}),
  }).eq("id", taskId).eq("case_id", actor.caseId);
  refresh();
}

// 참여자도 자기 담당 할 일에는 메모를 남길 수 있다
export async function setTaskMemo(a: Auth, taskId: string, memo: string) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  if (actor.role === "member" && t.assignee_id !== actor.memberId) throw new Error("내 담당 할 일에만 메모할 수 있어요");
  await db.from("tasks").update({ memo: memo.trim().slice(0, 500) || null }).eq("id", taskId);
  refresh();
}

export async function deleteTask(a: Auth, taskId: string) {
  const actor = await admin(a);
  await db.from("tasks").delete().eq("id", taskId).eq("case_id", actor.caseId);
  refresh();
}

// ---- 지원 ----

const STATUSES = ["none", "applied", "approved", "rejected", "dropped"];
export async function setBenefitStatus(a: Auth, benefitId: string, status: string) {
  const actor = await resolve(a);
  const b = BENEFITS.find((x) => x.id === benefitId);
  if (!b || !STATUSES.includes(status)) throw new Error("잘못된 요청이에요");
  const { data: prev } = await db.from("benefit_status").select("status").eq("case_id", actor.caseId).eq("benefit_id", benefitId).maybeSingle();
  await db.from("benefit_status").upsert({ case_id: actor.caseId, benefit_id: benefitId, status, updated_by: actor.name, updated_at: new Date().toISOString() });
  await act(actor.caseId, `${actor.name}님이 "${b.name}" 상태를 변경했어요: ${STATUS_LABEL[status]}`);
  await logEvent(actor.caseId, "benefit_status_changed", { benefit: benefitId, from: prev?.status ?? "none", to: status });
  refresh();
}

export async function setDocsChecked(a: Auth, benefitId: string, checked: string[]) {
  const actor = await resolve(a);
  const b = BENEFITS.find((x) => x.id === benefitId);
  if (!b) throw new Error("잘못된 요청이에요");
  const docs = (Array.isArray(checked) ? checked : []).filter((d) => b.docs.includes(d));
  await db.from("benefit_status").upsert({ case_id: actor.caseId, benefit_id: benefitId, docs_checked: docs });
  refresh();
}

// ---- 보험 청구 서류 ----

export async function savePacket(a: Auth, hospital: string, silson24: string | null, checked: string[]) {
  const actor = await admin(a);
  const docs = (Array.isArray(checked) ? checked : []).filter((d) => PACKET.some((p) => p.id === d));
  await db.from("cases").update({
    hospital: hospital.trim().slice(0, 40) || null, silson24: silson24 === "yes" || silson24 === "no" ? silson24 : null, docs_checked: docs,
  }).eq("id", actor.caseId);
  await logEvent(actor.caseId, "doc_packet_viewed", { silson24: silson24 ?? "unknown", checked: docs.length });
  refresh();
}

// ---- 저녁 안부 체크 ----

export async function saveDaily(a: Auth, raw: unknown) {
  const actor = await resolve(a);
  const v = validDaily(raw);
  if (!v) throw new Error("입력값을 확인해주세요");
  await upsertDaily(actor.caseId, actor.name, todaySeoul(), v);
  refresh();
}
