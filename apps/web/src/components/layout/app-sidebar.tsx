"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeftRight, CalendarDays, Grid3x3, House, Plug, Sparkles, Target, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { NavItem } from "@/components/layout/nav-item";
import { useLocale } from "@/components/i18n/locale-provider";

type NavEntry = { href: string; label: string; labelZh: string; icon: LucideIcon };

const NAV_GROUPS: { title: string; entries: NavEntry[] }[] = [
  {
    title: "",
    entries: [
      { href: "/", label: "Home", labelZh: "首页", icon: House },
      { href: "/today", label: "Today", labelZh: "今天", icon: CalendarDays },
      { href: "/contribution", label: "Contribution", labelZh: "贡献记录", icon: Grid3x3 },
      { href: "/me-vs-me", label: "Me vs Me", labelZh: "今昔对比", icon: ArrowLeftRight },
      { href: "/goals", label: "Goals", labelZh: "目标", icon: Target },
      { href: "/insights", label: "Insights", labelZh: "洞察", icon: Sparkles },
      { href: "/data-sources", label: "Data Sources", labelZh: "数据源", icon: Plug },
    ],
  },
];

function BrandBlock({ locale }: { locale: "en" | "zh" }) {
  return (
    <div className="px-3 pb-4">
      <div className="text-h2 font-semibold tracking-tight text-fg">
        LifeOS
      </div>
      <div className="mt-0.5 text-[11px] text-fg-muted">
        {locale === "zh" ? "与过去的自己竞争。" : "Compete with your past."}
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const { locale } = useLocale();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-[196px] shrink-0 flex-col border-r border-border bg-[var(--dash-sidebar)] md:flex">
        <div className="flex h-full flex-col px-2 py-5">
          <BrandBlock locale={locale} />
          <nav className="flex-1 space-y-5 overflow-y-auto">
            {NAV_GROUPS.map((group) => (
              <div key={group.title || "primary"}>
                <div className="space-y-1">
                  {group.entries.map((entry) => (
                    <NavItem
                      key={entry.href}
                      href={entry.href}
                      label={locale === "zh" ? entry.labelZh : entry.label}
                      icon={entry.icon}
                      active={pathname === entry.href}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="px-4 pb-1 text-[11px] leading-5 text-fg-muted">
            <div className="border-l-2 border-[#6572ff] pl-3">{locale === "zh" ? <>不评判。<br />只看证据。</> : <>No judgment.<br />Just evidence.</>}</div>
            <div className="mt-7 flex items-center gap-3"><span className="flex size-7 items-center justify-center rounded-full bg-[var(--dash-surface-hi)]"><UserRound className="size-4" /></span><span>{locale === "zh" ? <>更好的自己，<br />更多的选择。</> : <>A better me,<br />more choices.</>}</span></div>
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
                {locale === "zh" ? entry.labelZh : entry.label}
              </Link>
            );
          })}
        </nav>
      </header>
    </>
  );
}
