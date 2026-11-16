import { ImageResponse } from "next/og";
import Mascot from "@/components/Mascot";

// 카톡·문자로 링크를 보낼 때 뜨는 미리보기 이미지. 빌드할 때 한 번 만든다.
export const alt = "씩씩케어 — 퇴원 준비, 가족과 같이 해요";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// 한글이 깨지지 않게 로고와 같은 나눔스퀘어라운드 ExtraBold(OFL)를 받아 쓴다
const font = fetch("https://hangeul.pstatic.net/hangeul_static/webfont/NanumSquareRound/NanumSquareRoundEB.ttf").then((r) => r.arrayBuffer());

export default async function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#dff7ec", padding: "0 96px", fontFamily: "Ssik" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44, color: "#0b7a57" }}>씩씩케어</div>
          <div style={{ marginTop: 24, fontSize: 76, lineHeight: 1.2, color: "#0b3d2e", display: "flex", flexDirection: "column" }}>
            <span>퇴원 준비,</span>
            <span>가족과 같이 해요</span>
          </div>
          <div style={{ marginTop: 32, fontSize: 32, color: "#0b7a57" }}>받을 지원 · 할 일 나누기 · 일정 · 씩씩이에게 물어보기</div>
        </div>
        <Mascot size={340} mood="cheer" />
      </div>
    ),
    { ...size, fonts: [{ name: "Ssik", data: await font, style: "normal", weight: 800 }] },
  );
}
