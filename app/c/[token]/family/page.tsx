import { adminPage } from "@/lib/page-auth";
import InviteButton from "@/components/InviteButton";

export const metadata = { title: "가족 · 퇴원노트" };

export default async function Family(props: PageProps<"/c/[token]/family">) {
  const { token } = await props.params;
  const { data } = await adminPage(token);
  const doneBy = (id: string) => data.tasks.filter((t) => t.assignee_id === id && t.done).length;
  const mine = (id: string) => data.tasks.filter((t) => t.assignee_id === id).length;

  return (
    <>
      <h1 className="text-2xl font-bold">가족</h1>
      <p className="mt-1 text-muted">링크를 받은 가족은 앱 설치 없이 이름만 입력하고 참여해요. 자기 담당 할 일을 보고 완료 체크할 수 있어요.</p>
      <ul className="mt-5 divide-y divide-line rounded-xl border border-line bg-card">
        {data.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3">
            <span className="font-medium">{m.name}{m.role === "admin" ? " (나)" : ""}</span>
            <span className="text-sm text-muted">담당 {mine(m.id)}개 · 완료 {doneBy(m.id)}개</span>
          </li>
        ))}
      </ul>
      <div className="mt-5"><InviteButton path={`/j/${data.shareToken}`} /></div>
    </>
  );
}
