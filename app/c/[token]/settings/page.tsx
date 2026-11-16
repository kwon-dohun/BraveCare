import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { db } from "@/lib/db";
import { CaseForm, KeyLink, DeleteCase, FontSize, LeaveCase, UnlinkKakao } from "./SettingsForms";
import DailyCompleteToggle from "@/components/DailyCompleteToggle";

export const metadata = { title: "설정 · 씩씩케어" };

export default async function Settings(props: PageProps<"/c/[token]/settings">) {
  const { token } = await props.params;
  const { actor, data, auth, base } = await adminPage(token);
  const kakaoOn = !!process.env.KAKAO_REST_KEY;
  const [{ data: me }, dailyList, { count: docCount }] = await Promise.all([
    db.from("members").select("kakao_id").eq("id", actor.memberId).single(),
    loadDaily(actor.caseId),
    db.from("documents").select("id", { count: "exact", head: true }).eq("case_id", actor.caseId),
  ]);
  const stats = {
    doneTasks: data.tasks.filter((t) => t.done).length,
    dailyDays: dailyList.length,
    docCount: docCount ?? 0,
  };
  const justLinked = (await props.searchParams).kakao === "ok";
  return (
    <>
      <BackLink href={`${base}/more`}>전체</BackLink>
      <h1 className="mt-2 text-title font-display">설정</h1>

      <section className="mt-6" aria-labelledby="s0">
        <h2 id="s0" className="font-semibold">글자 크기</h2>
        <p className="text-sm text-muted">이 휴대폰에서만 바뀌어요.</p>
        <FontSize />
      </section>

      <section className="mt-8" aria-labelledby="s1">
        <h2 id="s1" className="font-semibold">퇴원 정보</h2>
        <p className="text-sm text-muted">퇴원일을 바꾸면 퇴원일 기준 할 일 날짜와 지원 마감이 다시 계산돼요. 직접 날짜를 정한 할 일은 그대로 둬요.</p>
        <CaseForm auth={auth} input={data.input} />
      </section>

      <section className="mt-8" aria-labelledby="s1-daily">
        <h2 id="s1-daily" className="font-semibold">데일리 체크 및 회복 상태</h2>
        <p className="text-sm text-muted mb-2">환자 상태가 안정되어 더 이상 매일 상태 기록이 필요 없을 때 종료할 수 있어요.</p>
        <DailyCompleteToggle auth={auth} completed={!!data.input.dailyCompleted} variant="setting" />
      </section>

      <section className="mt-8" aria-labelledby="s2">
        <h2 id="s2" className="font-semibold">내 씩씩케어 주소</h2>
        <p className="text-sm text-muted">이 주소가 내 열쇠예요. 다른 기기에서 열려면 복사해 나에게 보내두세요. 이 주소는 나만 쓰고, 가족에게는 ‘가족 초대하기’ 링크를 보내세요.</p>
        <KeyLink path={base} />
      </section>

      {kakaoOn && (
        <section className="mt-8" aria-labelledby="s2k">
          <h2 id="s2k" className="font-semibold">카카오로 되찾기</h2>
          <p className="text-sm text-muted">카카오 계정을 연결해 두면 휴대폰을 바꾸거나 주소를 잃어버려도 첫 화면의 ‘카카오로 내 씩씩케어 찾기’로 다시 들어올 수 있어요. 카카오 회원번호만 저장하고 이름·전화번호·이메일은 받지 않아요.</p>
          {justLinked && <p role="status" className="mt-2 text-accent">카카오 계정을 연결했어요.</p>}
          {me?.kakao_id ? <UnlinkKakao auth={auth} /> : (
            <form method="post" action="/api/kakao/start">
              <input type="hidden" name="link" value={token} />
              <button className="mt-3 w-full rounded-full bg-[#fee500] px-5 py-3 font-semibold text-[#191919]">카카오 계정 연결하기</button>
            </form>
          )}
        </section>
      )}

      <section className="mt-8" aria-labelledby="s3">
        <h2 id="s3" className="font-semibold">알림</h2>
        <p className="text-sm text-muted">씩씩케어 앱에서는 매일 저녁 8시 안부 체크, 맡은 할 일의 전날 저녁과 당일, 지원 신청 마감 3일 전과 당일에 알림이 와요. 가족이 일을 맡거나 끝내면 바로 알려줘요. 알림을 끄려면 휴대폰 설정 &gt; 알림 &gt; 씩씩케어에서 종류별로 끌 수 있어요. 앱이 없으면 할 일의 ‘내 캘린더에 넣기’로 캘린더 알림을 쓸 수 있어요.</p>
      </section>

      {actor.role === "admin" ? (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="s4">
          <h2 id="s4" className="font-semibold">전체 삭제</h2>
          <p className="text-sm text-muted">퇴원 정보, 할 일, 매일 기록, 보관한 서류 글자, 가족 참여 기록이 서버에서 바로 지워지고 되돌릴 수 없어요. 가족의 링크도 더 이상 열리지 않아요.</p>
          <DeleteCase auth={auth} stats={stats} />
        </section>
      ) : (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="s4">
          <h2 id="s4" className="font-semibold">가족에서 나가기</h2>
          <p className="text-sm text-muted">내 참여 기록만 지워지고, 내가 맡았던 할 일은 ‘담당자 없음’이 돼요. 가족의 기록은 그대로 남아요. 전체 삭제는 처음 만든 가족만 할 수 있어요.</p>
          <LeaveCase auth={auth} />
        </section>
      )}
    </>
  );
}
