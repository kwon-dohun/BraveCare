import Link from "next/link";
import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { Invite, RemoveMember } from "@/components/InviteButton";
import Avatar from "@/components/Avatar";
import PatientInvite from "@/components/PatientInvite";

export const metadata = { title: "함께 챙기기 · 씩씩케어" };

export default async function Family(props: PageProps<"/c/[token]/family">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const { members, tasks } = data;
  const mine = (id: string) => tasks.filter((t) => t.assignee_id === id);
  const expired = data.shareExpired;

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">{data.isSelfCare ? "함께 챙기는 사람" : "가족"}</h1>

      <div className="view-in">
        <ul className="mt-5 divide-y divide-line rounded-xl bg-card shadow-card">
          {members.map((m) => {
            const all = mine(m.id);
            return (
              <li key={m.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <Link href={`${base}/tasks?view=list&w=${m.id}`} className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar name={m.name} />
                  <div className="min-w-0">
                    <p className="font-medium">{m.name}{m.id === actor.memberId && <span className="ml-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-accent">나</span>}</p>
                    <p className="text-xs text-muted tabular-nums">맡은 일 {all.length}개 · 완료 {all.filter((t) => t.done).length}개</p>
                  </div>
                </Link>
                {m.role !== "admin" && m.id !== actor.memberId && <RemoveMember auth={auth} memberId={m.id} name={m.name} />}
              </li>
            );
          })}
        </ul>
        {members.length < 2 && <p className="mt-3 text-muted">{data.isSelfCare ? "가까운 사람을 초대하면 병원 동행이나 서류 일을 나눠 맡길 수 있어요. 초대해도 화면은 지금처럼 내 기준으로 보여요." : "아직 혼자예요. 가족을 초대하면 할 일을 나눠 맡길 수 있어요."}</p>}
        <div className="mt-5"><Invite auth={auth} path={`/j/${data.shareToken}`} expiresAt={data.shareExpiresAt} expired={expired} label={data.isSelfCare ? "함께 챙길 사람 초대하기" : undefined} /></div>
        <p className="mt-3 text-sm text-muted">{data.isSelfCare ? "초대받은 사람은 이름만 입력하고 참여해요. 참여하면 할 일을 맡고 체크할 수 있어요. 휴대폰을 나란히 두고 QR 코드를 비춰도 돼요." : <>초대받은 가족은 이름만 입력하고 참여해요. 참여한 가족은 모두 똑같이 할 일을 맡고, 체크하고, 퇴원 정보를 고칠 수 있어요.</>}</p>
        {!data.isSelfCare && data.patientToken && (
          <div className="mt-5">
            <PatientInvite patientToken={data.patientToken} />
          </div>
        )}
      </div>
    </>
  );
}
