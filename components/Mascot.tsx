// 씩씩이: 씩씩케어의 민트 젤리 캐릭터. 머리의 새싹은 회복, 반창고는 퇴원 직후를 뜻한다.
// mood: idle(기본) · cheer(축하·완료) · rest(빈 상태·쉬는 중)
export default function Mascot({ size = 64, mood = "idle", className = "" }: { size?: number; mood?: "idle" | "cheer" | "rest"; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={`shrink-0 ${className}`}>
      {/* 새싹 */}
      <path d="M32 19v-6" stroke="#2fb383" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M32 13c-1-4.5-5-6.5-9-5.5 1 4.2 4.8 6.4 9 5.5Z" fill="#2fb383" />
      <path d="M32 13c1.2-4 4.6-6 8.2-5.2-.8 3.8-4.3 6-8.2 5.2Z" fill="#7be6bd" />
      {/* 몸 */}
      <path d="M32 18c13.5 0 22 8.6 22 20.5C54 50.5 44.6 57 32 57s-22-6.5-22-18.5C10 26.6 18.5 18 32 18Z" fill="#62deae" />
      <path d="M32 18c13.5 0 22 8.6 22 20.5C54 50.5 44.6 57 32 57s-22-6.5-22-18.5C10 26.6 18.5 18 32 18Z" fill="none" stroke="#3fc795" strokeWidth="1.2" />
      <ellipse cx="21" cy="28" rx="5.5" ry="3" fill="#fff" opacity=".45" transform="rotate(-28 21 28)" />
      {/* 반창고 */}
      <g transform="rotate(-24 44 25)">
        <rect x="37" y="22" width="14" height="6" rx="3" fill="#fff" stroke="#bfeedc" strokeWidth="1" />
        <circle cx="42.5" cy="25" r=".7" fill="#bfeedc" /><circle cx="45.5" cy="25" r=".7" fill="#bfeedc" />
      </g>
      {/* 볼 */}
      <ellipse cx="19.5" cy="41.5" rx="3.6" ry="2.3" fill="#ffcdb8" />
      <ellipse cx="44.5" cy="41.5" rx="3.6" ry="2.3" fill="#ffcdb8" />
      {/* 눈 */}
      {mood === "rest" ? (
        <>
          <path d="M22.5 37.5q2.5 2 5 0" stroke="#0b3d2e" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M36.5 37.5q2.5 2 5 0" stroke="#0b3d2e" strokeWidth="2" strokeLinecap="round" fill="none" />
        </>
      ) : mood === "cheer" ? (
        <>
          <path d="M22.5 38.5q2.5-3 5 0" stroke="#0b3d2e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
          <path d="M36.5 38.5q2.5-3 5 0" stroke="#0b3d2e" strokeWidth="2.2" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="25" cy="37" r="2.6" fill="#0b3d2e" /><circle cx="25.9" cy="36.1" r=".8" fill="#fff" />
          <circle cx="39" cy="37" r="2.6" fill="#0b3d2e" /><circle cx="39.9" cy="36.1" r=".8" fill="#fff" />
        </>
      )}
      {/* 입 */}
      {mood === "cheer"
        ? <path d="M28.5 42.5q3.5 4.5 7 0Z" fill="#0b3d2e" />
        : <path d="M29 42.5q3 2.6 6 0" stroke="#0b3d2e" strokeWidth="2" strokeLinecap="round" fill="none" />}
    </svg>
  );
}

// 로고: 씩씩이 + 글자. 모든 화면 머리에 같은 모양으로 쓴다.
export function Logo() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[1.0625rem] font-bold tracking-tight text-ink">
      <Mascot size={28} />씩씩케어
    </span>
  );
}
