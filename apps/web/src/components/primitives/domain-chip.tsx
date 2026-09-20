import { DOMAIN_BG_CLASS } from "@/lib/domain-colors";
import type { Domain, HeatmapDomain } from "@/data/types";
import { cn } from "@/lib/utils";

export function DomainDot({
  domain,
  className,
}: {
  domain: Domain | HeatmapDomain;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("size-2 shrink-0 rounded-full", DOMAIN_BG_CLASS[domain], className)}
    />
  );
}

export function DomainChip({
  domain,
  label,
  className,
}: {
  domain: Domain;
  label: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <DomainDot domain={domain} />
      <span className="text-sm text-fg-secondary">{label}</span>
    </span>
  );
}
