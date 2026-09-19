import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function NavItem({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-2.5 rounded-[8px] px-3 py-2 text-sm transition-colors",
        active
          ? "bg-surface-2 text-fg"
          : "text-fg-secondary hover:bg-surface-2/60 hover:text-fg"
      )}
    >
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand"
        />
      )}
      <Icon
        className={cn("size-4 shrink-0", active ? "text-brand" : "text-fg-muted")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
