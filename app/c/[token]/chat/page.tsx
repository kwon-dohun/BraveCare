import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { chips } from "@/lib/chat";
import { DOC_TYPE_LABEL, type DocType } from "@/lib/extract";
import Icon from "@/components/Icon";
import ChatBox from "./ChatBox";

export const maxDuration = 60; // 씩씩이 답변도 AI 호출

export const metadata = { title: "씩씩이에게 물어보기 · 씩씩케어" };

export default async function Chat(props: PageProps<"/c/[token]/chat">) {
  const { token } = await props.params;
  const { actor, auth, base } = await adminPage(token);
  const q = (await props.searchParams).q;
  const { data } = await db.from("documents").select("id,doc_type,transcript").eq("case_id", actor.caseId).order("created_at", { ascending: false }).limit(5);
  const docs = (data ?? []) as { id: string; doc_type: DocType; transcript: string }[];

  return (
    <>
      <h1 className="font-display text-title">씩씩이에게 물어보기</h1>
      <p className="mt-1 text-sm text-muted">우리 집 일정·지원·서류에 적힌 내용으로 쉽게 풀어서 답해요.</p>

      <ChatBox auth={auth} chips={chips(docs.map((d) => d.doc_type))} docCount={docs.length} initial={typeof q === "string" ? q.slice(0, 300) : ""} />

      <Link href={`${base}/scan`} className="mt-4 flex items-center justify-between rounded-xl bg-card px-4 py-3 text-sm shadow-card">
        <span><b className="font-semibold">약봉투·안내문을 찍어 두면</b> 거기 적힌 내용까지 답해요</span><Icon name="right" size={16} className="text-muted" />
      </Link>
      {docs.length > 0 && (
        <details className="mt-3 rounded-xl bg-card shadow-card">
          <summary className="cursor-pointer px-4 text-sm font-semibold">보관한 서류 글자 보기 ({docs.length})</summary>
          <ul className="space-y-3 px-4 pb-4">
            {docs.map((d) => (
              <li key={d.id} className="rounded-lg bg-background p-3">
                <p className="text-xs font-semibold text-accent">{DOC_TYPE_LABEL[d.doc_type]}</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{d.transcript}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
