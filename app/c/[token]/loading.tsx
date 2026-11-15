import Mascot from "@/components/Mascot";

// 화면을 옮기는 동안: 씩씩이 + 홈과 같은 뼈대. 레이아웃이 튀지 않게 실제 카드 자리를 그대로 잡는다.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="불러오는 중">
      <div className="flex h-11 items-center justify-between">
        <span className="skeleton h-6 w-28 rounded-full" />
        <span className="skeleton h-6 w-20 rounded-full" />
      </div>
      <div className="mt-4 flex items-center justify-between rounded-3xl bg-accent-soft p-5">
        <div className="space-y-3">
          <span className="skeleton block h-12 w-32 rounded-xl" />
          <span className="skeleton block h-4 w-36 rounded-full" />
        </div>
        <Mascot size={72} mood="rest" className="mascot-bob" />
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => <span key={i} className="skeleton h-[5.25rem] rounded-xl" />)}
      </div>
      <span className="skeleton mt-4 block h-36 rounded-xl" />
      <p className="mt-4 text-center text-sm text-muted">씩씩이가 정리하는 중이에요</p>
    </div>
  );
}
