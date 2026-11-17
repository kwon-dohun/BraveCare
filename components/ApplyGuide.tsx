import CopyText from "./CopyText";

// 지원 상세와 지원 신청 할 일이 함께 쓰는 "어떻게 신청하나" 묶음: 신청처 글, 전화 버튼, 말할 문장, 공식 안내
export default function ApplyGuide({ place, phone, script, sourceUrl, sourceLabel }: {
  place: string; phone?: string; script: string | null; sourceUrl: string; sourceLabel: string;
}) {
  return (
    <>
      <p className="mt-1">{place}</p>
      {phone && (
        <a href={`tel:${phone.replaceAll("-", "")}`} className="mt-3 flex items-center justify-center rounded-xl bg-primary px-5 py-3.5 font-semibold text-ink">
          {phone} 전화 걸기
        </a>
      )}
      {script && (
        <div className="mt-3 rounded-xl bg-accent-soft p-3">
          <p className="text-xs font-semibold text-accent">전화나 방문할 때 이렇게 말해 보세요</p>
          <p className="mt-1 text-sm leading-relaxed text-ink">“{script}”</p>
          <CopyText text={script} />
        </div>
      )}
      <a href={sourceUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center rounded-xl bg-card px-5 py-3 shadow-card">공식 안내 보기</a>
      <p className="mt-1 text-center text-xs text-muted">출처 · {sourceLabel}</p>
    </>
  );
}
