import { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { DOC_TYPE_LABEL, type DocType } from "@/lib/extract";
import ScanFlow from "./ScanFlow";
import Kept from "./Kept";

export const metadata = { title: "서류 촬영 · 씩씩케어" };

export default async function Scan(props: PageProps<"/c/[token]/scan">) {
  const { token } = await props.params;
  const { actor, auth, base } = await adminPage(token);
  const { data } = await db.from("documents").select("id,doc_type,transcript,created_at").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(20);
  const docs = (data ?? []).map((d) => ({
    id: d.id as string, label: DOC_TYPE_LABEL[d.doc_type as DocType], preview: (d.transcript as string).slice(0, 60),
    date: new Date(d.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }),
  }));
  return (
    <>
      <BackLink href={base}>홈</BackLink>
      <h1 className="mt-2 text-title font-display">서류로 할 일 만들기</h1>
      <p className="mb-5 mt-1 text-muted">서류에 적힌 내용만 그대로 옮겨요. 요약하거나 설명을 덧붙이지 않아요.</p>
      <ScanFlow auth={auth} base={base} />
      {docs.length > 0 && (
        <section className="mt-8" aria-labelledby="kp">
          <h2 id="kp" className="font-semibold">보관한 서류 글자 ({docs.length})</h2>
          <p className="text-sm text-muted">&lsquo;서류 내용 물어보기&rsquo;가 이 글자만 근거로 답해요. 지우면 바로 사라져요.</p>
          <Kept auth={auth} docs={docs} />
        </section>
      )}
    </>
  );
}
