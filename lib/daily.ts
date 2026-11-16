import "server-only";
import { db, logEvent } from "./db";
import type { Daily } from "./report";

export type DailyInput = Omit<Daily, "check_date">;
export const ALL_GOOD: DailyInput = { med_morning: true, med_lunch: true, med_dinner: true, side_effect: false, temp: "normal", wound_issue: false, pain: 0, bowel: "good", notes: null };

// 신뢰 경계 검증. 잘못된 값은 null.
export function validDaily(raw: unknown): DailyInput | null {
  const r = raw as Partial<DailyInput> | null;
  if (!r || typeof r !== "object") return null;
  const pain = Number(r.pain);
  if (!Number.isInteger(pain) || pain < 0 || pain > 10) return null;
  if (!["normal", "mild", "high"].includes(r.temp as string) || !["good", "constipation", "diarrhea"].includes(r.bowel as string)) return null;
  const notes = typeof r.notes === "string" ? r.notes.trim().slice(0, 300) : null;
  return {
    med_morning: !!r.med_morning, med_lunch: !!r.med_lunch, med_dinner: !!r.med_dinner, side_effect: !!r.side_effect,
    temp: r.temp!, wound_issue: !!r.wound_issue, pain, bowel: r.bowel!, notes: notes || null,
  };
}

export async function upsertDaily(caseId: string, by: string, date: string, v: DailyInput) {
  const { error } = await db.from("daily_checks").upsert({ case_id: caseId, check_date: date, ...v, updated_by: by, updated_at: new Date().toISOString() });
  if (error) throw new Error("저장하지 못했어요. 다시 시도해주세요");
  await logEvent(caseId, "daily_checked");
}

export async function loadDaily(caseId: string): Promise<Daily[]> {
  const { data } = await db.from("daily_checks")
    .select("check_date,med_morning,med_lunch,med_dinner,side_effect,temp,wound_issue,pain,bowel,notes")
    .eq("case_id", caseId).order("check_date", { ascending: false }).limit(60);
  return (data ?? []) as Daily[];
}
