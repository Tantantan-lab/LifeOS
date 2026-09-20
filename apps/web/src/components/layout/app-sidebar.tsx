"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CalendarDays,
  Grid3x3,
  House,
  Plug,
  Settings,
  Sparkles,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "@/components/layout/nav-item";
import { ThemeToggle } from "@/components/theme/theme-toggle";

type NavEntry = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { title: string; entries: NavEntry[] }[] = [
  {
    title: "Overview",
    entries: [
      { href: "/", label: "Home", icon: House },
      { href: "/today", label: "Today", icon: CalendarDays },
    ],
  },
  {
    title: "Progress",
    entries: [
      { href: "/contribution", label: "Contribution", icon: Grid3x3 },
      { href: "/me-vs-me", label: "Me vs Me", icon: ArrowLeftRight },
      { href: "/goals", label: "Goals", icon: Target },
    ],
  },
  {
    title: "System",
    entries: [
      { href: "/insights", label: "Insights", icon: Sparkles },
      { href: "/data-sources", label: "Data Sources", icon: Plug },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function BrandBlock() {
  return (
    <div className="px-3 pb-4">
      <div className="text-h2 font-semibold tracking-tight text-fg">
        LifeOS
      </div>
      <div className="mt-0.5 text-micro text-fg-muted">
        Compete with your past.
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 flex-col border-r border-border bg-surface-1 md:flex">
        <div className="flex h-full flex-col px-3 py-4">
          <BrandBlock />
          <nav className="flex-1 space-y-5 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="px-3 pb-1.5 text-micro uppercase tracking-[0.12em] text-fg-muted">
                  {group.title}
                </div>
                <div className="space-y-0.5">
                  {group.entries.map((entry) => (
                    <NavItem
                      key={entry.href}
                      href={entry.href}
                      label={entry.label}
                      icon={entry.icon}
                      active={pathname === entry.href}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-border px-3 pt-3 text-micro text-fg-muted">
            <ThemeToggle className="mb-2" />
            <div>No judgment. Just evidence.</div>
            <div className="mt-0.5">Local user · v0.5.0 · M5</div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/95 backdrop-blur md:hidden">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="text-h2 font-semibold tracking-tight">LifeOS</div>
        </div>
        <nav
          aria-label="Primary"
          className="flex gap-1 overflow-x-auto px-3 py-2 text-sm"
        >
          {NAV_GROUPS.flatMap((group) => group.entries).map((entry) => {
            const active = pathname === entry.href;
            return (
              <Link
                key={entry.href}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 transition-colors",
                  active
                    ? "bg-surface-2 text-fg"
                    : "text-fg-secondary hover:text-fg"
                )}
              >
                {entry.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
