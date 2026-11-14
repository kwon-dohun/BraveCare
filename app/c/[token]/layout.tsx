import Nav from "@/components/Nav";

export default async function CaseLayout({ children, params }: LayoutProps<"/c/[token]">) {
  const { token } = await params;
  return (
    <>
      <div className="mx-auto w-full max-w-md flex-1 px-5 pb-28 pt-6">{children}</div>
      <Nav base={`/c/${token}`} />
    </>
  );
}
