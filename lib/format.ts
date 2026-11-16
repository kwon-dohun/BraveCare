import { dayDiff } from "./benefits.ts";

export function dischargeLabel(discharge: string | null, today: string) {
  if (!discharge) return "퇴원일 미정";
  const d = dayDiff(discharge, today);
  return d > 0 ? `퇴원 D-${d}` : d === 0 ? "오늘 퇴원" : `퇴원 ${-d}일째`;
}

// 화면에 보이는 날짜는 ISO(2026-11-18) 대신 사람이 읽는 꼴로
export const krDate = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8, 10))}일`;
export const krDateYear = (d: string) => `${d.slice(0, 4)}년 ${krDate(d)}`;
// 14:00 → 오후 2시, 09:30 → 오전 9시 30분
export function krTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}시${m ? ` ${m}분` : ""}`;
}
export const dotDate = (d: string) => d.slice(0, 10).replaceAll("-", ".");

// 히어로용: 큰 숫자 하나 + 설명 한 줄
export function heroLabel(discharge: string | null, today: string) {
  if (!discharge) return { big: "D-?", sub: "퇴원일이 정해지면 다시 계산해요" };
  const d = dayDiff(discharge, today);
  const md = krDate(discharge);
  return d > 0 ? { big: `D-${d}`, sub: `${md} 퇴원까지` } : d === 0 ? { big: "D-Day", sub: "오늘 퇴원해요" } : { big: `${-d}일째`, sub: `${md} 퇴원 후 회복 중` };
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
