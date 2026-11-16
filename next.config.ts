import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 끈다: 모든 화면이 토큰별 실시간 DB 데이터라 캐시할 게 없다.
  allowedDevOrigins: ["10.0.2.2"], // Android 에뮬레이터의 앱 셸에서 개발 서버를 열 때
  async headers() {
    return [
      // 주소가 곧 열쇠라 검색 엔진에 남기지 않는다(화면 메타 태그에 더해 응답 헤더로도)
      { source: "/c/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      { source: "/j/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] },
      // 외부 사이트로 나갈 때 사이트 주소까지만 보낸다(경로의 열쇠는 안 감). no-referrer는 카카오 도메인 확인을 깰 수 있어 쓰지 않는다.
      { source: "/:path*", headers: [{ key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }] },
    ];
  },
  experimental: { serverActions: { bodySizeLimit: "4mb" } }, // 안내문 사진(리사이즈 후) 업로드용
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
