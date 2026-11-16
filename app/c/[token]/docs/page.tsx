import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { identifyScannedPacketDocs } from "@/lib/packet";
import PacketForm from "./PacketForm";

export const metadata = { title: "보험 청구 서류 · 씩씩케어" };

export default async function Docs(props: PageProps<"/c/[token]/docs">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const { data: docRows } = await db.from("documents").select("doc_type,transcript").eq("case_id", actor.caseId);
  const scannedDocs = identifyScannedPacketDocs(docRows ?? []);

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">퇴원할 때 받아둘 서류</h1>
      <p className="mt-1 text-muted">퇴원 당일 원무과에서 한 번에 받아두면, 보험 청구 때문에 병원에 다시 갈 일이 줄어요.</p>
      <PacketForm auth={auth} hospital={data.hospital} silson24={data.silson24} checked={data.packet} scannedDocs={scannedDocs} />
      <section className="mt-8">
        <h2 className="font-semibold">이미 퇴원했다면</h2>
        <p className="mt-1 text-sm text-muted">병원 홈페이지나 앱의 &lsquo;증명서 발급&rsquo; 메뉴에서 온라인으로 받을 수 있는 병원이 많아요. 안 되면 원무과에 전화해 방문 발급이나 우편 발급이 되는지 물어보세요.</p>
      </section>
    </>
  );
}
