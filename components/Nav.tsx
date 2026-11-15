"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";

const TABS: [string, string, IconName][] = [
  ["", "홈", "home"],
  ["/benefits", "지원", "gift"],
  ["/tasks", "할 일", "tasks"],
  ["/daily", "기록", "heart"],
  ["/family", "가족", "users"],
];

export default function Nav({ base }: { base: string }) {
  const path = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 border-t border-line bg-card pb-[env(safe-area-inset-bottom)] print:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {TABS.map(([p, label, icon]) => {
          const href = base + p;
          // 리포트와 챗봇은 '기록' 아래 화면이다
          const active = p === "" ? path === base : path.startsWith(href) || (p === "/daily" && /\/(report|chat)$/.test(path));
          return (
            <li key={label}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`flex flex-col items-center justify-center gap-0.5 pb-1.5 pt-2 text-sm ${active ? "font-bold text-accent" : "text-muted"}`}>
                <Icon name={icon} size={22} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
