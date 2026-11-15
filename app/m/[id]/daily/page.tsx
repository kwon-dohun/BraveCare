import { BackLink } from "@/components/Icon";
import { memberPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import DailyForm from "@/components/DailyForm";

export const metadata = { title: "저녁 안부 체크 · 씩씩케어", robots: { index: false } }; // 주소가 곧 열쇠라 검색에 남기지 않는다

export default async function MemberDaily(props: PageProps<"/m/[id]/daily">) {
  const { id } = await props.params;
  const { actor, data, auth } = await memberPage(id);
  const today = (await loadDaily(actor.caseId)).find((c) => c.check_date === data.today) ?? null;
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 pb-16 pt-6">
      <BackLink href={`/m/${id}`}>내 할 일</BackLink>
      <h1 className="mt-2 text-2xl font-bold">저녁 안부 체크</h1>
      <p className="mt-1 text-muted">오늘 하루를 10초 만에 남겨요. 가족 모두가 같은 기록을 봐요.</p>
      <DailyForm key={today ? "saved" : "new"} auth={auth} today={today} />
    </main>
  );
}
