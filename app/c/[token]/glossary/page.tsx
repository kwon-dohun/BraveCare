import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { GLOSSARY } from "@/lib/glossary";
import GlossaryClient from "./GlossaryClient";

export const metadata = { title: "쉬운 용어 사전 · 씩씩케어" };

// 병원·보험에서 듣게 되는 말을 쉬운 말로. 궁금하면 바로 씩씩이에게 이어서 물어볼 수 있다.
export default async function Glossary(props: PageProps<"/c/[token]/glossary">) {
  const { token } = await props.params;
  const { base } = await adminPage(token);
  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 font-display text-title">쉬운 용어 사전</h1>
      <p className="mt-1 text-sm text-muted">병원과 보험에서 자주 듣는 말을 쉬운 말로 풀었어요.</p>
      <GlossaryClient base={base} initialTerms={GLOSSARY} />
    </>
  );
}
