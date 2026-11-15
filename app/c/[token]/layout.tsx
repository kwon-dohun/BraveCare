import Nav from "@/components/Nav";

export const metadata = { robots: { index: false } }; // 주소가 곧 열쇠라 검색에 남기지 않는다

export default async function CaseLayout({ children, params }: LayoutProps<"/c/[token]">) {
  const { token } = await params;
  return (
    <>
      <main className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">{children}</main>
      <Nav base={`/c/${token}`} />
    </>
  );
}
