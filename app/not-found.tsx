import Link from "next/link";
import Mascot, { Logo } from "@/components/Mascot";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Logo />
      <div className="mt-8 flex justify-center rounded-3xl bg-accent-soft pt-6">
        <Mascot size={104} mood="rest" className="-mb-4" />
      </div>
      <h1 className="mt-7 text-title font-display">이 주소로는 열 수 없어요</h1>
      <p className="mt-2 text-callout text-muted">
        링크가 만료됐거나, 주소가 잘못됐거나, 씩씩케어가 삭제됐을 수 있어요. 가족에게 받은 링크라면 초대한 가족에게 새 링크를 요청해주세요.
      </p>
      <Link href="/" className="mt-6 flex items-center justify-center rounded-full bg-accent-soft px-5 py-3 font-semibold text-accent">첫 화면으로</Link>
    </main>
  );
}
