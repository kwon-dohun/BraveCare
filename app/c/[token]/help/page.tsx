import Link from "next/link";
import Icon, { BackLink } from "@/components/Icon";
import { adminPage } from "@/lib/page-auth";

export const metadata = { title: "도움말 · 씩씩케어" };

const MAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

// 자주 묻는 질문. 답은 실제 동작(코드) 기준으로만 쓴다.
const FAQ: [string, string][] = [
  ["휴대폰을 바꾸면 기록은 어떻게 되나요?", "기록은 서버에 있어서 사라지지 않아요. 설정에서 ‘내 주소 복사’로 주소를 나에게 보내 두거나, 카카오 계정을 연결해 두면 새 휴대폰에서도 다시 들어올 수 있어요."],
  ["가족은 어떻게 초대하나요?", "전체 > 가족과 나누기 > 가족 초대하기에서 링크를 보내세요. 가족은 링크를 열고 이름만 입력하면 돼요. 링크는 7일 뒤 만료되고, 언제든 새로 만들 수 있어요."],
  ["초대받은 가족은 무엇을 할 수 있나요?", "처음 만든 사람과 똑같이 할 일·일정·지원·씩씩이를 쓸 수 있어요. 전체 삭제만 처음 만든 사람이 할 수 있어요."],
  ["알림은 언제 오나요?", "씩씩케어 앱에서는 매일 저녁 8시 안부 체크, 내가 맡았거나 담당자가 없는 할 일의 전날 저녁 8시와 당일 아침, 신청하지 않은 지원의 마감 3일 전과 당일에 알림이 와요. 가족이 일을 맡거나 끝내면 바로 알려줘요. 앱이 없으면 할 일의 ‘내 캘린더에 넣기’로 휴대폰 캘린더 알림을 쓸 수 있어요."],
  ["지원 대상이라고 나오면 무조건 받을 수 있나요?", "아니에요. 입력한 조건으로 가능성을 알려드리는 것이고, 최종 결정은 신청을 받는 기관이 해요. 지원마다 적힌 공식 출처와 확인일을 함께 봐 주세요."],
  ["서류 사진은 어디에 저장되나요?", "사진은 글자를 읽은 뒤 저장하지 않아요. 읽은 글자만 보관하고, 주민등록번호 뒷자리는 가려서 저장해요. 서류 찍어서 정리 화면에서 보관한 글자를 지울 수 있어요."],
  ["씩씩이가 아픈 증상에 답해 주나요?", "씩씩이는 진단이나 치료 방법을 말하지 않아요. 보관한 서류와 우리 집 일정·지원 정보, 쉬운 용어 사전에 있는 내용만 알려줘요. 증상이 걱정되면 병원에 전화하고, 급하면 119에 연락하세요."],
  ["글자가 작아요.", "설정 > 글자 크기에서 ‘크게’나 ‘아주 크게’를 골라 보세요."],
  ["기록을 모두 지우고 싶어요.", "처음 만든 가족이 설정 > 전체 삭제를 누르면 모든 기록이 서버에서 바로 지워지고 되돌릴 수 없어요. 참여한 가족은 설정에서 ‘가족에서 나가기’를 할 수 있어요."],
];

export default async function Help(props: PageProps<"/c/[token]/help">) {
  const { token } = await props.params;
  const { base } = await adminPage(token);
  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 font-display text-title">도움말</h1>
      <ul className="mt-5 divide-y divide-line rounded-xl bg-card shadow-card">
        {FAQ.map(([q, a]) => (
          <li key={q}>
            <details className="px-4">
              <summary className="cursor-pointer py-1 font-medium">{q}</summary>
              <p className="pb-4 text-callout leading-relaxed text-muted">{a}</p>
            </details>
          </li>
        ))}
      </ul>

      <section className="mt-6 space-y-2" aria-label="더 알아보기">
        <Link href={`${base}/glossary`} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-card"><span>어려운 말은 쉬운 용어 사전에서</span><Icon name="right" size={18} className="text-muted" /></Link>
        <Link href={`${base}/chat`} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-card"><span>씩씩이에게 물어보기</span><Icon name="right" size={18} className="text-muted" /></Link>
        {MAIL && (
          <a href={`mailto:${MAIL}?subject=${encodeURIComponent("씩씩케어 문의")}`} className="flex items-center justify-between rounded-xl bg-card px-4 py-3 shadow-card">
            <span>문의하기<span className="block text-xs text-muted">{MAIL}</span></span><Icon name="right" size={18} className="text-muted" />
          </a>
        )}
      </section>
      <p className="mt-4 text-sm text-muted">응급 상황은 씩씩케어가 아니라 119에 연락하세요.</p>
    </>
  );
}
