import BackLink from "@/components/BackLink";
import Mascot from "@/components/Mascot";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { krDate } from "@/lib/format";
import MarkSeen from "./MarkSeen";

export const metadata = { title: "새 소식 · 씩씩케어" };

const seoulDay = (iso: string) => new Date(iso).toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const seoulTime = (iso: string) => new Date(iso).toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "numeric", minute: "2-digit" });

// 가족이 한 일을 날짜별로 모아 본다. 마지막으로 본 뒤에 생긴 다른 가족의 소식에는 점을 찍는다.
export default async function News(props: PageProps<"/c/[token]/news">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const [{ data: rows }, { data: me }] = await Promise.all([
    db.from("activity").select("id,text,created_at,member_id").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(50),
    db.from("members").select("seen_at").eq("id", actor.memberId).single(),
  ]);
  const list = rows ?? [];
  const isNew = (r: (typeof list)[number]) => !!me && r.created_at > me.seen_at && r.member_id !== actor.memberId;
  const days = [...new Set(list.map((r) => seoulDay(r.created_at)))];

  return (
    <>
      <MarkSeen auth={auth} />
      <BackLink href={base}>홈</BackLink>
      <h1 className="mt-2 font-display text-title">새 소식</h1>
      <p className="mt-1 text-sm text-muted">맡거나 끝낸 일, 바뀐 일정 같은 소식이 여기에 모여요. 앱을 쓰면 알림으로도 받아요.</p>
      {list.length === 0 && (
        <p className="mt-5 flex items-center gap-3 rounded-xl bg-card p-4 text-sm text-muted shadow-card"><Mascot size={40} mood="rest" />아직 소식이 없어요</p>
      )}
      {days.map((d) => (
        <section key={d} className="mt-5" aria-label={krDate(d)}>
          <h2 className="mb-2 text-sm font-semibold text-muted">{d === data.today ? "오늘" : krDate(d)}</h2>
          <ul className="divide-y divide-line rounded-xl bg-card shadow-card">
            {list.filter((r) => seoulDay(r.created_at) === d).map((r) => (
              <li key={r.id} className="flex items-start gap-2 px-4 py-3 text-sm">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isNew(r) ? "bg-[#e0517a]" : "bg-transparent"}`} aria-hidden />
                <span className="flex-1">{isNew(r) && <span className="sr-only">새 소식: </span>}{r.text}</span>
                <span className="shrink-0 text-xs text-muted tabular-nums">{seoulTime(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
