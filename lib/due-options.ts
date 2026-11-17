// "할 일에 넣기" 때 고르는 신청 날짜 후보. 마감이 있으면 마감일을 넘지 않는 것만 보여 주고, 마감일도 후보에 넣는다.
const add = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const shortDate = (iso: string) => `${Number(iso.slice(5, 7))}월 ${Number(iso.slice(8, 10))}일(${"일월화수목금토"[new Date(`${iso}T00:00:00Z`).getUTCDay()]})`;

export interface DueOption { label: string; date: string }

export function dueOptions(today: string, end?: string): DueOption[] {
  const base: DueOption[] = [
    { label: "오늘", date: today },
    { label: "내일", date: add(today, 1) },
    { label: "3일 뒤", date: add(today, 3) },
    { label: "일주일 뒤", date: add(today, 7) },
  ];
  const within = base.filter((o) => !end || o.date <= end);
  if (end && end >= today && !within.some((o) => o.date === end)) within.push({ label: "마감일", date: end });
  return within;
}

// 미리 골라 둘 날짜: 3일 뒤. 마감이 그보다 가까우면 있는 것 중 가장 늦은 날.
export function recommendedDue(opts: DueOption[]): string {
  return (opts.find((o) => o.label === "3일 뒤") ?? opts[opts.length - 1]).date;
}
