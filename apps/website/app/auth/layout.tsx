import type { Metadata } from "next";

// Kept out of search results. Not blocked in robots.txt, or Google couldn't
// read this
export const metadata: Metadata = {
  robots: { index: false },
};

// Auth pages render bare: one narrow column in the middle of the screen,
// which keeps forms from stretching on wide screens
export default function AuthLayout({ children }: LayoutProps<"/auth">) {
  return (
    <main className="flex flex-1 items-center justify-center px-gutter py-12">
      <div className="w-full max-w-[360px]">{children}</div>
    </main>
  );
}
