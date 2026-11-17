import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { db } from "@/lib/db";
import { identifyScannedPacketDocs } from "@/lib/packet";
import PacketForm from "./PacketForm";

export const metadata = { title: "보험 청구 서류 · 씩씩케어" };

// 이미 퇴원한 사람이 병원에서 서류를 받는 방법(온라인 → 전화 → 방문 순)
function AfterDischarge({ open }: { open: boolean }) {
  const body = (
    <ol className="space-y-2.5 text-sm leading-relaxed">
      <li><b className="font-semibold">1. 온라인</b> 병원 홈페이지나 앱의 &lsquo;증명서 발급&rsquo; 메뉴에서 받을 수 있는 병원이 많아요. 가장 빨라요.</li>
      <li><b className="font-semibold">2. 전화</b> 온라인이 안 되면 원무과에 전화해서 방문 발급이나 우편 발급이 되는지 물어보세요.</li>
      <li><b className="font-semibold">3. 방문</b> 환자 본인 신분증을 챙기세요. 가족이 대신 가면 필요한 서류를 전화로 먼저 확인하세요 (병원마다 달라요).</li>
    </ol>
  );
  return open ? (
    <section className="mt-5 rounded-xl bg-card p-4 shadow-card">
      <h2 className="mb-2 font-semibold">이미 퇴원했어도 받을 수 있어요</h2>
      {body}
    </section>
  ) : (
    <details className="mt-8 rounded-xl bg-card shadow-card">
      <summary className="cursor-pointer px-4 py-3 font-semibold">이미 퇴원했다면 이렇게 받아요</summary>
      <div className="px-4 pb-4">{body}</div>
    </details>
  );
}

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
      {post && <AfterDischarge open />}
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
      {!post && <AfterDischarge open={false} />}
    </>
  );
}
