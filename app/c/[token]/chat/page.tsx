import Link from "next/link";
import { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { chips } from "@/lib/chat";
import { DOC_TYPE_LABEL, type DocType } from "@/lib/extract";
import ChatBox from "./ChatBox";

export const metadata = { title: "서류 내용 물어보기 · 씩씩케어" };

export default async function Chat(props: PageProps<"/c/[token]/chat">) {
  const { token } = await props.params;
  const { actor, auth, base } = await adminPage(token);
  const { data } = await db.from("documents").select("id,doc_type,transcript").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(5);
  const docs = (data ?? []) as { id: string; doc_type: DocType; transcript: string }[];

  return (
    <>
      <BackLink href={`${base}/daily`}>기록</BackLink>
      <h1 className="mt-2 text-2xl font-semibold">서류 내용 물어보기</h1>
      <p className="mt-1 text-muted">촬영해 둔 약봉투와 안내문에 적힌 내용만 찾아서 알려드려요. 진단이나 처방은 하지 않아요.</p>
      {docs.length === 0 ? (
        <div className="mt-5 rounded-xl bg-card shadow-card p-4">
          <p>아직 보관한 서류가 없어요. 약봉투나 퇴원 안내문을 먼저 촬영하면, 거기 적힌 내용을 물어볼 수 있어요.</p>
          <Link href={`${base}/scan`} className="mt-3 flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-ink">약봉투·안내문 촬영하기</Link>
        </div>
      ) : (
        <ChatBox auth={auth} chips={chips(docs.map((d) => d.doc_type))} docs={docs.map((d) => ({ id: d.id, label: DOC_TYPE_LABEL[d.doc_type], transcript: d.transcript }))} />
      )}
    </>
  );
}
