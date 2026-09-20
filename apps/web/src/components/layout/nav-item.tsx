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
          ? "bg-[#1b222e] text-fg"
          : "text-fg-secondary hover:bg-surface-2/60 hover:text-fg"
      )}
    >
      <Icon
        className={cn("size-4 shrink-0", active ? "text-[#dce3ed]" : "text-[#8f99aa]")}
      />
      <span className="truncate">{label}</span>
    </Link>
  );
}
