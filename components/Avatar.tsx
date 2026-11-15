// 이름 첫 글자 동그라미. 색은 이름으로 정해져서 같은 사람은 늘 같은 색이다.
const TINTS = [
  ["#dff7ec", "#0b7a57"], // 민트
  ["#ffe9dc", "#9a3f12"], // 피치
  ["#e3f0ff", "#1f5aa6"], // 하늘
  ["#f1e9ff", "#5b3aa6"], // 라일락
  ["#fff4cc", "#7a5a00"], // 레몬
] as const;

const first = (name: string) => {
  // 이모지·결합 문자도 한 글자로 자른다
  const seg = typeof Intl !== "undefined" && "Segmenter" in Intl ? [...new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(name.trim())][0]?.segment : name.trim()[0];
  return (seg ?? "?").toUpperCase();
};

export default function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const h = [...name].reduce((n, c) => (n * 31 + c.codePointAt(0)!) >>> 0, 7);
  const [bg, fg] = TINTS[h % TINTS.length];
  return (
    <span aria-hidden className="flex shrink-0 items-center justify-center rounded-full font-semibold" style={{ width: size, height: size, background: bg, color: fg, fontSize: size * 0.42 }}>
      {first(name)}
    </span>
  );
}
