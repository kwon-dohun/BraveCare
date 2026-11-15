"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import Mascot from "./Mascot";

// 하단 탭 5개: 오늘 → 언제 → 물어보기 → 무엇을 → 나머지 전부. 씩씩이는 가운데에 크게.
const SIDE: [string, string, IconName][] = [
  ["", "홈", "home"],
  ["/calendar", "일정", "calendar"],
  ["/tasks", "할 일", "tasks"],
  ["/more", "전체", "grid"],
];
// '전체' 아래에 있는 화면들
const UNDER_MORE = /\/(more|benefits|family|daily|report|docs|scan|settings|glossary)(\/|$)/;

export default function Nav({ base }: { base: string }) {
  const path = usePathname();
  const isActive = (p: string) => (p === "" ? path === base : p === "/more" ? UNDER_MORE.test(path) : path.startsWith(base + p));
  const tab = ([p, label, icon]: (typeof SIDE)[number]) => {
    const on = isActive(p);
    return (
      <li key={label}>
        <Link href={base + p} aria-current={on ? "page" : undefined} className={`flex flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-xs ${on ? "font-semibold text-accent" : "text-muted"}`}>
          <Icon name={icon} size={21} />{label}
        </Link>
      </li>
    );
  };
  const chatOn = path.startsWith(`${base}/chat`);

  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {SIDE.slice(0, 2).map(tab)}
        <li className="flex justify-center">
          <Link href={`${base}/chat`} aria-current={chatOn ? "page" : undefined}
            className={`-mt-5 flex flex-col items-center gap-0.5 text-xs ${chatOn ? "font-semibold text-accent" : "text-muted"}`}>
            <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-card ring-4 ring-background ${chatOn ? "" : "mascot-bob"}`}>
              <Mascot size={44} mood={chatOn ? "cheer" : "idle"} />
            </span>
            씩씩이<span className="sr-only"> 물어보기</span>
          </Link>
        </li>
        {SIDE.slice(2).map(tab)}
      </ul>
    </nav>
  );
}
