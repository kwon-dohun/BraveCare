"use client";
import Mascot, { Logo } from "@/components/Mascot";

// 예상하지 못한 오류. 기록은 서버에 그대로 있으니 다시 시도하면 된다는 걸 먼저 말한다.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <Logo />
      <div className="mt-8 flex justify-center rounded-3xl bg-accent-soft pt-6">
        <Mascot size={104} mood="rest" className="-mb-4" />
      </div>
      <h1 className="mt-7 font-display text-title">잠깐 문제가 생겼어요</h1>
      <p className="mt-2 text-callout text-muted">입력한 기록은 그대로 남아 있어요. 다시 시도해도 안 되면 잠시 뒤에 열어주세요.</p>
      <button onClick={reset} className="mt-6 w-full rounded-full bg-primary px-5 py-3.5 font-semibold text-ink">다시 시도하기</button>
    </main>
  );
}
