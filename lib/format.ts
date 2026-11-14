import { dayDiff } from "./benefits";

export function dischargeLabel(discharge: string | null, today: string) {
  if (!discharge) return "퇴원일 미정";
  const d = dayDiff(discharge, today);
  return d > 0 ? `퇴원 D-${d}` : d === 0 ? "오늘 퇴원" : `퇴원 ${-d}일째`;
}

export function dday(daysLeft: number) {
  return daysLeft === 0 ? "오늘 마감" : `마감 D-${daysLeft}`;
}

export function dateLabel(date: string | null, rel: number | null, today: string) {
  if (!date) return rel === null ? "" : rel === 0 ? "퇴원 당일" : rel < 0 ? `퇴원 ${-rel}일 전` : `퇴원 ${rel}일 후`;
  const d = dayDiff(date, today);
  const md = `${Number(date.slice(5, 7))}/${Number(date.slice(8))}`;
  return d === 0 ? `오늘 (${md})` : d === 1 ? `내일 (${md})` : d === -1 ? `어제 (${md})` : md;
}
