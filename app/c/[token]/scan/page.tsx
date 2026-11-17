import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { DOC_TYPE_LABEL, type DocType, type SummaryLine } from "@/lib/extract";
import ScanFlow from "./ScanFlow";

export const maxDuration = 60; // 사진 읽기는 AI 호출이라 10초를 넘길 수 있다. 서버 액션은 이 화면의 값을 따른다

export const metadata = { title: "서류 정리 · 씩씩케어" };

export default async function Scan(props: PageProps<"/c/[token]/scan">) {
  const { token } = await props.params;
  const { actor, auth, base } = await adminPage(token);
  const { data } = await db.from("documents").select("id,doc_type,transcript,summary,created_at").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(20);
  const docs = (data ?? []).map((d) => ({
    id: d.id as string, label: DOC_TYPE_LABEL[d.doc_type as DocType] ?? "기타 서류", text: (d.transcript as string) ?? "", summary: (d.summary ?? null) as SummaryLine[] | null,
    date: new Date(d.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" }),
  }));
  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">서류 찍어서 정리</h1>
      <p className="mb-5 mt-1 text-muted">진단서, 퇴원 안내문, 약봉투, 영수증을 찍으면 글자를 읽어 내 서류함에 넣어 둬요. 나중에 꺼내 보거나 씩씩이에게 물어보면 이 내용으로 답해요.</p>
      <ScanFlow auth={auth} base={base} initialDocs={docs} />
    </>
  );
}
