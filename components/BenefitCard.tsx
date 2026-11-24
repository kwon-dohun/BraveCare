import Link from "next/link";
import type { Result } from "@/lib/benefits";
import { STATUS_LABEL } from "@/lib/benefits";
import { dday } from "@/lib/format";
import type { Auth } from "@/lib/db";
import SaveButton from "./SaveButton";

const BADGE = {
  high: ["대상 가능성 높음", "bg-accent-soft text-accent"],
  check: ["확인 필요", "bg-warn-soft text-warn"],
  no: ["해당 없음", "bg-line text-muted"],
} as const;

// 확인 필요가 된 이유를 뱃지에 그대로 드러낸다: 소득이 먼저, 그다음 접수 위험·오래된 정보·초안
const DEMOTED_LABEL = { closeRisk: "접수 확인 필요", stale: "최신 정보 확인 필요", draft: "초안 · 확인 필요" } as const;

export function Badge({ verdict, needsIncome, demoted }: { verdict: Result["verdict"]; needsIncome?: boolean; demoted?: Result["demoted"] }) {
  const [label, cls] = BADGE[verdict];
  const text = needsIncome ? "소득 확인 필요" : verdict === "check" && demoted ? DEMOTED_LABEL[demoted] : label;
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{text}</span>;
}

// auth를 주면 오른쪽 위에 찜 하트가 붙는다(링크 밖에 두어 누를 때 상세로 넘어가지 않게).
export default function BenefitCard({ r, href, status, auth, saved = false }: { r: Result; href: string; status?: string; auth?: Auth; saved?: boolean }) {
  const d = r.deadline;
  const card = (
    <Link href={href} className="block rounded-xl bg-card shadow-card p-5">
      <div className={`flex flex-wrap items-center gap-2 ${auth ? "pr-9" : ""}`}>
        <Badge verdict={r.verdict} needsIncome={r.needsIncome} demoted={r.demoted} />
        {d.state === "open" && (d.daysLeft! <= 30
          ? <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-semibold text-warn">{dday(d.daysLeft!)}</span>
          : <span className="text-xs text-muted">{dday(d.daysLeft!)}</span>)}
        {/* 기한이 없는 제도만 상시. 기한은 있는데 퇴원일이 없어 계산을 못 하는 경우는 아무것도 안 보여 준다 */}
        {!r.benefit.deadline && <span className="text-xs text-muted">상시 신청</span>}
        {d.state === "closed" && <span className="text-xs text-muted">신청 기간 종료</span>}
        {status && status !== "none" && <span className="text-xs font-medium text-accent">· {STATUS_LABEL[status]}</span>}
      </div>
      <p className="mt-2.5 font-semibold tracking-tight">{r.benefit.name}</p>
      <p className="mt-1 text-sm text-muted">{r.benefit.summary}</p>
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
