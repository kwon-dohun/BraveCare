import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 끈다: 모든 화면이 토큰별 실시간 DB 데이터라 캐시할 게 없다.
  allowedDevOrigins: ["10.0.2.2"], // Android 에뮬레이터의 앱 셸에서 개발 서버를 열 때
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
