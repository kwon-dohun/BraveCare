import { redirect } from "next/navigation";

// 예전 가족 전용 주소. 이제 모든 가족이 /c/<구성원 ID>에서 같은 화면을 쓴다.
export default async function MemberDaily(props: PageProps<"/m/[id]/daily">) {
  const { id } = await props.params;
  redirect(`/c/${id}/daily`);
}
