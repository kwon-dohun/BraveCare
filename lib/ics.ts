// 가족이 맡은 할 일을 휴대폰 기본 캘린더에 넣는 .ics. 전화번호를 받지 않고도 알림이 울리게 알람(VALARM)을 같이 넣는다.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
const ymd = (d: string) => d.replaceAll("-", "");
const nextDay = (d: string) => new Date(Date.parse(d) + 86_400_000).toISOString().slice(0, 10);

export const VISIT_HINT = "환자 신분증과 같이 가는 사람의 신분증을 챙기세요.";

export function taskIcs(t: { id: string; title: string; due_date: string; memo: string | null; kind: string }, hospital: string): string {
  const memo = [hospital && `병원: ${hospital}`, t.memo, t.kind === "schedule" && !t.memo ? VISIT_HINT : ""].filter(Boolean).join("\n");
  // shortcut: 75바이트 줄 접기를 하지 않는다. 주요 캘린더 앱은 긴 줄도 읽는다. 못 읽는 앱이 나오면 접기를 넣는다.
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BraveCare//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${t.id}@bravecare`,
    `DTSTAMP:${ymd(t.due_date)}T000000Z`,
    `DTSTART;VALUE=DATE:${ymd(t.due_date)}`,
    `DTEND;VALUE=DATE:${ymd(nextDay(t.due_date))}`,
    `SUMMARY:${esc(`[씩씩케어] ${t.title}`)}`,
    ...(memo ? [`DESCRIPTION:${esc(memo)}`] : []),
    // 종일 일정 기준: 전날 저녁 8시, 당일 아침 8시 30분
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`내일: ${t.title}`)}`, "TRIGGER:-PT4H", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`오늘: ${t.title}`)}`, "TRIGGER:PT8H30M", "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";
}
