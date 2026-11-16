import Link from "next/link";
import { Logo } from "@/components/Mascot";

export const metadata = { title: "개인정보처리방침 · 씩씩케어" };

// 초안. 실제로 저장하는 항목(supabase/schema.sql)과 외부 전송(OpenAI·Vercel·Supabase)을 기준으로 썼다.
// 공개 전 개인정보보호위원회 '개인정보 처리방침 작성 지원' 도구로 대조하고, [ ] 표시한 곳을 채워야 한다.
const SECTIONS: [string, React.ReactNode][] = [
  ["1. 처리하는 개인정보", (
    <ul key="items" className="list-disc space-y-1 pl-5">
      <li>처음 시작할 때: 입원 이유 큰 분류(예: 정형외과 수술), 퇴원일, 환자 태어난 해, 퇴원 후 지낼 시·도와 시·군·구, 낮 시간 돌봄 형태, 가구 소득 구간, 가족에게 보일 이름</li>
      <li>쓰는 동안: 입원 병원 이름, 실손24 지원 여부, 받아 둔 보험 청구 서류 체크, 할 일과 메모, 지원 신청 상태, 참여한 가족의 이름</li>
      <li>저녁 안부 기록(건강 정보): 복약 여부, 약 불편함, 체온 구간, 수술 부위 이상 여부, 통증 점수, 배변 상태</li>
      <li>서류 촬영: 사진에서 옮겨 적은 글자만 저장해요. <b>사진 원본은 저장하지 않고</b>, 주민등록번호 뒷자리는 자동으로 가려서 저장해요.</li>
      <li>카카오 계정을 연결했을 때만: 카카오 회원번호(숫자). 이름·전화번호·이메일은 받지 않아요.</li>
      <li>앱에서 알림을 허용했을 때만: 알림을 보내는 데 쓰는 기기 알림 토큰</li>
      <li>씩씩이에게 한 질문: 답을 만드는 데만 쓰고 저장하지 않아요.</li>
      <li>이용 기록: 기능을 쓴 횟수 같은 통계용 기록. 이름·주소 같은 식별 정보는 넣지 않아요.</li>
    </ul>
  )],
  ["2. 처리 목적", "우리 가족 조건에 맞는 공공 지원 안내, 퇴원 일정과 할 일 정리, 가족 간 할 일 나누기, 외래 진료 때 보여줄 기록 정리, 씩씩이 답변 제공, 서비스 개선 통계."],
  ["3. 진단명·주민등록번호는 받지 않아요", "진단명이나 처방 내용은 묻지 않고 큰 분류만 받아요. 주민등록번호는 수집하지 않으며, 서류 글자에 섞여 들어와도 뒷자리를 가려서 저장해요."],
  ["4. 보관 기간과 파기", "마지막으로 이용한 날부터 1년이 지나면 모든 기록(가족 참여 기록 포함)을 자동으로 파기해요. 화면을 여는 것도 이용으로 보고, 가족 누구든 쓰면 1년이 새로 시작돼요. 그 전이라도 처음 만든 가족이 [전체 > 설정 > 전체 삭제]를 누르면 바로 되돌릴 수 없게 지워요."],
  ["5. 처리를 맡기는 곳과 국외 이전", (
    <ul key="vendors" className="list-disc space-y-1 pl-5">
      <li>Supabase: 데이터 저장 (서버 위치: 대한민국 서울, AWS ap-northeast-2)</li>
      <li>Vercel Inc.(미국): 서비스 화면 제공과 서버 실행</li>
      <li>OpenAI(미국): 서류 사진 글자 옮겨 적기, 씩씩이 답변 만들기. 사진과 질문, 답에 필요한 우리 집 정보가 전송되며, 처리가 끝나면 씩씩케어는 그 결과 글자만 보관해요.</li>
      <li>카카오(대한민국): 카카오 계정 연결을 고른 경우에만 로그인 확인</li>
      <li>Expo(미국, 650 Industries): 앱 알림 전달. 알림 토큰과 알림 문구(예: ‘○○님이 맡았어요: 할 일 제목’)가 전송돼요.</li>
    </ul>
  )],
  ["6. 이용자의 권리", "언제든 설정에서 퇴원 정보를 고칠 수 있고, 전체 삭제로 모든 기록을 지우고 동의를 철회할 수 있어요. 초대받은 가족을 내보내거나 가족이 스스로 나가면 그 가족의 참여 기록(카카오 회원번호·알림 토큰 포함)도 지워져요. 카카오 연결은 설정에서 언제든 끊을 수 있어요."],
  ["7. 안전성 확보 조치", "추측할 수 없는 긴 주소(링크)로 접근하고, 카카오 계정을 연결하면 카카오 로그인으로도 내 주소를 되찾을 수 있어요. 이 주소를 아는 사람은 기록을 볼 수 있으니 다른 사람과 공유하지 마세요. 초대 링크는 7일 뒤 만료되고 언제든 새로 만들 수 있어요. 데이터는 서버만 읽을 수 있게 막아 두었어요."],
  ["8. 개인정보 보호책임자", "씩씩케어 운영팀 (책임자: 권도훈) · dhkwon0901@seoultech.ac.kr"],
];

export default function Privacy() {
  return (
    <main className="mx-auto w-full max-w-md flex-1 px-5 py-8">
      <Link href="/" className="inline-flex"><Logo /></Link>
      <h1 className="mt-6 font-display text-title">개인정보처리방침</h1>
      <p className="mt-1 text-sm text-muted">시행일 2026년 11월 16일</p>
      <div className="mt-6 space-y-6">
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className="font-semibold">{title}</h2>
            <div className="mt-1.5 text-callout leading-relaxed text-muted">{body}</div>
          </section>
        ))}
      </div>
      <Link href="/terms" className="mt-8 inline-flex text-sm font-medium text-accent">이용약관 보기</Link>
    </main>
  );
}
