"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Icon from "./Icon";

// 앱 안에서 거쳐 온 화면 주소를 기억해 '뒤로'가 실제로 온 곳으로 돌아가게 한다.
// 탭을 닫으면 사라지는 sessionStorage에만 둔다(주소 안의 열쇠가 다른 곳에 남지 않게).
const KEY = "bc:stack";
const read = (): string[] => {
  try { return JSON.parse(sessionStorage.getItem(KEY) ?? "[]"); } catch { return []; }
};

// 앱 안에서 거쳐 온 화면이 있는지(있으면 router.back()으로 돌아가도 앱 밖으로 나가지 않는다)
export const cameFromApp = () => read().length > 1;

export function BackStack() {
  const path = usePathname();
  const sp = useSearchParams();
  useEffect(() => {
    const url = path + (sp.size ? `?${sp}` : "");
    const s = read();
    if (s[s.length - 2] === url) s.pop(); // 뒤로 온 경우
    else if (s[s.length - 1] !== url) s.push(url);
    try { sessionStorage.setItem(KEY, JSON.stringify(s.slice(-30))); } catch {}
  }, [path, sp]);
  return null;
}

// 돌아갈 화면 이름. 위에서부터 먼저 맞는 것을 쓴다.
const NAMES: [RegExp, string][] = [
  [/\/benefits\/saved/, "찜한 지원"], [/\/benefits\/[^/?]+/, "지원 상세"], [/\/benefits/, "지원"],
  [/\/tasks\/[^/?]+/, "할 일"], [/\/tasks/, "일정"], [/\/daily/, "데일리 체크"], [/\/report/, "외래 리포트"],
  [/\/questions/, "물어볼 것"], [/\/chat/, "씩씩이"], [/\/more/, "전체"], [/\/settings/, "설정"], [/\/news/, "새 소식"],
  [/\/docs/, "보험 청구 서류"], [/\/scan/, "서류 정리"], [/\/family/, "가족"], [/\/help/, "도움말"], [/\/glossary/, "용어 사전"],
  [/^\/c\/[^/?]+$/, "홈"],
];

// 앱 안에서 온 화면이 있으면 그리로 돌아가고, 바로 열어서 온 곳이 없으면 href(기본 위치)로 간다.
export default function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  const [prev, setPrev] = useState<string | null>(null);
  useEffect(() => {
    // 레이아웃의 BackStack이 현재 주소를 넣은 뒤에 읽는다
    const id = setTimeout(() => { const s = read(); setPrev(s.length > 1 ? s[s.length - 2] : null); });
    return () => clearTimeout(id);
  }, []);
  const name = prev ? NAMES.find(([re]) => re.test(prev.split("?")[0]))?.[1] ?? "뒤로" : null;
  return (
    <Link
      href={prev ?? href}
      onClick={(e) => { if (prev) { e.preventDefault(); router.back(); } }}
      className="-ml-1 inline-flex items-center gap-0.5 pr-2 text-muted"
    >
      <Icon name="left" size={20} />{name ?? children}
    </Link>
  );
}
