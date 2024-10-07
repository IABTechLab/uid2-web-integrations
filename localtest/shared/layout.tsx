type LayoutProps = Readonly<
  React.PropsWithChildren & { siteName: string; extraHeader?: React.ReactNode }
>;
export function Layout({ children, siteName, extraHeader }: LayoutProps) {
  return (
    <>
      <div className='header'>
        <h1>UID2 local dev setup: {siteName}</h1>
      </div>
      {extraHeader}
      <div className='content'>{children}</div>
    </>
  );
}
