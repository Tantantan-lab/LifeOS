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
        "relative flex items-center gap-3 rounded-[8px] px-4 py-2.5 text-[13px] transition-colors",
        active
          ? "bg-[var(--dash-surface-hi)] text-fg"
          : "text-fg-secondary hover:bg-surface-2/60 hover:text-fg"
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-[var(--dash-fg)]" : "text-[var(--dash-fg-3)]")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
