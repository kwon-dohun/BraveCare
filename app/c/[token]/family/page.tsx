import Link from "next/link";
import Segmented from "@/components/Segmented";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { Invite, RemoveMember } from "@/components/InviteButton";
import { addDays } from "@/lib/timeline";
import { dateLabel } from "@/lib/format";
import Avatar from "@/components/Avatar";
import PatientInvite from "@/components/PatientInvite";

export const metadata = { title: "가족 · 씩씩케어" };

const WEEKDAY = ["일", "월", "화", "수", "목", "금", "토"];

export default async function Family(props: PageProps<"/c/[token]/family">) {
  const { token } = await props.params;
  const tab = (await props.searchParams).tab === "schedule" ? "schedule" : "members";
  const { actor, data, auth, base } = await adminPage(token);
  const { members, tasks, today } = data;
  const mine = (id: string) => tasks.filter((t) => t.assignee_id === id);
  const expired = data.shareExpired;
  const nameOf = (id: string | null) => members.find((m) => m.id === id)?.name;

  // 돌봄 일정표: 오늘부터 14일. 별도 입력 없이 날짜 있는 할 일과 담당자로 만든다.
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i)).map((d) => ({ d, list: tasks.filter((t) => t.due_date === d && !t.done) }));

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">가족</h1>
      <div className="mt-4"><Segmented label="가족 보기" active={tab === "members" ? 0 : 1} items={[{ label: "구성원", href: `${base}/family` }, { label: "돌봄 일정표", href: `${base}/family?tab=schedule` }]} /></div>

      <div key={tab} className="view-in">
      {tab === "members" ? (
        <>
          <ul className="mt-5 divide-y divide-line rounded-xl bg-card shadow-card">
            {members.map((m) => {
              const all = mine(m.id);
              return (
                <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={m.name} />
                    <div className="min-w-0">
                      <p className="font-medium">{m.name}{m.id === actor.memberId && <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-accent">나</span>}</p>
                      <p className="text-xs text-muted tabular-nums">맡은 일 {all.length}개 · 완료 {all.filter((t) => t.done).length}개</p>
                    </div>
                  </div>
                  {m.role !== "admin" && m.id !== actor.memberId && <RemoveMember auth={auth} memberId={m.id} name={m.name} />}
                </li>
              );
            })}
          </ul>
          {members.length < 2 && <p className="mt-3 text-muted">아직 혼자예요. 가족을 초대하면 할 일을 나눠 맡길 수 있어요.</p>}
          <div className="mt-5"><Invite auth={auth} path={`/j/${data.shareToken}`} expiresAt={data.shareExpiresAt} expired={expired} /></div>
          <p className="mt-3 text-sm text-muted">초대받은 가족은 이름만 입력하고 참여해요. 참여한 가족은 모두 똑같이 할 일을 맡고, 체크하고, 퇴원 정보를 고칠 수 있어요.</p>
          {data.patientToken && (
            <div className="mt-5">
              <PatientInvite patientToken={data.patientToken} />
            </div>
          )}
        </>
      ) : (
        <>
          <p className="mt-4 text-sm text-muted">앞으로 2주 동안 누가 언제 무엇을 맡는지 보여줘요. 할 일에 날짜와 담당자를 정하면 여기에 나와요.</p>
          <ol className="mt-3 space-y-2">
            {days.map(({ d, list }) => (
              <li key={d} className={`rounded-xl px-4 py-3 ${list.length ? "bg-card shadow-card" : ""}`}>
                <p className={`text-sm font-semibold ${list.length ? "" : "text-muted"}`}>
                  {dateLabel(d, null, today)} ({WEEKDAY[new Date(d).getUTCDay()]}){d === data.input.dischargeDate ? " · 퇴원일" : ""}
                  {!list.length && <span className="font-normal"> · 일정 없음</span>}
                </p>
                {list.length > 0 && (
                  <ul className="mt-1 space-y-1">
                    {list.map((t) => (
                      <li key={t.id}>
                        <Link href={`${base}/tasks/${t.id}`} className="flex items-center justify-between gap-3">
                          <span className="text-callout">{t.title}</span>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${t.assignee_id ? "bg-accent-soft text-accent" : "bg-warn-soft text-warn"}`}>{nameOf(t.assignee_id) ?? "담당자 없음"}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </>
      )}
      </div>
    </>
  );
}
