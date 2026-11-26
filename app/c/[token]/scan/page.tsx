import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { DOC_TYPES, type DocFields, type DocType } from "@/lib/extract";
import ScanFlow from "./ScanFlow";

export const maxDuration = 60; // 사진 읽기는 AI 호출이라 10초를 넘길 수 있다. 서버 액션은 이 화면의 값을 따른다

export const metadata = { title: "내 서류함 · 씩씩케어" };

export default async function Scan(props: PageProps<"/c/[token]/scan">) {
  const { token } = await props.params;
  const { actor, auth, base } = await adminPage(token);
  const { data } = await db.from("documents").select("id,doc_type,transcript,fields,confirmed_at,created_at").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(20);
  const docs = (data ?? []).map((d) => ({
    id: d.id as string, type: (DOC_TYPES.includes(d.doc_type as DocType) ? d.doc_type : "other") as DocType, text: (d.transcript as string) ?? "",
    fields: (d.fields ?? null) as DocFields | null, confirmed: !!d.confirmed_at,
    date: new Date(d.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }),
  }));
  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">내 서류함</h1>
      <p className="mb-5 mt-1 text-muted">안내문·약봉투·영수증을 찍으면 글자만 읽어 넣어 둬요. 씩씩이가 이 내용으로 답해요.</p>
      <ScanFlow auth={auth} base={base} initialDocs={docs} />
    </>
  );
}
