import Intro from "./Intro";

export default async function Home(props: PageProps<"/">) {
  const sp = await props.searchParams;
  return <Intro deleted={sp.deleted === "1"} />;
}
