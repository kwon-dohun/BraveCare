import BackLink from "@/components/BackLink";
import { adminPage } from "@/lib/page-auth";
import { loadDaily } from "@/lib/daily";
import { db } from "@/lib/db";
import { krDateYear } from "@/lib/format";
import { REASON_LABEL, LIVING_LABEL, INCOME_OPTIONS } from "@/lib/options";
import { PatientInfo, KeyLink, DeleteCase, FontSize, LeaveCase, UnlinkKakao } from "./SettingsForms";
import DailyCompleteToggle from "@/components/DailyCompleteToggle";

export const metadata = { title: "설정 · 씩씩케어" };

// 구역 순서: 화면 → 환자 정보 → 기록 → 알림 → 내 계정 → (맨 아래, 되돌릴 수 없는 일)
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
  const i = data.input;
  const label = <T extends string>(list: [T, string][], v: T) => list.find(([k]) => k === v)?.[1] ?? "";
  const summary: [string, string][] = [
    ["퇴원일", i.dischargeDate ? krDateYear(i.dischargeDate) : "아직 미정이에요"],
    ["환자", `${i.birthYear}년생 · ${[i.sido, i.sigungu].filter(Boolean).join(" ")}`],
    ["입원 이유", label(REASON_LABEL, i.reason)],
    ["낮 돌봄", label(LIVING_LABEL, i.living)],
    ["가구 소득", label(INCOME_OPTIONS, i.income)],
  ];
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
        <h2 id="s1" className="font-semibold">환자 정보</h2>
        <p className="text-sm text-muted">받을 수 있는 지원을 찾고 할 일 날짜를 계산하는 데 쓰여요. 퇴원일을 바꾸면 날짜가 다시 계산되고, 직접 정한 날짜는 그대로 둬요.</p>
        <PatientInfo auth={auth} input={data.input} selfCare={data.isSelfCare} summary={summary} />
      </section>

      <section className="mt-8" aria-labelledby="s1-daily">
        <h2 id="s1-daily" className="font-semibold">데일리 체크</h2>
        <p className="text-sm text-muted mb-2">더 이상 매일 기록이 필요 없을 때 마칠 수 있어요.</p>
        <DailyCompleteToggle auth={auth} completed={!!data.input.dailyCompleted} variant="setting" />
      </section>

      <section className="mt-8" aria-labelledby="s3">
        <h2 id="s3" className="font-semibold">알림</h2>
        <p className="text-sm text-muted">씩씩케어 앱에서는 매일 저녁 8시 안부 체크, 맡은 할 일의 전날 저녁과 당일, 지원 신청 마감 3일 전과 당일에 알림이 와요.{data.alone ? "" : " 가족이 일을 맡거나 끝내면 바로 알려줘요."} 알림을 끄려면 휴대폰 설정 &gt; 알림 &gt; 씩씩케어에서 종류별로 끌 수 있어요. 앱이 없으면 할 일의 ‘내 캘린더에 넣기’로 캘린더 알림을 쓸 수 있어요.</p>
      </section>

      {/* 주소와 카카오는 같은 목적(기기를 바꾸거나 주소를 잃어버렸을 때 다시 들어오기)이라 한 곳에 */}
      <section className="mt-8" aria-labelledby="s2">
        <h2 id="s2" className="font-semibold">내 계정</h2>
        <p className="text-sm text-muted">휴대폰을 바꾸거나 주소를 잃어버려도 다시 들어올 수 있게 해 두세요.</p>
        <div className="mt-2 divide-y divide-line rounded-xl bg-card shadow-card">
          <div className="p-4">
            <p className="font-medium">내 주소</p>
            <p className="mt-0.5 text-sm text-muted">이 주소가 내 열쇠예요. 복사해 나에게 보내 두세요. {data.alone ? "다른 사람에게는 보내지 마세요." : "가족에게는 ‘가족 초대하기’ 링크를 보내세요."}</p>
            <KeyLink path={base} />
          </div>
          {kakaoOn && (
            <div className="p-4">
              <p className="font-medium">카카오로 되찾기 <span className="text-sm font-normal text-muted">(선택)</span></p>
              <p className="mt-0.5 text-sm text-muted">연결해 두면 주소를 잃어버려도 첫 화면의 ‘카카오로 내 씩씩케어 찾기’로 다시 들어올 수 있어요. 카카오 회원번호만 저장하고 이름·전화번호·이메일은 받지 않아요.</p>
              {justLinked && <p role="status" className="mt-2 text-accent">카카오 계정을 연결했어요.</p>}
              {me?.kakao_id ? <UnlinkKakao auth={auth} /> : (
                <form method="post" action="/api/kakao/start">
                  <input type="hidden" name="link" value={token} />
                  <button className="mt-3 w-full rounded-full bg-[#fee500] px-5 py-3 font-semibold text-[#191919]">카카오 계정 연결하기</button>
                </form>
              )}
            </div>
          )}
        </div>
      </section>

      {actor.role === "admin" ? (
        <section className="mt-10 border-t border-line pt-6" aria-labelledby="s4">
          <h2 id="s4" className="font-semibold">전체 삭제</h2>
          <p className="text-sm text-muted">퇴원 정보, 할 일, 매일 기록, 내 서류함{data.alone ? "" : ", 가족 참여 기록"}이 서버에서 바로 지워지고 되돌릴 수 없어요.{data.alone ? "" : " 가족의 링크도 더 이상 열리지 않아요."}</p>
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
