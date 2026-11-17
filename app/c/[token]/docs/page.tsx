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
  const post = !!data.input.dischargeDate && data.input.dischargeDate < data.today; // 퇴원일이 지났으면 퇴원 후

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">{post ? "병원에서 받을 서류" : "퇴원할 때 받아둘 서류"}</h1>
      <p className="mt-1 text-muted">
        {post
          ? "이미 퇴원했어도 괜찮아요. 보험 청구에 필요한 서류는 병원에서 나중에도 발급받을 수 있어요."
          : "퇴원 당일 원무과에서 한 번에 받아두면, 보험 청구 때문에 병원에 다시 갈 일이 줄어요."}
      </p>
      <PacketForm
        auth={auth}
        hospital={data.hospital}
        silson24={data.silson24}
        checked={data.packet}
        scannedDocs={scannedDocs}
        customDocs={data.input.customDocs ?? []}
        patientReason={data.input.reason}
        post={post}
      />
    </>
  );
}
