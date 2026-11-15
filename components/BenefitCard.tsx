import Link from "next/link";
import type { Result } from "@/lib/benefits";
import { STATUS_LABEL } from "@/lib/benefits";
import { dday } from "@/lib/format";

const BADGE = {
  high: ["대상 가능성 높음", "bg-accent-soft text-accent"],
  check: ["확인 필요", "bg-warn-soft text-warn"],
  no: ["해당 없음", "bg-line text-muted"],
} as const;

export function Badge({ verdict, needsIncome }: { verdict: Result["verdict"]; needsIncome?: boolean }) {
  const [label, cls] = BADGE[verdict];
  return <span className={`rounded-full px-2.5 py-0.5 text-sm font-medium ${cls}`}>{needsIncome ? "소득 확인 필요" : label}</span>;
}

export default function BenefitCard({ r, href, status }: { r: Result; href: string; status?: string }) {
  const d = r.deadline;
  return (
    <Link href={href} className="block rounded-xl border border-line bg-card p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge verdict={r.verdict} needsIncome={r.needsIncome} />
        {d.state === "open" && <span className="text-sm font-medium text-warn">{dday(d.daysLeft!)}</span>}
        {d.state === "closed" && <span className="text-sm text-muted">신청 기간 종료</span>}
        {status && status !== "none" && <span className="text-sm text-accent">· {STATUS_LABEL[status]}</span>}
      </div>
      <p className="mt-2 text-lg font-bold">{r.benefit.name}</p>
      <p className="text-sm text-muted">{r.benefit.operator}</p>
      <p className="mt-2">{r.benefit.summary}</p>
      <p className="mt-2 text-sm text-muted">판정 근거: {r.reason}</p>
      <p className="mt-1 text-xs text-muted">{r.benefit.lastVerified ? `정보 확인일 ${r.benefit.lastVerified}` : "공식 확인 전 초안"} · 출처 {r.benefit.source.label}</p>
    </Link>
  );
}
