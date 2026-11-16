import { notFound } from "next/navigation";
import { caseFromPatientToken } from "@/lib/db";
import { db } from "@/lib/db";
import { todaySeoul } from "@/lib/load";
import { krDate } from "@/lib/format";
import type { Daily } from "@/lib/report";
import PatientCheckFlow from "./PatientCheckFlow";

export const metadata = {
  title: "오늘 안부 보내기 · 씩씩케어",
  description: "버튼 4개로 오늘 컨디션을 가족에게 알려드려요",
  robots: { index: false },
};

export default async function PatientPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const patientCase = await caseFromPatientToken(token);
  if (!patientCase) notFound();

  const today = todaySeoul();
  const { data } = await db
    .from("daily_checks")
    .select("check_date,med_morning,med_lunch,med_dinner,side_effect,temp,wound_issue,pain,bowel,notes")
    .eq("case_id", patientCase.caseId)
    .eq("check_date", today)
    .maybeSingle();

  const todayDateObj = new Date();
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  const dayName = days[todayDateObj.getDay()];
  const todayStr = `${krDate(today)} (${dayName}요일)`;

  return (
    <main className="min-h-screen bg-background">
      <PatientCheckFlow
        patientToken={token}
        todayStr={todayStr}
        initialDaily={(data as Daily) ?? null}
      />
    </main>
  );
}
