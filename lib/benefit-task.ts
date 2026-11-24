// 지원 제도와 할 일을 잇는 순수 로직. 지원 상세에서 "할 일에 넣기"를 누르면 신청 방법·필요 서류가 붙은 할 일이 달력에 생기고,
// 할 일을 끝내면 신청함으로, 신청함으로 바꾸면 할 일이 끝남으로 서로 따라간다.
import { BENEFITS } from "./benefits.ts";
import { addDays } from "./timeline.ts";

// 이름이 이미 "신청"으로 끝나면(노인장기요양 등급 신청) "신청 신청하기"가 되지 않게 "하기"만 붙인다
export const benefitTaskTitle = (name: string) => (name.endsWith("신청") ? `${name}하기` : `${name} 신청하기`);

// 할 일이 어느 지원의 것인지. benefit_id가 있으면 그것, 예전에 자동으로 만든 "○○ 신청 알아보기"는 제목으로 찾는다.
export function benefitIdOfTask(t: { benefit_id?: string | null; source: string; title: string }): string | null {
  if (t.benefit_id) return t.benefit_id;
  if (t.source !== "benefit") return null;
  return BENEFITS.find((b) => t.title === benefitTaskTitle(b.name) || t.title === `${b.name} 신청하기` || t.title === `${b.name} 신청 알아보기`)?.id ?? null;
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

// 전화·방문할 때 그대로 읽을 수 있는 한 문단. 입원 이유와 퇴원일은 이 집의 정보로 채운다.
const REASON_PHRASE: Record<string, string> = {
  ortho: "정형외과 수술로", cancer: "암 치료로", brain: "뇌혈관 질환으로", heart: "심장 질환으로", surgery: "수술로", internal: "내과 질환으로", other: "입원 치료로",
};
export function callScript(o: { name: string; reason: string; dischargeDate: string | null; today: string; selfCare: boolean; check: boolean }): string {
  const who = o.selfCare ? "제가" : "저희 가족이";
  const when = o.dischargeDate
    ? `${Number(o.dischargeDate.slice(5, 7))}월 ${Number(o.dischargeDate.slice(8, 10))}일에 ${o.dischargeDate <= o.today ? "퇴원했어요" : "퇴원할 예정이에요"}`
    : "입원했다가 퇴원했어요";
  return `안녕하세요, ${o.name} 신청하려고 연락드렸어요. ${who} ${REASON_PHRASE[o.reason] ?? "입원 치료로"} ${when}.${o.check ? " 저희가 대상이 되는지도 확인해 주세요." : ""} 신청 방법과 필요한 서류를 알려 주세요.`;
}
