import Intro from "./Intro";

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  const notice = sp.deleted === "1" ? "deleted" : sp.left === "1" ? "left" : sp.kakao === "none" ? "kakao-none" : sp.kakao === "fail" ? "kakao-fail" : null;
  return <Intro notice={notice} kakao={!!process.env.KAKAO_REST_KEY} />;
}
