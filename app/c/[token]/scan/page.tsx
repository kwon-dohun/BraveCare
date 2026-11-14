import Link from "next/link";
import { adminPage } from "@/lib/page-auth";
import ScanFlow from "./ScanFlow";

export const metadata = { title: "안내문 촬영 · 퇴원노트" };

export default async function Scan(props: PageProps<"/c/[token]/scan">) {
  const { token } = await props.params;
  const { auth, base } = await adminPage(token);
  return (
    <>
      <Link href={`${base}/tasks`} className="flex items-center text-muted">‹ 타임라인</Link>
      <h1 className="mt-2 text-2xl font-bold">퇴원 안내문으로 할 일 만들기</h1>
      <p className="mb-5 mt-1 text-muted">안내문에 적힌 내용만 그대로 옮겨요. 요약하거나 설명을 덧붙이지 않아요.</p>
      <ScanFlow auth={auth} base={base} />
    </>
  );
}
