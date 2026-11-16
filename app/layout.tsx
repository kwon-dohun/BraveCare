import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://bravecare-kr.vercel.app"), // 카톡 미리보기 이미지가 절대 주소여야 뜬다
  title: "씩씩케어",
  description: "퇴원 전부터 정기 외래까지, 공공 지원과 서류, 가족 분담을 한곳에서 정리해요",
  openGraph: { siteName: "씩씩케어", type: "website", locale: "ko_KR" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f4faf7" }; // 모바일 브라우저 상단 막대도 바탕색과 같게

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
      <head>
        {/* 글자 크게 보기: 그리기 전에 적용해 깜빡이지 않게 */}
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.font=localStorage.getItem('bc:font')||''}catch(e){}" }} />
        {/* Pretendard: 쓰는 글자만 받아오는 동적 서브셋 */}
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
