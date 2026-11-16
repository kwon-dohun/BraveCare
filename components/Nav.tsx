"use client";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "./Icon";
import Mascot from "./Mascot";

// 하단 탭: 기본 5개(홈 → 지원 → 씩씩이 → 일정 → 전체). 셀프 케어 모드는 4개(홈 → 씩씩이 → 할 일 → 전체).
const SIDE: [string, string, IconName][] = [
  ["", "홈", "home"],
  ["/benefits", "지원", "gift"],
  ["/tasks", "일정", "calendar"],
  ["/more", "전체", "grid"],
];

const SELF_SIDE_LEFT: [string, string, IconName][] = [
  ["", "홈", "home"],
];
const SELF_SIDE_RIGHT: [string, string, IconName][] = [
  ["/tasks?view=list", "할 일", "check"],
  ["/more", "전체", "grid"],
];

// 뼈대 화면(loading.tsx)을 두지 않아 새 화면이 준비될 때까지 이전 화면이 그대로 보인다.
// 대신 누른 순간 그 탭에 색이 들어오고 화면 위에 얇은 진행 줄이 떠서 눌렸다는 걸 알 수 있다.
function Pending({ children, on }: { children: (lit: boolean) => React.ReactNode; on: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <>
      {children(on || pending)}
      {pending && <span aria-hidden className="nav-progress fixed inset-x-0 top-0 z-50 h-0.5 bg-primary" />}
    </>
  );
}

// '전체' 아래에 있는 화면들 ('지원'은 1depth 탭으로 승격)
const UNDER_MORE = /\/(more|family|daily|report|questions|docs|scan|settings|glossary|help|solo-guide)(\/|$)/;

export default function Nav({ base, isSelfCare = false }: { base: string; isSelfCare?: boolean }) {
  const path = usePathname();
  const isActive = (p: string) => {
    const cleanP = p.split("?")[0];
    if (cleanP === "") return path === base;
    if (cleanP === "/more") return UNDER_MORE.test(path);
    if (cleanP === "/tasks") return path.startsWith(base + "/tasks") || path.startsWith(base + "/calendar");
    return path.startsWith(base + cleanP);
  };
  const tab = ([p, label, icon]: [string, string, IconName]) => {
    const on = isActive(p);
    return (
      <li key={label}>
        <Link href={base + p} aria-current={on ? "page" : undefined} className="flex flex-col items-center justify-center gap-1 pb-2 pt-2.5 text-xs">
          <Pending on={on}>{(lit) => (
            <span className={`flex flex-col items-center gap-1 ${lit ? "font-semibold text-accent" : "text-muted"}`}><Icon name={icon} size={21} />{label}</span>
          )}</Pending>
        </Link>
      </li>
    );
  };
  const chatOn = path.startsWith(`${base}/chat`);

  return (
    <nav aria-label="주요 메뉴" className="fixed inset-x-0 bottom-0 border-t border-line bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md print:hidden">
      <ul className={`mx-auto grid max-w-md ${isSelfCare ? "grid-cols-4" : "grid-cols-5"}`}>
        {isSelfCare ? SELF_SIDE_LEFT.map(tab) : SIDE.slice(0, 2).map(tab)}
        <li className="flex justify-center">
          <Link href={`${base}/chat`} aria-current={chatOn ? "page" : undefined} className="-mt-5 text-xs">
            <Pending on={chatOn}>{(lit) => (
              <span className={`flex flex-col items-center gap-0.5 ${lit ? "font-semibold text-accent" : "text-muted"}`}>
                <span className={`flex h-14 w-14 items-center justify-center rounded-full bg-primary shadow-card ring-4 ring-background ${lit ? "" : "mascot-bob"}`}>
                  <Mascot size={44} mood={lit ? "cheer" : "idle"} />
                </span>
                씩씩이<span className="sr-only"> 물어보기</span>
              </span>
            )}</Pending>
          </Link>
        </li>
        {isSelfCare ? SELF_SIDE_RIGHT.map(tab) : SIDE.slice(2).map(tab)}
      </ul>
    </nav>
  );
}
