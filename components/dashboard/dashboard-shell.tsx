'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Mobile-friendly dashboard chrome. On md+ the sidebar is a fixed rail; on small
 * screens it collapses behind a hamburger and slides in as an overlay drawer
 * that auto-closes on navigation. The server layout passes the sidebar content
 * (logo, nav, footer) as `sidebar`.
 */
export function DashboardShell({
  sidebar,
  children,
}: {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  return (
    <div className="flex min-h-screen">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b bg-background px-4 md:hidden">
        <button
          type="button"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="-ml-2 inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-base font-bold">Creator CRM</p>
      </header>

      {/* Backdrop (mobile only) */}
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      ) : null}

      {/* Sidebar: drawer on mobile, fixed rail on md+ */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85%] flex-col overflow-y-auto border-r bg-background p-4 transition-transform duration-200 ease-out',
          'md:static md:z-auto md:w-60 md:max-w-none md:translate-x-0 md:bg-muted/20',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-2 flex items-center justify-end md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-accent"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {sidebar}
      </aside>

      {/* Main: extra top padding on mobile to clear the fixed top bar */}
      <main className="min-w-0 flex-1 overflow-auto p-4 pt-[4.5rem] md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
