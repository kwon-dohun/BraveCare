import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      <p className="text-sm font-medium text-accent">퇴원노트</p>
      <h1 className="mt-3 text-[1.7rem] font-bold leading-snug">
        퇴원 소식을 들었다면,
        <br />
        3분이면 정리돼요
      </h1>
      <p className="mt-4 text-muted">
        앞으로 30일 동안 받을 수 있는 지원, 해야 할 일, 가족 분담을 한곳에서 정리해요. 특정 업체로 유도하지 않고 공공 지원부터 안내해요.
      </p>
      <Link
        href="/start"
        className="mt-8 flex items-center justify-center rounded-xl bg-accent px-5 py-4 text-lg font-bold text-white"
      >
        시작하기
      </Link>
      <p className="mt-6 text-sm text-muted">
        의료 상담이나 진단을 하지 않아요. 지원 대상 여부는 최종적으로 운영 기관에서 결정해요.
      </p>
    </main>
  );
}
