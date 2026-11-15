import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <p className="font-extrabold text-accent">씩씩케어</p>
      <h1 className="mt-3 text-2xl font-bold">이 주소로는 열 수 없어요</h1>
      <p className="mt-3 text-muted">
        링크가 만료됐거나, 주소가 잘못됐거나, 씩씩케어가 삭제됐을 수 있어요. 가족에게 받은 링크라면 초대한 가족에게 새 링크를 요청해주세요.
      </p>
      <Link href="/" className="mt-8 flex items-center justify-center rounded-xl border border-accent px-5 py-3 font-bold text-accent">첫 화면으로</Link>
    </main>
  );
}
