import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import Icon from "@/components/Icon";
import Mascot from "@/components/Mascot";

export const metadata = { title: "혼자 퇴원 안심 가이드 · 씩씩케어" };

export default async function SoloGuidePage(props: PageProps<"/c/[token]/solo-guide">) {
  const { token } = await props.params;
  const { base } = await adminPage(token);

  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <div className="mt-2 flex items-center gap-3">
        <Mascot size={40} mood="cheer" />
        <div>
          <h1 className="text-title font-display">혼자 퇴원 안심 가이드</h1>
          <p className="text-sm text-muted">혼자서도 불안하지 않게, 꼭 필요한 공공 도움처를 모았어요</p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {/* 1. 병원 안심동행 서비스 */}
        <section className="rounded-2xl bg-card p-5 shadow-card border border-line">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Icon name="users" size={18} />
            </span>
            <h2 className="font-semibold text-ink">병원 안심동행 서비스</h2>
          </div>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            집에서 병원 출발부터 수납·약국까지 전문 매니저가 함께 걸으며 동행해 드려요. 1인 가구이거나 보호자가 동행하기 어려울 때 누구나 이용할 수 있어요.
          </p>
          <div className="mt-3 rounded-xl bg-background p-3 text-xs space-y-1">
            <p className="font-semibold text-ink">• 서울시 병원안심동행: <a href="tel:1533-1179" className="text-accent underline font-bold">1533-1179</a> (시간당 5,000원)</p>
            <p className="text-muted">• 경기·인천 등 타 지역: 관할 시·군·구청이나 129에 문의</p>
          </div>
          <a
            href="tel:1533-1179"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-accent-soft py-2.5 text-xs font-semibold text-accent"
          >
            서울 안심동행 콜센터 전화 연결 (1533-1179)
          </a>
        </section>

        {/* 2. 긴급돌봄 및 일상회복지원 */}
        <section className="rounded-2xl bg-card p-5 shadow-card border border-line">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#ffe9dc] text-[#9a3f12]">
              <Icon name="gift" size={18} />
            </span>
            <h2 className="font-semibold text-ink">긴급돌봄 및 가사 지원</h2>
          </div>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            퇴원 후 혼자 식사 준비나 집안 청소, 세탁이 어려우실 때 동주민센터 돌봄SOS나 긴급돌봄 서비스를 신청하시면 요양보호사·가사간병 매니저가 집으로 방문해요.
          </p>
          <div className="mt-3 rounded-xl bg-background p-3 text-xs space-y-1">
            <p className="font-semibold text-ink">• 보건복지상담센터: <a href="tel:129" className="text-accent underline font-bold">국번없이 129</a></p>
            <p className="text-muted">• 거주지 동주민센터(행정복지센터) 복지상담팀</p>
          </div>
        </section>

        {/* 3. 위급 상황 119 직통 */}
        <section className="rounded-2xl bg-[#fee2e2] p-5 shadow-card border border-[#fecaca]">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-card text-[#b91c1c]">
              🚨
            </span>
            <h2 className="font-bold text-[#b91c1c]">야간·휴일 갑자기 아플 때</h2>
          </div>
          <p className="mt-2 text-sm text-[#7f1d1d] leading-relaxed">
            숨이 차거나, 참기 힘든 흉통·복통, 고열(38도 이상)이 날 때는 혼자 참지 마시고 즉시 119를 누르세요. 119 구급상황관리센터에서 의료 상담과 당직 병원 안내도 무료로 해드려요.
          </p>
          <a
            href="tel:119"
            className="mt-3 flex w-full items-center justify-center rounded-xl bg-[#dc2626] py-3 text-sm font-bold text-white shadow-sm hover:bg-[#b91c1c]"
          >
            119 응급 전화 걸기
          </a>
        </section>

        {/* 4. 혼자 챙기는 꿀팁 */}
        <section className="rounded-2xl bg-card p-5 shadow-card border border-line">
          <h2 className="font-semibold text-ink">혼자 회복할 때 꼭 기억할 3가지</h2>
          <ul className="mt-3 space-y-2 text-xs text-muted leading-relaxed">
            <li className="flex items-start gap-2">
              <span className="font-bold text-accent">1.</span>
              <span><strong>퇴원 당일 서류 4종</strong>: 나중에 다시 오기 힘드니 수납 창구에서 진료비 영수증·세부내역서·입퇴원확인서(질병코드 포함)를 한 번에 받으세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-accent">2.</span>
              <span><strong>약 복용 알람 맞추기</strong>: 하루 세 번 정해진 시간에 드시는 것이 회복의 핵심이에요. 스마트폰에 복약 알람을 켜두세요.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-bold text-accent">3.</span>
              <span><strong>외래 진료 전 리포트 확인</strong>: 진료실에서 그동안의 안부 기록(외래 리포트)을 의사 선생님께 그대로 보여주시면 짧은 진료 시간에도 상태를 정확히 전달할 수 있어요.</span>
            </li>
          </ul>
        </section>
      </div>
    </>
  );
}
