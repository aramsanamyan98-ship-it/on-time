// Parallel-route layout: `modal` is filled by @modal/(.)new when the booking
// wizard is opened by in-app navigation (popup over the profile page); on a
// direct visit @modal/default.tsx renders nothing and `children` is the page.
export default function BookLayout({
  children,
  modal,
}: {
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
