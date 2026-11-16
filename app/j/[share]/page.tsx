import { cache } from "react";
import type { ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import JoinForm from "./JoinForm";
import { Logo } from "@/components/Mascot";

// 미리보기와 화면이 같은 조회를 쓴다
const lookup = cache(async (share: string) => {
  const { data: c } = await db.from("cases").select("id,share_expires_at").eq("share_token", share).maybeSingle();
  if (!c) return null;
  const { data: admin } = await db.from("members").select("name").eq("case_id", c.id).eq("role", "admin").limit(1).single();
  return { c, admin };
});

// 카톡으로 초대 링크를 보냈을 때 뜨는 제목. 주소가 곧 열쇠라 검색에는 남기지 않는다.
export async function generateMetadata(props: PageProps<"/j/[share]">, parent: ResolvingMetadata) {
  const found = await lookup((await props.params).share);
  const title = found?.admin?.name ? `${found.admin.name}님이 씩씩케어로 초대했어요` : "씩씩케어 가족 초대";
  return { title, robots: { index: false }, openGraph: { ...(await parent).openGraph, title, description: "링크를 열고 이름만 입력하면 퇴원 준비를 가족과 같이 나눠서 할 수 있어요." } };
}

export default async function Join(props: PageProps<"/j/[share]">) {
  const { share } = await props.params;
  const found = await lookup(share);
  if (!found) notFound();
  const { c, admin } = found;
  const expired = new Date(c.share_expires_at) < new Date();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Logo />
      {expired ? (
        <>
          <h1 className="mt-6 text-[1.75rem] font-display leading-tight">초대 링크가 만료됐어요</h1>
          <p className="mt-3 text-muted">{admin?.name}님에게 새 초대 링크를 보내달라고 부탁해주세요. 이미 참여했다면 처음 참여했을 때 열린 ‘내 할 일’ 주소로 들어가면 돼요.</p>
        </>
      ) : (
        <>
          <h1 className="mt-6 text-[1.75rem] font-display leading-tight">{admin?.name}님이 가족 퇴원 준비를 같이 하자고 초대했어요</h1>
          <p className="mt-3 text-muted">이름만 입력하면 바로 같이 쓸 수 있어요. 할 일 나누기, 일정, 지원, 씩씩이 물어보기까지 모두 똑같이 쓸 수 있어요.</p>
          <JoinForm share={share} />
        </>
      )}
    </main>
  );
}
