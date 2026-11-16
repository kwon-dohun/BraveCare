"use server";
import { revalidatePath } from "next/cache";
import { caseFromPatientToken, logEvent } from "@/lib/db";
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

  await upsertDaily(
    patientCase.caseId,
    "환자 본인",
    today,
    {
      med_morning: !!data.med_morning,
      med_lunch: !!data.med_lunch,
      med_dinner: !!data.med_dinner,
      side_effect: false,
      temp,
      wound_issue: !!data.wound_issue,
      pain,
      bowel,
      notes,
    },
    "patient",
  );

  const isSevere = pain >= 7 || temp === "high" || data.wound_issue;
  const allMedsTaken = data.med_morning && data.med_lunch && data.med_dinner;
  const medText = allMedsTaken ? "오늘 약 복용 완료" : "약 복용 체크";

  const msg = isSevere
    ? `환자분이 직접 오늘 안부를 남겼어요 (⚠️ 통증·열 등 주의 필요)`
    : `환자분이 직접 오늘 안부를 남겼어요 (${medText} · 컨디션 양호)`;

  await act(patientCase.caseId, msg);
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
