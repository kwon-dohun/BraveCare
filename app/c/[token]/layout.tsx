import Nav from "@/components/Nav";
import Opened from "@/components/Opened";
import { Suspense } from "react";
import { BackStack } from "@/components/BackLink";
import { actorFromToken } from "@/lib/db";
import { loadCase } from "@/lib/load";

export const metadata = { robots: { index: false } }; // 주소가 곧 열쇠라 검색에 남기지 않는다

export default async function CaseLayout({ children, params }: LayoutProps<"/c/[token]">) {
  const { token } = await params;
  const actor = await actorFromToken(token);
  const data = actor ? await loadCase(actor.caseId) : null;
  const isSelfCare = !!data?.isSelfCare;

  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">{children}</main>
      <Nav base={`/c/${token}`} isSelfCare={isSelfCare} />
      <Suspense><BackStack /></Suspense>
      <Opened k={/^[0-9a-f-]{36}$/.test(token) ? "m" : "c"} v={token} />
    </>
  );
}
