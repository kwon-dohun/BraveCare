import Link from "next/link";
import type { Result } from "@/lib/benefits";
import { STATUS_LABEL } from "@/lib/benefits";
import { dday, dotDate } from "@/lib/format";
import type { Auth } from "@/lib/db";
import SaveButton from "./SaveButton";

const BADGE = {
  high: ["대상 가능성 높음", "bg-accent-soft text-accent"],
  check: ["확인 필요", "bg-warn-soft text-warn"],
  no: ["해당 없음", "bg-line text-muted"],
} as const;

export function Badge({ verdict, needsIncome }: { verdict: Result["verdict"]; needsIncome?: boolean }) {
  const [label, cls] = BADGE[verdict];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{needsIncome ? "소득 확인 필요" : label}</span>;
}

// auth를 주면 오른쪽 위에 찜 하트가 붙는다(링크 밖에 두어 누를 때 상세로 넘어가지 않게).
export default function BenefitCard({ r, href, status, auth, saved = false }: { r: Result; href: string; status?: string; auth?: Auth; saved?: boolean }) {
  const d = r.deadline;
  const card = (
    <Link href={href} className="block rounded-xl bg-card shadow-card p-4">
      <div className={`flex flex-wrap items-center gap-2 ${auth ? "pr-9" : ""}`}>
        <Badge verdict={r.verdict} needsIncome={r.needsIncome} />
        {d.state === "open" && <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">{dday(d.daysLeft!)}</span>}
        {d.state === "closed" && <span className="text-xs text-muted">신청 기간 종료</span>}
        {status && status !== "none" && <span className="text-xs font-medium text-accent">· {STATUS_LABEL[status]}</span>}
        <span className="ml-auto text-xs text-muted">{r.benefit.operator}</span>
      </div>
      <p className="mt-2.5 font-semibold tracking-tight">{r.benefit.name}</p>
      <p className="mt-1 text-sm text-muted">{r.benefit.summary}</p>
      <p className="mt-2.5 rounded-lg bg-background px-3 py-2 text-xs text-muted">판정 근거 · {r.reason}</p>
      <p className="mt-2 text-caption text-muted">{r.benefit.lastVerified ? `정보 확인일 ${dotDate(r.benefit.lastVerified)}` : "공식 확인 전 초안"} · 출처 {r.benefit.source.label}</p>
    </Link>
  );
  if (!auth) return card;
  return (
    <div className="relative">
      {card}
      <SaveButton auth={auth} item={`b:${r.benefit.id}`} saved={saved} className="absolute right-1 top-1" />
    </div>
  );
}
