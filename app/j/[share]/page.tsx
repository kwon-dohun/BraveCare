import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import JoinForm from "./JoinForm";

export const metadata = { title: "가족으로 참여하기 · 퇴원노트" };

export default async function Join(props: PageProps<"/j/[share]">) {
  const { share } = await props.params;
  const { data: c } = await db.from("cases").select("id").eq("share_token", share).maybeSingle();
  if (!c) notFound();
  const { data: admin } = await db.from("members").select("name").eq("case_id", c.id).eq("role", "admin").limit(1).single();
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <p className="text-sm font-medium text-accent">퇴원노트</p>
      <h1 className="mt-3 text-2xl font-bold">{admin?.name}님이 가족 퇴원 준비를 같이 하자고 초대했어요</h1>
      <p className="mt-3 text-muted">이름만 입력하면 내가 맡은 할 일을 보고 완료 체크할 수 있어요. 앱 설치는 필요 없어요.</p>
      <JoinForm share={share} />
    </main>
  );
}
