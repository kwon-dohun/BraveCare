import Link from "next/link";
import { Logo } from "@/components/Mascot";

export const metadata = { title: "이용약관 · 씩씩케어" };

// 초안. 공개 전 검토가 필요하다. 핵심은 '의료 상담이 아니다', '지원 대상은 기관이 정한다', '링크가 열쇠다' 세 가지.
const SECTIONS: [string, string][] = [
  ["1. 서비스 내용", "씩씩케어는 퇴원을 앞둔 가족이 공공 지원 정보, 챙길 서류, 할 일과 일정, 가족 간 분담, 저녁 안부 기록을 한곳에서 정리하도록 돕는 서비스예요."],
  ["2. 의료 상담이 아니에요", "씩씩케어와 씩씩이는 진단, 처방, 약 복용 변경 같은 의료 판단을 하지 않아요. 몸 상태와 치료는 반드시 담당 의료진에게 확인해 주세요. 숨쉬기 힘들거나 가슴이 아프거나 의식이 흐린 경우처럼 급할 때는 바로 119에 연락하세요."],
  ["3. 지원 안내는 참고 정보예요", "지원 제도는 입력한 조건으로 '대상 가능성'을 보여주는 것이며, 최종 대상 여부와 금액은 각 운영 기관이 결정해요. 제도는 바뀔 수 있으니 신청 전에 운영 기관에 확인해 주세요."],
  ["4. 씩씩이 답변의 한계", "씩씩이는 보관한 서류 글자, 우리 집 씩씩케어 정보, 쉬운 용어 사전에 적힌 내용만 근거로 답해요. 근거를 찾지 못한 답은 참고만 하고, 정확한 내용은 병원이나 관할 기관에 확인해 주세요."],
  ["5. 주소(링크) 관리", "로그인 대신 개인 주소가 열쇠 역할을 해요. 주소를 아는 사람은 기록을 보고 고칠 수 있으니, 함께 돌보는 가족에게만 초대 링크로 공유해 주세요. 주소가 새어 나갔다면 초대 링크를 새로 만들어 주세요."],
  ["6. 이용자가 지킬 일", "다른 사람의 정보를 허락 없이 입력하지 말고, 서비스를 원래 목적과 다르게 쓰지 말아 주세요."],
  ["7. 서비스 변경과 중단", "더 나은 서비스를 위해 기능이 바뀌거나 중단될 수 있어요. 중요한 변경은 앱 안에서 미리 알려드릴게요."],
  ["8. 기록 삭제", "설정의 전체 삭제를 누르면 모든 기록이 즉시 지워지고 되돌릴 수 없어요."],
];

export default function Terms() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <Link href="/" className="inline-flex"><Logo /></Link>
      <h1 className="mt-6 font-display text-title">이용약관</h1>
      <p className="mt-1 text-sm text-muted">시행일 [작성 필요]</p>
      <div className="mt-6 space-y-6">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-semibold">{title}</h2>
            <p className="mt-1.5 text-callout leading-relaxed text-muted">{body}</p>
          </section>
        ))}
      </div>
      <Link href="/privacy" className="mt-8 inline-flex text-sm font-medium text-accent">개인정보처리방침 보기</Link>
    </main>
  );
}
