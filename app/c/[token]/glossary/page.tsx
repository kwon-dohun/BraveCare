import Link from "next/link";
import { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";
import { GLOSSARY } from "@/lib/glossary";

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
      <ul className="mt-5 space-y-2">
        {GLOSSARY.map((t) => (
          <li key={t.word} className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{t.word}</p>
              {t.when && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-caption font-semibold text-accent">{t.when}</span>}
            </div>
            <p className="mt-1 text-callout text-muted">{t.plain}</p>
            <Link href={`${base}/chat?q=${encodeURIComponent(`${t.word}에 대해 더 알려줘`)}`} className="mt-1 inline-flex min-h-0 items-center py-1 text-sm font-medium text-accent">씩씩이에게 더 물어보기</Link>
          </li>
        ))}
      </ul>
    </>
  );
}
