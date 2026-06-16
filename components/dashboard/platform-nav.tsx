'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface PlatformNavItem {
  label: string;
  slug: string;
}

export interface ToolNavItem {
  label: string;
  href: string;
}

/**
 * Per-platform navigation. Each platform is a SEPARATE section — there is no
 * merged/unified inbox (firm product decision). Tools (cross-platform vault,
 * import, workflow helpers) live in their own section below the platforms.
 */
export function PlatformNav({
  items,
  tools = [],
}: {
  items: PlatformNavItem[];
  tools?: ToolNavItem[];
}) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      <Link
        href="/dashboard"
        className={cn(
          'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
          pathname === '/dashboard'
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground',
        )}
      >
        Overview
      </Link>
      <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase text-muted-foreground">
        Platforms
      </p>
      {items.map((item) => {
        const href = `/dashboard/${item.slug}`;
        const active = pathname.startsWith(href);
        return (
          <Link
            key={item.slug}
            href={href}
            data-testid={`nav-${item.slug}`}
            className={cn(
              'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              active
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground',
            )}
          >
            {item.label}
          </Link>
        );
      })}
      {tools.length > 0 ? (
        <>
          <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase text-muted-foreground">
            Tools
          </p>
          {tools.map((tool) => {
            const active = pathname.startsWith(tool.href);
            return (
              <Link
                key={tool.href}
                href={tool.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {tool.label}
              </Link>
            );
          })}
        </>
      ) : null}
    </nav>
  );
}
