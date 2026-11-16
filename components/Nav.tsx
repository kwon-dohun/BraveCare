"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import Mascot from "./Mascot";

// 하단 탭 5개: 홈 → 지원 → 씩씩이 → 일정·할 일 → 전체. 씩씩이는 가운데에 크게.
const SIDE: [string, string, IconName][] = [
  ["", "홈", "home"],
  ["/benefits", "지원", "gift"],
  ["/tasks", "일정·할 일", "tasks"],
  ["/more", "전체", "grid"],
];
// '전체' 아래에 있는 화면들 ('지원'은 1depth 탭으로 승격)
const UNDER_MORE = /\/(more|family|daily|report|questions|docs|scan|settings|glossary|help)(\/|$)/;

export default function Nav({ base }: { base: string }) {
  const path = usePathname();
  const isActive = (p: string) => {
    if (p === "") return path === base;
    if (p === "/more") return UNDER_MORE.test(path);
    if (p === "/tasks") return path.startsWith(base + "/tasks") || path.startsWith(base + "/calendar");
    return path.startsWith(base + p);
  };
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
