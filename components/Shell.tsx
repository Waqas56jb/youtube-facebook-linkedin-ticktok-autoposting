import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Logo from './Logo';

export default function Shell({ title, children, panel = true }: { title: string, children: ReactNode, panel?: boolean }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="w-full md:ml-60 p-4 sm:p-6 lg:p-7">
        {/* Mobile top bar */}
        <div className="md:hidden sticky top-0 z-30 -mx-4 px-4 py-3 border-b border-border bg-[#0a0a0a] flex items-center justify-between">
          <Logo />
          <a href="#nav" className="rounded-md border border-border px-3 py-1 text-sm bg-panel">Menu</a>
        </div>

        <div className="mb-4 mt-2 md:mt-0 flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-semibold">{title}</h1>
          <div className="hidden md:block"><Logo /></div>
        </div>
        {panel ? (
          <section className="mt-3 sm:mt-4 rounded-xl border border-border bg-panel p-3 sm:p-4">
            {children}
          </section>
        ) : (
          <div className="mt-3 sm:mt-4">{children}</div>
        )}
      </main>
    </div>
  );
}


