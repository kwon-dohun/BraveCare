// 지원 제도와 할 일을 잇는 순수 로직. 지원 상세에서 "할 일에 넣기"를 누르면 신청 방법·필요 서류가 붙은 할 일이 달력에 생기고,
// 할 일을 끝내면 신청함으로, 신청함으로 바꾸면 할 일이 끝남으로 서로 따라간다.
import { BENEFITS } from "./benefits.ts";
import { addDays } from "./timeline.ts";

export const benefitTaskTitle = (name: string) => `${name} 신청하기`;

// 할 일이 어느 지원의 것인지. benefit_id가 있으면 그것, 예전에 자동으로 만든 "○○ 신청 알아보기"는 제목으로 찾는다.
export function benefitIdOfTask(t: { benefit_id?: string | null; source: string; title: string }): string | null {
  if (t.benefit_id) return t.benefit_id;
  if (t.source !== "benefit") return null;
  return BENEFITS.find((b) => t.title === benefitTaskTitle(b.name) || t.title === `${b.name} 신청 알아보기`)?.id ?? null;
}

// 신청 방법 글에서 온라인·방문·전화 중 무엇이 가능한지 짐작해 표시한다(글자 기준이라 참고용).
export function applyWays(place: string, phone?: string): ("온라인" | "방문" | "전화")[] {
  const out: ("온라인" | "방문" | "전화")[] = [];
  if (/온라인|복지로|공유누리|홈페이지|누리집|인터넷|웹사이트|\.go\.kr|앱/.test(place)) out.push("온라인");
  if (/방문|주민센터|행정복지센터|보건소|지사|원무과|병원|센터|구청|시청|군청/.test(place)) out.push("방문");
  if (phone || /전화/.test(place)) out.push("전화");
  return out;
}

// 할 일 날짜 기본값: 이틀 뒤. 신청 마감이 그보다 가까우면 마감일.
export function defaultBenefitDue(today: string, endDate?: string): string {
  const soon = addDays(today, 2);
  return endDate && endDate < soon ? (endDate < today ? today : endDate) : soon;
}
