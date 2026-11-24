"use server";
import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db, resolve, logEvent, soloOwner, type Auth, type Actor } from "@/lib/db";
import { todaySeoul, loadCase } from "@/lib/load";
import { benefitIdOfTask, benefitTaskTitle, defaultBenefitDue } from "@/lib/benefit-task";
import { evaluate, validateInput, dayDiff, BENEFITS, STATUS_LABEL, type CaseInput } from "@/lib/benefits";
import { seedTasks, addDays, nextDue, SELF_CARE_TITLE_MAP } from "@/lib/timeline";
import { act } from "@/lib/push";
import { validDaily, upsertDaily } from "@/lib/daily";
import { krDate } from "@/lib/format";
import { HEARD_NOTE } from "@/lib/brief";
import { isValidSaved } from "@/lib/saved";

const token = () => randomUUID().replaceAll("-", "");
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const SHARE_DAYS = 7;
const shareExpiry = () => new Date(Date.now() + SHARE_DAYS * 86_400_000).toISOString();

function refresh() {
  revalidatePath("/c/[token]", "layout");
  revalidatePath("/m/[id]", "layout");
}
const isTime = (s: unknown): s is string => typeof s === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(s);

// ---- 케이스 ----

export async function logStart(source = "direct") {
  await logEvent(null, "onboarding_started", { entry_source: /^[\w.-]{1,40}$/.test(source) ? source : "other" });
}

// 하루 한 번(기기 기준) 화면을 열었다는 기록. KPI G7(D+7 재방문율)용이라 퇴원일 기준 며칠째인지 같이 남긴다.
export async function logOpen(a: Auth, app: boolean) {
  const actor = await resolve(a);
  const { data: c } = await db.from("cases").select("input").eq("id", actor.caseId).single();
  const discharge = (c?.input as CaseInput | undefined)?.dischargeDate;
  await logEvent(actor.caseId, "app_opened", { day: discharge ? -dayDiff(discharge, todaySeoul()) : null, role: actor.role, app: !!app });
}

export async function createCase(raw: CaseInput, adminName: string, consented: boolean, durationSec = NaN) {
  const today = todaySeoul();
  if (consented !== true) throw new Error("동의가 필요해요");
  const input = validateInput(raw, today);
  if (!input) throw new Error("입력값을 확인해주세요");
  const name = adminName.trim().slice(0, 20) || "나";

  const adminToken = token();
  const patientToken = token();
  const { data: c, error } = await db.from("cases")
    .insert({
      admin_token: adminToken,
      share_token: token(),
      share_expires_at: shareExpiry(),
      patient_token: patientToken,
      is_self_care: !!input.isSelfCare,
      input,
      consent_at: new Date().toISOString(),
    })
    .select("id").single();
  if (error) throw new Error("저장하지 못했어요. 잠시 후 다시 시도해주세요");
  const { data: me } = await db.from("members").insert({ case_id: c.id, name, role: "admin" }).select("id").single();

  const results = evaluate(input, today);
  await db.from("benefit_status").insert(results.filter((r) => r.verdict !== "no").map((r) => ({ case_id: c.id, benefit_id: r.benefit.id })));
  await db.from("tasks").insert(
    seedTasks(input, results).filter((t) => !(t.preOnly && input.dischargeDate && addDays(input.dischargeDate, t.rel) < today)).map((t) => ({
      case_id: c.id, title: t.title, kind: t.kind, rel_day: t.rel, source: t.source, benefit_id: t.benefitId ?? null, assignee_id: input.isSelfCare ? me?.id ?? null : null,
      due_date: input.dischargeDate ? addDays(input.dischargeDate, t.rel) : null,
    })),
  );
  await act(c.id, `${name}님이 씩씩케어를 시작했어요`, me?.id);
  await logEvent(c.id, "onboarding_completed", { duration_sec: Number.isFinite(durationSec) ? Math.min(3600, Math.max(0, Math.round(durationSec))) : null, diagnosis: input.reason, living: input.living });
  redirect(`/c/${adminToken}?new=1`);
}

export async function updateCase(a: Auth, raw: CaseInput) {
  const actor = await resolve(a);
  const input = validateInput(raw, todaySeoul());
  if (!input) throw new Error("입력값을 확인해주세요. 퇴원일은 오늘 기준 1년 전부터 1년 뒤까지 넣을 수 있어요");
  const { data: prev } = await db.from("cases").select("input,is_self_care").eq("id", actor.caseId).single();
  input.dailyCompleted = !!(prev?.input as CaseInput | undefined)?.dailyCompleted; // 설정 저장이 '회복 완료'를 풀지 않게
  input.dailyCompletedAt = (prev?.input as CaseInput | undefined)?.dailyCompletedAt;
  input.isSelfCare = input.living === "alone" && !!input.isSelfCare; // 혼자 지내는 경우에만 '환자 본인이 씀'이 있다
  await db.from("cases").update({ input, is_self_care: input.isSelfCare }).eq("id", actor.caseId);
  if (!!prev?.is_self_care !== input.isSelfCare) await switchMode(actor, input.isSelfCare);

  // 퇴원일이 바뀌면 상대 일정(D±n)만 다시 계산한다. 사용자가 날짜를 직접 정한 할 일(rel_day 없음)은 그대로.
  if ((prev?.input as CaseInput | undefined)?.dischargeDate !== input.dischargeDate) {
    const { data: rel } = await db.from("tasks").select("id,rel_day").eq("case_id", actor.caseId).not("rel_day", "is", null);
    await Promise.all((rel ?? []).map((t) =>
      db.from("tasks").update({ due_date: input.dischargeDate ? addDays(input.dischargeDate, t.rel_day) : null }).eq("id", t.id)));
    await act(actor.caseId, input.dischargeDate ? `퇴원일이 ${krDate(input.dischargeDate)}로 정해졌어요. 일정을 다시 계산했어요` : "퇴원일이 미정으로 바뀌었어요", actor.memberId);
  }
  refresh();
}

// 쓰는 사람이 바뀌어도 할 일·기록은 그대로 둔다. 혼자 쓰게 되면 남은 일을 모두 내 일로 옮기고,
// 기본 할 일 제목만 쓰는 사람에 맞는 말투로 바꾼다(반대로 돌아가면 원래 제목으로).
async function switchMode(actor: Actor, solo: boolean) {
  const { data: rows } = await db.from("tasks").select("id,title,done,source").eq("case_id", actor.caseId);
  const map = solo ? SELF_CARE_TITLE_MAP : Object.fromEntries(Object.entries(SELF_CARE_TITLE_MAP).map(([a, b]) => [b, a]));
  await Promise.all((rows ?? []).filter((t) => t.source === "template" && map[t.title]).map((t) =>
    db.from("tasks").update({ title: map[t.title] }).eq("id", t.id)));
  // 함께하는 사람이 없을 때만 남은 일을 모두 내 일로 옮긴다(이미 나눠 맡은 일은 그대로)
  const { count } = await db.from("members").select("id", { count: "exact", head: true }).eq("case_id", actor.caseId);
  if (solo && (count ?? 0) <= 1) await db.from("tasks").update({ assignee_id: actor.memberId }).eq("case_id", actor.caseId).eq("done", false);
  await act(actor.caseId, solo ? "이제 환자 본인이 쓰는 화면으로 바뀌었어요. 할 일과 기록은 그대로 있어요" : "이제 가족이 함께 쓰는 화면으로 바뀌었어요. 할 일과 기록은 그대로 있어요", actor.memberId);
  await logEvent(actor.caseId, "care_mode_changed", { self_care: solo });
}

export async function setDailyCompleted(a: Auth, completed: boolean) {
  const actor = await resolve(a);
  const { data: c } = await db.from("cases").select("input").eq("id", actor.caseId).single();
  const prevInput = (c?.input as CaseInput) || {};
  const input = { ...prevInput, dailyCompleted: !!completed, dailyCompletedAt: completed ? todaySeoul() : undefined };
  await db.from("cases").update({ input }).eq("id", actor.caseId);
  await act(
    actor.caseId,
    completed
      ? "환자분의 회복이 안정되어 데일리 체크를 마쳤어요. 건강한 일상 복귀를 응원해요!"
      : "데일리 체크를 다시 시작했어요",
    actor.memberId,
  );
  await logEvent(actor.caseId, completed ? "daily_check_ended" : "daily_check_resumed");
  refresh();
}

export async function deleteCase(a: Auth) {
  const actor = await resolve(a);
  if (actor.role !== "admin") throw new Error("전체 삭제는 처음 만든 가족만 할 수 있어요"); // 되돌릴 수 없는 일이라 한 사람에게만
  await db.from("events").delete().eq("case_id", actor.caseId); // 이벤트는 외래키가 없어 cascade로 안 지워진다
  await db.from("cases").delete().eq("id", actor.caseId); // members·tasks·상태·활동은 FK cascade로 함께 삭제
  await logEvent(null, "case_deleted");
  redirect("/?deleted=1");
}

// ---- 가족 ----

// 참여한 가족이 스스로 나간다. 맡았던 할 일은 '담당자 없음'이 된다.
export async function leaveCase(a: Auth) {
  const actor = await resolve(a);
  if (actor.role === "admin") throw new Error("처음 만든 가족은 나갈 수 없어요. 기록을 지우려면 전체 삭제를 써주세요");
  await db.from("members").delete().eq("id", actor.memberId);
  await act(actor.caseId, `${actor.name}님이 가족에서 나갔어요`);
  redirect("/?left=1");
}

// 새 소식을 봤다고 표시
export async function markSeen(a: Auth) {
  const actor = await resolve(a);
  await db.from("members").update({ seen_at: new Date().toISOString() }).eq("id", actor.memberId); // 보고 있는 목록의 '새 소식' 점이 바로 사라지지 않게 화면은 다시 그리지 않는다
}

export async function unlinkKakao(a: Auth) {
  const actor = await resolve(a);
  await db.from("members").update({ kakao_id: null }).eq("id", actor.memberId);
  refresh();
}

export async function joinCase(shareToken: string, name: string) {
  const n = name.trim().slice(0, 20);
  if (!n) throw new Error("이름을 입력해주세요");
  const { data: c } = await db.from("cases").select("id,share_expires_at").eq("share_token", shareToken).maybeSingle();
  if (!c || Date.parse(c.share_expires_at) < Date.now()) throw new Error("만료되었거나 잘못된 링크예요. 초대한 가족에게 새 링크를 요청해주세요");
  const { count } = await db.from("members").select("id", { count: "exact", head: true }).eq("case_id", c.id);
  if ((count ?? 0) >= 12) throw new Error("참여 인원이 가득 찼어요");

  // 동명이인 가족 참여 시 혼선 방지를 위해 자동으로 번호 부여 (예: 지은 2)
  let finalName = n;
  const { data: existingSame } = await db.from("members").select("name").eq("case_id", c.id);
  const sameCount = (existingSame ?? []).filter((m) => m.name === n || m.name.startsWith(`${n} `)).length;
  if (sameCount > 0) {
    finalName = `${n} ${sameCount + 1}`.slice(0, 20);
  }

  const { data: m, error } = await db.from("members").insert({ case_id: c.id, name: finalName, role: "member" }).select("id").single();
  if (error) throw new Error("참여하지 못했어요. 다시 시도해주세요");
  // 환자 본인이 혼자 쓰던 곳에 처음 누가 들어오면, 숨겨 두었던 나누기 기능이 열린다는 걸 함께 알린다
  const { data: cs } = await db.from("cases").select("is_self_care").eq("id", c.id).single();
  await act(c.id, cs?.is_self_care && (count ?? 0) <= 1
    ? `${finalName}님이 함께하게 됐어요. 이제 할 일을 맡길 수 있고, 누가 맡았는지 할 일마다 보여요`
    : `${finalName}님이 가족으로 참여했어요`, m.id);
  await logEvent(c.id, "member_joined");
  redirect(`/c/${m.id}`);
}

// 링크가 새어 나갔을 때를 대비해 초대 링크를 새로 만든다. 이전 링크는 즉시 무효.
export async function renewShareLink(a: Auth) {
  const actor = await resolve(a);
  await db.from("cases").update({ share_token: token(), share_expires_at: shareExpiry() }).eq("id", actor.caseId);
  await logEvent(actor.caseId, "invite_link_created");
  refresh();
}

export async function removeMember(a: Auth, memberId: string) {
  const actor = await resolve(a);
  if (memberId === actor.memberId) throw new Error("나 자신은 내보낼 수 없어요");
  const { data: m } = await db.from("members").select("name,role").eq("id", memberId).eq("case_id", actor.caseId).maybeSingle();
  if (!m) throw new Error("가족을 찾을 수 없어요");
  if (m.role === "admin") throw new Error("처음 만든 가족은 내보낼 수 없어요"); // 이 사람의 주소가 케이스 토큰이라 지우면 그 주소가 끊긴다
  await db.from("members").delete().eq("id", memberId).eq("case_id", actor.caseId); // 담당 할 일은 FK set null로 '담당자 없음'이 된다
  await act(actor.caseId, `${m.name}님이 가족에서 빠졌어요`, actor.memberId);
  refresh();
}

// ---- 할 일 ----

export async function toggleTask(a: Auth, taskId: string, done: boolean) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("title,kind,due_date,due_time,repeat,assignee_id,memo,source,benefit_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  // 반복 할 일은 끝낼 때 다음 회차를 새로 만들고, 끝낸 쪽의 반복은 지운다(체크를 풀었다 다시 눌러도 두 번 생기지 않게)
  const next = done && t.repeat ? { ...t, case_id: actor.caseId, source: "manual", due_date: nextDue(t.due_date, t.repeat, todaySeoul()) } : null;
  await db.from("tasks").update({ done: !!done, done_at: done ? new Date().toISOString() : null, done_by: done ? actor.name : null, ...(next ? { repeat: null } : {}) }).eq("id", taskId);
  if (next) await db.from("tasks").insert(next);
  // 지원 신청 할 일을 끝내면 그 지원이 '신청함'으로, 끝냄을 풀면 '신청함'이었던 것은 '미신청'으로 돌아간다
  const bid = benefitIdOfTask(t);
  if (bid) {
    const { data: st } = await db.from("benefit_status").select("status").eq("case_id", actor.caseId).eq("benefit_id", bid).maybeSingle();
    const cur = st?.status ?? "none";
    const to = done && cur === "none" ? "applied" : !done && cur === "applied" ? "none" : null;
    if (to) {
      await db.from("benefit_status").upsert({ case_id: actor.caseId, benefit_id: bid, status: to, updated_by: actor.name, updated_at: new Date().toISOString() });
      await logEvent(actor.caseId, "benefit_status_changed", { benefit: bid, from: cur, to, via: "task" });
    }
  }
  if (done) {
    await act(actor.caseId, `${actor.name}님이 완료했어요: ${t.title}`, actor.memberId);
    await logEvent(actor.caseId, "task_completed", { role: actor.role });
  }
  refresh();
}

export async function assignTask(a: Auth, taskId: string, memberId: string | null) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("title,assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  if ((t.assignee_id ?? null) === (memberId || null)) return; // 바뀐 게 없다
  const { data: names } = await db.from("members").select("id,name").eq("case_id", actor.caseId);
  const nameOf = (id: string | null) => names?.find((m) => m.id === id)?.name;
  if (memberId && !nameOf(memberId)) throw new Error("가족을 찾을 수 없어요");
  await db.from("tasks").update({ assignee_id: memberId || null }).eq("id", taskId).eq("case_id", actor.caseId);

  // 남의 일도 바꿀 수 있게 열어 두는 대신, 바뀐 사실이 가족 모두에게 남고 알림이 간다
  const prev = nameOf(t.assignee_id);
  const to = memberId ? nameOf(memberId) : null;
  const text = !memberId ? `${actor.name}님이 ${prev}님의 담당을 비웠어요: ${t.title}`
    : memberId === actor.memberId ? (prev ? `${actor.name}님이 ${prev}님의 일을 넘겨받았어요: ${t.title}` : `${actor.name}님이 맡았어요: ${t.title}`)
    : prev ? `${actor.name}님이 담당을 ${prev}님에서 ${to}님으로 바꿨어요: ${t.title}` : `${actor.name}님이 ${to}님에게 맡겼어요: ${t.title}`;
  await act(actor.caseId, text, actor.memberId);
  if (memberId === actor.memberId) await logEvent(actor.caseId, "task_claimed", { role: actor.role }); // KPI G4
  refresh();
}

// 담당자 없는 할 일을 스스로 맡는다("내가 할게"). 이미 담당자가 있으면 바꾸지 못한다.
export async function claimTask(a: Auth, taskId: string) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").update({ assignee_id: actor.memberId })
    .eq("id", taskId).eq("case_id", actor.caseId).is("assignee_id", null).select("title").maybeSingle();
  if (!t) {
    // 0.1초 차이로 먼저 맡은 가족이 있으면 이름을 알려준다
    const { data: cur } = await db.from("tasks").select("assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
    const { data: who } = cur?.assignee_id ? await db.from("members").select("name").eq("id", cur.assignee_id).maybeSingle() : { data: null };
    throw new Error(who ? `방금 ${who.name}님이 먼저 맡았어요` : "없어진 할 일이에요");
  }
  await act(actor.caseId, `${actor.name}님이 맡았어요: ${t.title}`, actor.memberId);
  await logEvent(actor.caseId, "task_claimed", { role: actor.role });
  refresh();
}

// 내가 맡은 할 일을 다시 취소하여 담당자 없는 상태로 되돌린다.
export async function unclaimTask(a: Auth, taskId: string) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("title,assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  await db.from("tasks").update({ assignee_id: null }).eq("id", taskId).eq("case_id", actor.caseId);
  await act(actor.caseId, `${actor.name}님이 담당을 취소했어요: ${t.title}`, actor.memberId);
  await logEvent(actor.caseId, "task_unclaimed", { role: actor.role });
  refresh();
}

// schedule은 병원 방문 일정(그날 홈에 외래 리포트가 먼저 나온다), question은 외래 때 의료진에게 물어볼 것.
export async function addTask(a: Auth, title: string, dueDate: string | null, kind: "custom" | "schedule" | "question" = "custom", dueTime: string | null = null, extra?: { repeat?: string | null; assigneeId?: string | null; memo?: string }) {
  const actor = await resolve(a);
  const t = title.trim().slice(0, 100);
  if (!t) throw new Error("내용을 입력해주세요");
  if (!["custom", "schedule", "question"].includes(kind)) throw new Error("잘못된 요청이에요");
  if (kind === "schedule" && !isDate(dueDate)) throw new Error("병원 일정은 날짜가 필요해요");
  const due = isDate(dueDate) ? dueDate : null;
  const repeat = due && kind !== "schedule" && (extra?.repeat === "daily" || extra?.repeat === "weekly") ? extra.repeat : null; // 날짜가 있어야 반복할 수 있다
  const { data: row } = await db.from("tasks").insert({
    case_id: actor.caseId, title: t, kind, source: "manual", assignee_id: await soloOwner(actor.caseId, actor.memberId),
    due_date: due, due_time: due && isTime(dueTime) ? dueTime : null, repeat, memo: (extra?.memo ?? "").trim().slice(0, 500) || null,
  }).select("id").single();
  if (row && extra?.assigneeId) await assignTask(a, row.id, extra.assigneeId); // 담당을 정하면 가족에게 알린다(가족인지도 여기서 확인)
  refresh();
}

export async function updateTask(a: Auth, taskId: string, patch: { title: string; dueDate: string | null; dueTime: string | null; repeat: string | null; assigneeId: string | null; memo: string }) {
  const actor = await resolve(a);
  const title = patch.title.trim().slice(0, 100);
  if (!title) throw new Error("할 일 내용을 입력해주세요");
  const { data: cur } = await db.from("tasks").select("due_date,assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!cur) throw new Error("할 일을 찾을 수 없어요");
  if (patch.assigneeId) {
    const { data: m } = await db.from("members").select("id").eq("id", patch.assigneeId).eq("case_id", actor.caseId).maybeSingle();
    if (!m) throw new Error("가족을 찾을 수 없어요");
  }
  const due = isDate(patch.dueDate) ? patch.dueDate : null;
  if ((cur.assignee_id ?? null) !== (patch.assigneeId || null)) await assignTask(a, taskId, patch.assigneeId || null); // 담당이 바뀌면 가족에게 알린다
  await db.from("tasks").update({
    title, due_date: due, due_time: due && isTime(patch.dueTime) ? patch.dueTime : null,
    repeat: due && (patch.repeat === "daily" || patch.repeat === "weekly") ? patch.repeat : null, // 날짜가 있어야 반복할 수 있다
    memo: patch.memo.trim().slice(0, 500) || null,
    // 날짜를 직접 바꾸면 그때부터 퇴원일 변경을 따라가지 않는다
    ...(due !== cur.due_date ? { rel_day: null } : {}),
  }).eq("id", taskId).eq("case_id", actor.caseId);
  refresh();
}

// 할 일 메모
export async function setTaskMemo(a: Auth, taskId: string, memo: string) {
  const actor = await resolve(a);
  const { data: t } = await db.from("tasks").select("assignee_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  if (!t) throw new Error("할 일을 찾을 수 없어요");
  await db.from("tasks").update({ memo: memo.trim().slice(0, 500) || null }).eq("id", taskId);
  refresh();
}

// 진료 직후: 다음 외래 일정과 새로 생긴 할 일을 한 번에 넣고, 가족에게는 한 줄로만 알린다. 새 할 일은 담당 없이 들어가 가족이 "내가 할게"로 가져간다(혼자 쓰는 모드는 본인 몫).
export async function recordVisit(a: Auth, v: { nextDate: string | null; nextTime: string | null; title: string; tasks: string[] }) {
  const actor = await resolve(a);
  const titles = v.tasks.map((t) => String(t).trim().slice(0, 100)).filter(Boolean).slice(0, 3);
  const next = isDate(v.nextDate) ? v.nextDate : null;
  if (next && next < todaySeoul()) throw new Error("다음 외래 날짜는 오늘 이후로 골라 주세요");
  if (!next && !titles.length) return;
  const owner = await soloOwner(actor.caseId, actor.memberId);
  const rows = [
    ...(next ? [{ title: String(v.title).trim().slice(0, 100) || "외래 진료", kind: "schedule", due_date: next, due_time: isTime(v.nextTime) ? v.nextTime : null }] : []),
    ...titles.map((title) => ({ title, kind: "custom", due_date: null, due_time: null })),
  ].map((r) => ({ case_id: actor.caseId, source: "manual", assignee_id: owner, repeat: null, memo: null, ...r }));
  await db.from("tasks").insert(rows);
  await act(actor.caseId, `${actor.name}님이 진료 결과를 남겼어요${next ? `. 다음 외래 ${krDate(next)}` : ""}${titles.length ? `, 새 할 일 ${titles.length}개` : ""}`, actor.memberId);
  await logEvent(actor.caseId, "visit_recorded", { next: !!next, tasks: titles.length });
  refresh();
}

// 진료 중에 질문 없이 들은 말. 답을 들은 질문처럼 '들은 답'에 쌓이고, 씩씩이도 같은 근거로 읽는다.
export async function addHeardNote(a: Auth, text: string) {
  const actor = await resolve(a);
  const memo = String(text).trim().slice(0, 500);
  if (!memo) throw new Error("내용을 입력해주세요");
  await db.from("tasks").insert({
    case_id: actor.caseId, title: HEARD_NOTE, kind: "question", source: "manual", assignee_id: await soloOwner(actor.caseId, actor.memberId),
    done: true, done_at: new Date().toISOString(), done_by: actor.name, memo,
  });
  refresh();
}

// 물어볼 것의 문구만 고친다(날짜·담당이 없는 질문용)
export async function renameTask(a: Auth, taskId: string, title: string) {
  const actor = await resolve(a);
  const t = title.trim().slice(0, 100);
  if (!t) throw new Error("내용을 입력해주세요");
  await db.from("tasks").update({ title: t }).eq("id", taskId).eq("case_id", actor.caseId);
  refresh();
}

export async function deleteTask(a: Auth, taskId: string) {
  const actor = await resolve(a);
  await db.from("tasks").delete().eq("id", taskId).eq("case_id", actor.caseId);
  refresh();
}

// 날짜가 지난 일 중 이미 끝낸 것을 골라 한꺼번에 끝냄으로 정리한다. 지원 신청 할 일은 끝내면 '신청함'으로 바뀌어 버리고, 반복하는 일은 다음 회차가 이어져야 해서 둘은 남겨 둔다.
export async function clearOverdue(a: Auth, picked: string[]) {
  const actor = await resolve(a);
  if (!Array.isArray(picked) || !picked.length) return;
  const { data } = await db.from("tasks").select("id,title,source,benefit_id").eq("case_id", actor.caseId).eq("done", false).neq("kind", "question").lt("due_date", todaySeoul()).is("repeat", null).in("id", picked.slice(0, 200).map(String));
  const ids = (data ?? []).filter((t) => !benefitIdOfTask(t)).map((t) => t.id);
  if (!ids.length) return;
  await db.from("tasks").update({ done: true, done_at: new Date().toISOString(), done_by: actor.name }).in("id", ids).eq("case_id", actor.caseId);
  await act(actor.caseId, `${actor.name}님이 날짜가 지난 일 ${ids.length}개를 정리했어요`, actor.memberId);
  await logEvent(actor.caseId, "overdue_cleared", { count: ids.length });
  refresh();
}

// 지난 할 일을 오늘 날짜로 즉시 변경
export async function rescheduleTaskToToday(a: Auth, taskId: string, todayDate: string) {
  const actor = await resolve(a);
  if (!isDate(todayDate)) throw new Error("날짜가 올바르지 않아요");
  await db.from("tasks").update({ due_date: todayDate, rel_day: null }).eq("id", taskId).eq("case_id", actor.caseId);
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
  await act(actor.caseId, `${actor.name}님이 "${b.name}" 상태를 변경했어요: ${STATUS_LABEL[status]}`, actor.memberId);
  await logEvent(actor.caseId, "benefit_status_changed", { benefit: benefitId, from: prev?.status ?? "none", to: status });
  // 이어진 할 일: 신청함·승인·거절이면 끝냄, 미신청이면 다시 열기, 포기면 지운다
  const { data: bt } = await db.from("tasks").select("id,done,title,source,benefit_id").eq("case_id", actor.caseId).in("source", ["benefit", "manual"]);
  const mine = (bt ?? []).filter((x) => benefitIdOfTask(x) === benefitId);
  if (mine.length) {
    const ids = mine.map((x) => x.id);
    if (status === "dropped") await db.from("tasks").delete().in("id", ids);
    else {
      const finished = status !== "none";
      await db.from("tasks").update({ done: finished, done_at: finished ? new Date().toISOString() : null, done_by: finished ? actor.name : null }).in("id", ids.filter((id) => mine.find((x) => x.id === id)?.done !== finished));
    }
  }
  refresh();
}

// 지원 상세의 "할 일에 넣기": 신청 방법·필요 서류가 붙은 할 일을 달력에 만든다. 이미 있으면 새로 만들지 않는다.
export async function createBenefitTask(a: Auth, benefitId: string, dueDate?: string | null) {
  const actor = await resolve(a);
  const b = BENEFITS.find((x) => x.id === benefitId);
  if (!b) throw new Error("잘못된 요청이에요");
  const { data: cur } = await db.from("tasks").select("id,source,title,benefit_id").eq("case_id", actor.caseId).in("source", ["benefit", "manual"]);
  const have = (cur ?? []).find((x) => benefitIdOfTask(x) === benefitId);
  if (have) {
    if (!have.benefit_id) await db.from("tasks").update({ benefit_id: benefitId }).eq("id", have.id); // 예전에 자동으로 만든 할 일에 연결을 붙인다
    refresh();
    return;
  }
  const data = await loadCase(actor.caseId);
  const r = data.results.find((x) => x.benefit.id === benefitId);
  const end = r?.deadline.state === "open" ? r.deadline.endDate : undefined;
  let due = isDate(dueDate) ? dueDate : defaultBenefitDue(todaySeoul(), end); // 고른 날짜를 따르되 오늘 이전·마감 이후는 범위 안으로
  if (due < todaySeoul()) due = todaySeoul();
  if (end && due > end) due = end >= todaySeoul() ? end : todaySeoul();
  await db.from("tasks").insert({ case_id: actor.caseId, title: benefitTaskTitle(b.name), kind: "admin", source: "benefit", benefit_id: benefitId, due_date: due, assignee_id: await soloOwner(actor.caseId, actor.memberId) });
  await act(actor.caseId, `${actor.name}님이 "${b.name}" 신청을 할 일에 넣었어요`, actor.memberId);
  await logEvent(actor.caseId, "benefit_task_created", { benefit: benefitId });
  refresh();
}

// 지원 신청 할 일의 날짜를 마감 안에서 바꾼다(날짜를 직접 정하면 퇴원일 변경을 따라가지 않는다)
export async function setTaskDue(a: Auth, taskId: string, dueDate: string) {
  const actor = await resolve(a);
  if (!isDate(dueDate)) throw new Error("날짜를 다시 골라 주세요");
  const { data: t } = await db.from("tasks").select("id,title,source,benefit_id").eq("id", taskId).eq("case_id", actor.caseId).maybeSingle();
  const bid = t ? benefitIdOfTask(t) : null;
  if (!t || !bid) throw new Error("할 일을 찾을 수 없어요");
  const data = await loadCase(actor.caseId);
  const r = data.results.find((x) => x.benefit.id === bid);
  const today = todaySeoul();
  const end = r?.deadline.state === "open" ? r.deadline.endDate : undefined;
  let due = dueDate < today ? today : dueDate;
  if (end && due > end) due = end >= today ? end : today;
  await db.from("tasks").update({ due_date: due, rel_day: null }).eq("id", taskId).eq("case_id", actor.caseId);
  await act(actor.caseId, `${actor.name}님이 "${t.title}" 날짜를 ${krDate(due)}로 바꿨어요`, actor.memberId);
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

export async function savePacket(a: Auth, hospital: string, silson24: string | null, checked: string[], customDocs?: string[]) {
  const actor = await resolve(a);
  const docs = (Array.isArray(checked) ? checked : []).filter((d) => typeof d === "string" && d.length <= 60);
  const updatePayload: Record<string, unknown> = {
    hospital: hospital.trim().slice(0, 40) || null,
    silson24: silson24 === "yes" || silson24 === "no" ? silson24 : null,
    docs_checked: docs,
  };

  if (customDocs !== undefined) {
    const { data: c } = await db.from("cases").select("input").eq("id", actor.caseId).single();
    if (c?.input) {
      updatePayload.input = {
        ...c.input,
        customDocs: customDocs.map((x) => String(x).trim().slice(0, 50)).filter(Boolean),
      };
    }
  }

  await db.from("cases").update(updatePayload).eq("id", actor.caseId);
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

// 지원 찜하기/해제. 구성원마다 따로 저장한다.
export async function toggleSaved(a: Auth, item: string, on: boolean) {
  const actor = await resolve(a);
  if (!isValidSaved(item)) throw new Error("없는 지원이에요");
  const { error } = on
    ? await db.from("saved_benefits").upsert({ member_id: actor.memberId, case_id: actor.caseId, item })
    : await db.from("saved_benefits").delete().eq("member_id", actor.memberId).eq("item", item);
  if (error) throw error;
  if (on) await logEvent(actor.caseId, "benefit_saved", { item });
  revalidatePath("/c/[token]/benefits", "layout");
}
