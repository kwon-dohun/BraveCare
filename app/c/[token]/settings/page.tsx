import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { CaseForm, KeyLink, DeleteCase } from "./SettingsForms";

export const metadata = { title: "설정 · 퇴원노트" };

export default async function Settings(props: PageProps<"/c/[token]/settings">) {
  const { token } = await props.params;
  const { data, auth, base } = await adminPage(token);
  return (
    <>
      <Link href={base} className="flex items-center text-muted">‹ 홈</Link>
      <h1 className="mt-2 text-2xl font-bold">설정</h1>

      <section className="mt-6" aria-labelledby="s1">
        <h2 id="s1" className="font-bold">퇴원 정보</h2>
        <p className="text-sm text-muted">퇴원일을 바꾸면 퇴원일 기준 할 일 날짜와 지원 마감이 다시 계산돼요. 직접 날짜를 정한 할 일은 그대로 둬요.</p>
        <CaseForm auth={auth} input={data.input} today={data.today} />
      </section>

      <section className="mt-8" aria-labelledby="s2">
        <h2 id="s2" className="font-bold">내 퇴원노트 주소</h2>
        <p className="text-sm text-muted">로그인이 없어서 이 주소가 열쇠예요. 다른 기기에서 열려면 복사해 나에게 보내두세요. 이 주소는 관리자용이니 가족에게는 ‘가족 초대하기’ 링크를 보내세요.</p>
        <KeyLink path={base} />
      </section>

      <section className="mt-8" aria-labelledby="s3">
        <h2 id="s3" className="font-bold">알림</h2>
        <p className="text-sm text-muted">지금은 앱 안에서만 마감과 오늘 할 일을 보여줘요. 문자·푸시 알림은 준비 중이에요.</p>
      </section>

      <section className="mt-10 border-t border-line pt-6" aria-labelledby="s4">
        <h2 id="s4" className="font-bold">전체 삭제</h2>
        <p className="text-sm text-muted">퇴원 정보, 할 일, 가족 참여 기록이 모두 지워지고 가족의 링크도 더 이상 열리지 않아요.</p>
        <DeleteCase auth={auth} />
      </section>
    </>
  );
}
