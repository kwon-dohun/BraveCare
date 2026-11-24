// 챗봇이 근거로 읽는 '우리 집 씩씩케어 정보'. 한 줄에 사실 하나씩 적어서, 답의 근거 문장을 그대로 인용할 수 있게 한다.
import type { CaseInput, Result } from "./benefits.ts";
import { dayDiff } from "./benefits.ts";
import { krDate } from "./format.ts";
import { KIND_LABEL, type TaskKind } from "./timeline.ts";
import { REASON_LABEL } from "./options.ts";

// 질문 없이 진료 중에 들은 말을 적을 때 쓰는 제목. 질문이 아니라 들은 말로 읽히게 한다
export const HEARD_NOTE = "그 외에 들은 말";

interface T { title: string; kind: TaskKind; due_date: string | null; assignee_id: string | null; done: boolean; memo?: string | null; done_at?: string | null }
interface M { id: string; name: string; role: string }

export function caseBrief(d: {
  input: CaseInput; today: string; tasks: T[]; members: M[]; results: Result[]; status: Record<string, string>;
  hospital: string; silson24: "yes" | "no" | null; packet: string[]; alone?: boolean;
}): string {
  const who = (id: string | null) => d.members.find((m) => m.id === id)?.name ?? "담당자 없음";
  const line = (t: T) => `${t.due_date ? krDate(t.due_date) : "날짜 미정"} ${t.title} (${KIND_LABEL[t.kind]}, ${who(t.assignee_id)})`;
  const open = d.tasks.filter((t) => !t.done);
  const out: string[] = [];

  const dc = d.input.dischargeDate;
  out.push(dc ? `퇴원일: ${krDate(dc)} (${dayDiff(dc, d.today) > 0 ? `${dayDiff(dc, d.today)}일 남음` : dayDiff(dc, d.today) === 0 ? "오늘" : `퇴원 ${-dayDiff(dc, d.today)}일째`})` : "퇴원일: 아직 정해지지 않았어요");
  out.push(`오늘: ${krDate(d.today)}`);
  out.push(`입원 이유: ${REASON_LABEL.find(([k]) => k === d.input.reason)?.[1] ?? "입력 안 함"}`);
  if (!d.alone) out.push(`가족: ${d.members.map((m) => m.name).join(", ")}`);

  const today = open.filter((t) => t.due_date === d.today);
  out.push(today.length ? `오늘 할 일 ${today.length}개:` : "오늘 할 일: 없어요");
  today.forEach((t) => out.push(`- ${line(t)}`));

  const late = open.filter((t) => t.due_date && t.due_date < d.today);
  if (late.length) { out.push(`지나간 날짜인데 아직 안 한 일 ${late.length}개:`); late.slice(0, 6).forEach((t) => out.push(`- ${line(t)}`)); }

  const visits = open.filter((t) => t.kind === "schedule" && t.due_date && t.due_date >= d.today);
  out.push(visits.length ? "다가오는 병원 일정:" : "다가오는 병원 일정: 아직 등록된 일정이 없어요");
  visits.slice(0, 5).forEach((t) => out.push(`- ${line(t)}`));

  const next = open.filter((t) => t.due_date && t.due_date > d.today).slice(0, 8);
  if (next.length) { out.push("앞으로 할 일:"); next.forEach((t) => out.push(`- ${line(t)}`)); }

  const qs = open.filter((t) => t.kind === "question").slice(0, 6);
  if (qs.length) { out.push("의료진에게 물어볼 질문:"); qs.forEach((t) => out.push(`- ${t.title}`)); }

  // 외래·회진 때 사용자가 직접 적은 의사 답변 메모(최근 것부터). 한 줄에 하나라 그대로 인용할 수 있다
  const heard = d.tasks.filter((t) => t.kind === "question" && t.memo).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 10);
  if (heard.length) {
    out.push("외래·회진 때 들은 답(사용자가 직접 적은 메모):");
    heard.forEach((t) => out.push(`- ${t.done_at ? `${krDate(new Date(t.done_at).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }))} ` : ""}${t.title === HEARD_NOTE ? "들은 말" : `질문 "${t.title}" → 들은 답`}: ${t.memo!.replace(/\s+/g, " ")}`));
  }

  const high = d.results.filter((r) => r.verdict === "high");
  out.push(`받을 가능성이 높은 지원 ${high.length}개:`);
  for (const r of high) {
    const b = r.benefit, dl = r.deadline;
    const due = dl.state === "open" && dl.endDate ? ` 신청 마감 ${krDate(dl.endDate)}.` : dl.state === "closed" ? " 신청 기간이 지났어요." : "";
    out.push(`- ${b.name}: ${b.summary} 비용·혜택: ${b.cost}. 신청: ${r.apply.place}${r.apply.phone ? ` (${r.apply.phone})` : ""}.${due} 상태: ${d.status[b.id] === "applied" ? "신청함" : d.status[b.id] === "approved" ? "승인" : "아직 신청 안 함"}`);
  }
  const check = d.results.filter((r) => r.verdict === "check");
  if (check.length) out.push(`조건 확인이 필요한 지원: ${check.map((r) => r.benefit.name).join(", ")}`);

  out.push(`입원 병원: ${d.hospital || "아직 입력하지 않았어요"}`);
  out.push(`실손24 전산 청구: ${d.silson24 === "yes" ? "되는 병원" : d.silson24 === "no" ? "안 되는 병원이라 종이 서류가 필요해요" : "아직 확인 전"}`);
  out.push(`받아 둔 보험 청구 서류: ${d.packet.length}/4개`);
  return out.join("\n");
}
