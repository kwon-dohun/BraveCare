import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents는 끈다: 모든 화면이 토큰별 실시간 DB 데이터라 캐시할 게 없다.
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
