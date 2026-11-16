"use server";
import { revalidatePath } from "next/cache";
import { db, caseFromPatientToken, logEvent } from "@/lib/db";
import { upsertDaily } from "@/lib/daily";
import { act } from "@/lib/push";
import { todaySeoul } from "@/lib/load";

export interface PatientDailyInput {
  med_morning: boolean;
  med_lunch: boolean;
  med_dinner: boolean;
  temp: "normal" | "mild" | "high";
  wound_issue: boolean;
  pain: number; // 1 (거의 안 아픔), 4 (조금 아픔), 8 (많이 아픔)
  bowel: "good" | "constipation" | "diarrhea";
  notes?: string;
}

export async function submitPatientDailyCheck(patientToken: string, data: PatientDailyInput) {
  const patientCase = await caseFromPatientToken(patientToken);
  if (!patientCase) {
    throw new Error("안부 링크가 올바르지 않거나 만료되었어요. 가족에게 링크를 다시 받아주세요");
  }

  const today = todaySeoul();
  const pain = Math.min(10, Math.max(0, Number(data.pain) || 0));
  const temp = ["normal", "mild", "high"].includes(data.temp) ? data.temp : "normal";
  const bowel = ["good", "constipation", "diarrhea"].includes(data.bowel) ? data.bowel : "good";
  const notes = (data.notes ?? "").trim().slice(0, 300) || null;

  // 같은 날 가족이 먼저 남긴 '약 먹고 불편함' 표시는 환자 화면에 없는 항목이라 지우지 않고 이어 둔다
  const { data: prev } = await db.from("daily_checks").select("side_effect,source_role").eq("case_id", patientCase.caseId).eq("check_date", today).maybeSingle();
  await upsertDaily(
    patientCase.caseId,
    "환자 본인",
    today,
    {
      med_morning: !!data.med_morning,
      med_lunch: !!data.med_lunch,
      med_dinner: !!data.med_dinner,
      side_effect: !!prev?.side_effect,
      temp,
      wound_issue: !!data.wound_issue,
      pain,
      bowel,
      notes,
    },
    "patient",
  );

  const isSevere = pain >= 7 || temp === "high" || data.wound_issue;
  const taken = [data.med_morning, data.med_lunch, data.med_dinner].filter(Boolean).length;
  const issues = [pain >= 7 && "통증이 심해요", temp === "high" ? "고열이 있어요" : temp === "mild" ? "미열이 있어요" : "", data.wound_issue && "수술 부위가 불편해요"].filter(Boolean);
  const msg = `환자분이 오늘 안부를 남겼어요. ${taken === 3 ? "약은 다 먹었어요" : taken ? `약은 ${taken}번 먹었어요` : "약은 안 먹었어요"}. ${issues.length ? issues.join(", ") : "특별히 불편한 곳은 없어요"}`;

  // 고쳐서 다시 보낼 때마다 가족 폰이 울리지 않게: 오늘 처음 보낼 때와 위험 신호가 있을 때만 알린다
  if (prev?.source_role !== "patient" || isSevere) await act(patientCase.caseId, msg);
  await logEvent(patientCase.caseId, "patient_check_submitted", {
    is_severe: isSevere,
    pain,
    temp,
    bowel,
  });

  revalidatePath(`/p/${patientToken}`);
  revalidatePath("/c/[token]", "layout");

  return { success: true };
}
