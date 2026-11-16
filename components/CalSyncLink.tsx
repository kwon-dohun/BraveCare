"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";

export default function CalSyncLink({
  href,
  downloadName,
  label = "전체 일정 캘린더 파일 내려받기 (.ics)",
  className,
}: {
  href: string;
  downloadName?: string;
  label?: string;
  className?: string;
}) {
  const [isKakao, setIsKakao] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && /kakaotalk/i.test(navigator.userAgent)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 User-Agent 판별
      setIsKakao(true);
    }
  }, []);

  return (
    <div>
      <a
        href={href}
        download={downloadName}
        className={className ?? "mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-accent-soft px-4 py-2.5 text-xs font-semibold text-accent hover:opacity-90"}
      >
        <Icon name="calendar" size={16} />
        <span>{label}</span>
      </a>
      {isKakao && (
        <p className="mt-2 rounded-xl bg-[#fff4cc] p-2.5 text-xs text-[#7a5a00] leading-relaxed">
          카카오톡 안에서는 캘린더 저장이 제한될 수 있어요. 화면 오른쪽 아래 <b>[···]</b> 버튼을 누른 뒤 <b>[다른 브라우저로 열기]</b>를 누르면 폰 캘린더에 바로 등록돼요.
        </p>
      )}
    </div>
  );
}
