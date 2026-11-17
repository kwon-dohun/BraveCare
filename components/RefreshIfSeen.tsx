"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// 새 소식 화면에서 '봤음'으로 바꾼 직후 뒤로 돌아오면, 브라우저가 기억해 둔 예전 홈(빨간 점이 있던 화면)이 그대로 나온다.
// 새 소식 화면이 남긴 표시가 있으면 한 번만 다시 불러와 점을 지운다. (표시가 없는 평소 방문은 추가 요청 없음)
export const NEWS_SEEN_KEY = "bc:news-seen";

export default function RefreshIfSeen() {
  const router = useRouter();
  useEffect(() => {
    try {
      if (sessionStorage.getItem(NEWS_SEEN_KEY)) {
        sessionStorage.removeItem(NEWS_SEEN_KEY);
        router.refresh();
      }
    } catch {}
  }, [router]);
  return null;
}
