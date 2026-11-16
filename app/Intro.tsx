"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Icon from "@/components/Icon";
import Mascot, { Logo } from "@/components/Mascot";

const CONSENTS = [
  "건강 관련 정보(입원 이유 큰 분류, 태어난 해, 소득 구간)를 지원 안내 목적으로 수집·이용하는 데 동의해요",
  "이 서비스는 의료 상담·진단을 하지 않고, 지원 대상 여부는 운영 기관이 최종 결정한다는 점을 확인했어요",
];

export default function Intro({ deleted }: { deleted: boolean }) {
  const router = useRouter();
  const [checked, setChecked] = useState<boolean[]>(CONSENTS.map(() => false));
  const [last, setLast] = useState<{ path: string; label: string } | null>(null);
  const all = checked.every(Boolean);

  useEffect(() => {
    try {
      if (deleted) localStorage.removeItem("toewon:last");
      const v = localStorage.getItem("toewon:last");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage는 클라이언트에서만 읽을 수 있다
      if (v) setLast(JSON.parse(v));
    } catch {}
  }, [deleted]);

  const start = () => {
    try { sessionStorage.setItem("toewon:consent", "1"); } catch {}
    router.push("/start");
  };

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
      {deleted && <p role="status" className="mb-6 rounded-xl bg-accent-soft p-4 text-accent">씩씩케어와 모든 기록을 삭제했어요.</p>}
      <Logo />
      <div className="relative mt-8 flex h-36 items-end justify-center overflow-hidden rounded-3xl bg-accent-soft">
        <span className="absolute left-5 top-5 rounded-2xl rounded-bl-sm bg-card px-3 py-1.5 text-xs font-medium text-ink shadow-card">퇴원 준비, 같이 해요!</span>
        <Mascot size={120} mood="cheer" className="mascot-bob -mb-5" />
      </div>
      <h1 className="mt-7 text-[1.875rem] font-display leading-tight">
        퇴원 소식을 들었다면,
        <br />
        <span className="text-accent">3분</span>이면 정리돼요
      </h1>
      <p className="mt-3 text-callout text-muted">
        퇴원 전부터 정기 외래까지, 받을 수 있는 공공 지원과 챙길 서류, 가족 분담을 한곳에서 정리해요. 특정 업체로 유도하지 않고 공공 지원부터 안내해요.
      </p>

      {last && (
        <Link href={last.path} className="mt-6 flex items-center justify-between rounded-xl bg-card shadow-card px-4 py-3 font-medium text-accent">
          <span>{last.label} 이어서 보기</span><Icon name="right" size={18} className="text-muted" />
        </Link>
      )}

      <fieldset className="mt-8 space-y-3">
        <legend className="mb-2 text-sm font-medium text-muted">시작하기 전에 확인해주세요</legend>
        {CONSENTS.map((c, i) => (
          <label key={c} className="flex items-start gap-3 rounded-xl bg-card shadow-card p-3">
            <input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={checked[i]} onChange={(e) => setChecked((s) => s.map((v, j) => (j === i ? e.target.checked : v)))} />
            <span className="text-sm">{c}</span>
          </label>
        ))}
      </fieldset>
      <p className="mt-2 text-sm text-muted">
        진단명·처방 내용은 묻지 않아요. 언제든 설정에서 전체 삭제할 수 있어요.{" "}
        <Link href="/privacy" className="font-medium text-accent underline">개인정보처리방침</Link> · <Link href="/terms" className="font-medium text-accent underline">이용약관</Link>
      </p>

      <button onClick={start} disabled={!all} className="mt-6 flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink disabled:opacity-40">
        {last ? "새 씩씩케어 만들기" : "시작하기"}
      </button>
    </main>
  );
}
