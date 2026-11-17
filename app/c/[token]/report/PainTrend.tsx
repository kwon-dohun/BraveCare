const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`;

// 통증 0~10점을 일자별로 찍은 추세선. 색은 글자색(currentColor)을 따라서 민트 화면과 흑백 화면에서 같이 쓴다.
export default function PainTrend({ points }: { points: { date: string; pain: number }[] }) {
  const W = 320, H = 140, L = 28, B = 22, n = points.length;
  const x = (i: number) => L + (n === 1 ? (W - L - 8) / 2 : (i * (W - L - 8)) / (n - 1));
  const y = (p: number) => 14 + ((10 - p) * (H - B - 14)) / 10;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`통증 추이 0~10점: ${points.map((p) => `${md(p.date)} ${p.pain}점`).join(", ")}`} className="mx-auto h-auto w-full max-w-md">
      {[0, 5, 10].map((v) => (
        <g key={v}>
          <line x1={L} x2={W - 4} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" strokeDasharray={v ? "3 3" : undefined} />
          <text x={L - 6} y={y(v) + 4} textAnchor="end" fontSize="10" fill="currentColor">{v}</text>
        </g>
      ))}
      {n > 1 && <polyline fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points.map((p, i) => `${x(i)},${y(p.pain)}`).join(" ")} />}
      {points.map((p, i) => (
        <g key={p.date}>
          <circle cx={x(i)} cy={y(p.pain)} r="3.5" fill="currentColor" />
          {n <= 14 && <text x={x(i)} y={y(p.pain) - 7} textAnchor="middle" fontSize="10" fontWeight="600" fill="currentColor">{p.pain}</text>}
        </g>
      ))}
      <text x={L} y={H - 4} fontSize="10" fill="currentColor">{md(points[0].date)}</text>
      {n > 1 && <text x={W - 4} y={H - 4} fontSize="10" textAnchor="end" fill="currentColor">{md(points.at(-1)!.date)}</text>}
    </svg>
  );
}
