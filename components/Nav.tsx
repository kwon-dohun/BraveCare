"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["", "홈"],
  ["/benefits", "지원"],
  ["/tasks", "할 일"],
  ["/family", "가족"],
] as const;

export default function Nav({ base }: { base: string }) {
  const path = usePathname();
  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 border-t border-line bg-card">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map(([p, label]) => {
          const href = base + p;
          const active = p === "" ? path === base : path.startsWith(href);
          return (
            <li key={label}>
              <Link href={href} aria-current={active ? "page" : undefined} className={`flex items-center justify-center py-3 ${active ? "font-bold text-accent" : "text-muted"}`}>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
