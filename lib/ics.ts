// 가족이 맡은 할 일을 휴대폰 기본 캘린더에 넣는 .ics. 전화번호를 받지 않고도 알림이 울리게 알람(VALARM)을 같이 넣는다.

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\r?\n/g, "\\n");
// 만든 시각(UTC). 같은 UID를 다시 내려받으면 캘린더가 더 새로운 DTSTAMP를 갱신으로 본다
const stamp = () => new Date().toISOString().replace(/[-:]|\.\d{3}/g, "");
const ymd = (d: string) => d.replaceAll("-", "");
const nextDay = (d: string) => new Date(Date.parse(d) + 86_400_000).toISOString().slice(0, 10);

// RFC 5545: 한 줄은 75바이트까지, 넘으면 줄바꿈 + 공백으로 이어 쓴다. 한글은 3바이트라 글자 중간에서 자르지 않는다.
export function fold(line: string) {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = "", bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > 75) { out.push(cur); cur = " " + ch; bytes = 1 + n; } else { cur += ch; bytes += n; }
  }
  return [...out, cur].join("\r\n");
}

export const VISIT_HINT = "환자 신분증과 같이 가는 사람의 신분증을 챙기세요.";

const utc = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`).toISOString().replace(/[-:]|\.\d{3}/g, ""); // 한국 시간 → 20261127T050000Z

export function taskIcs(t: { id: string; title: string; due_date: string; due_time?: string | null; memo: string | null; kind: string }, hospital: string): string {
  const time = t.due_time?.slice(0, 5);
  const memo = [hospital && `병원: ${hospital}`, t.memo, t.kind === "schedule" && !t.memo ? VISIT_HINT : ""].filter(Boolean).join("\n");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BraveCare//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${t.id}@bravecare`,
    `DTSTAMP:${stamp()}`,
    ...(time
      ? [`DTSTART:${utc(t.due_date, time)}`, "DURATION:PT1H"]
      : [`DTSTART;VALUE=DATE:${ymd(t.due_date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(t.due_date))}`]),
    `SUMMARY:${esc(`[씩씩케어] ${t.title}`)}`,
    ...(memo ? [`DESCRIPTION:${esc(memo)}`] : []),
    // 종일 일정: 전날 저녁 8시, 당일 아침 8시 30분. 시간이 있는 일정: 하루 전과 1시간 전
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`내일: ${t.title}`)}`, time ? "TRIGGER:-P1D" : "TRIGGER:-PT4H", "END:VALARM",
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`오늘: ${t.title}`)}`, time ? "TRIGGER:-PT1H" : "TRIGGER:PT8H30M", "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].map(fold).join("\r\n") + "\r\n";
}

export function feedIcs(
  tasks: { id: string; title: string; due_date: string; due_time?: string | null; memo: string | null; kind: string; done?: boolean }[],
  options: { calName?: string; hospital?: string; dischargeDate?: string | null }
): string {
  const events: string[] = [];

  if (options.dischargeDate) {
    events.push(
      [
        "BEGIN:VEVENT",
        `UID:discharge-${ymd(options.dischargeDate)}@bravecare`,
        `DTSTAMP:${stamp()}`,
        `DTSTART;VALUE=DATE:${ymd(options.dischargeDate)}`,
        `DTEND;VALUE=DATE:${ymd(nextDay(options.dischargeDate))}`,
        `SUMMARY:${esc("[씩씩케어] 퇴원하는 날")}`,
        "DESCRIPTION:퇴원 수속 및 약 수령, 안전 귀가",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc("내일 퇴원하는 날입니다")}`, "TRIGGER:-PT4H", "END:VALARM",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc("오늘 퇴원하는 날입니다")}`, "TRIGGER:PT8H30M", "END:VALARM",
        "END:VEVENT",
      ].map(fold).join("\r\n")
    );
  }

  for (const t of tasks) {
    const time = t.due_time?.slice(0, 5);
    const memo = [options.hospital && `병원: ${options.hospital}`, t.memo, t.kind === "schedule" && !t.memo ? VISIT_HINT : ""].filter(Boolean).join("\n");
    events.push(
      [
        "BEGIN:VEVENT",
        `UID:${t.id}@bravecare`,
        `DTSTAMP:${stamp()}`,
        ...(time
          ? [`DTSTART:${utc(t.due_date, time)}`, "DURATION:PT1H"]
          : [`DTSTART;VALUE=DATE:${ymd(t.due_date)}`, `DTEND;VALUE=DATE:${ymd(nextDay(t.due_date))}`]),
        `SUMMARY:${esc(`[씩씩케어] ${t.title}${t.done ? " (완료)" : ""}`)}`,
        ...(memo ? [`DESCRIPTION:${esc(memo)}`] : []),
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`내일: ${t.title}`)}`, time ? "TRIGGER:-P1D" : "TRIGGER:-PT4H", "END:VALARM",
        "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(`오늘: ${t.title}`)}`, time ? "TRIGGER:-PT1H" : "TRIGGER:PT8H30M", "END:VALARM",
        "END:VEVENT",
      ].map(fold).join("\r\n")
    );
  }

  const calName = esc(options.calName || "씩씩케어 돌봄 일정");
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//BraveCare//KO",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${calName}`,
    "X-WR-TIMEZONE:Asia/Seoul",
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ].map(fold).join("\r\n");

  return [header, ...events, "END:VCALENDAR"].join("\r\n") + "\r\n";
}
