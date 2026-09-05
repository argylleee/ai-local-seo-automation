"use client";

import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Primary navigation per docs/design.md. Only routes that exist today are
// listed — the rest of the documented nav (Local Visibility, Keywords,
// Website Audit, Reviews, Competitors, Reports, Integrations) is added
// as each feature module is built, rather than linking to pages that
// don't exist yet.
const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/businesses", label: "Businesses" },
  { href: "/recommendations", label: "Recommendations" },
  { href: "/settings", label: "Settings" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border border-b">
        <nav className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-3">
          <span className="mr-4 text-sm font-semibold">Local SEO Platform</span>
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
