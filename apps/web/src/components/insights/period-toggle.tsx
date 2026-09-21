"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

/** Week/Month switch in the page header — reads the search params itself
 * (the static-export build forbids server-side searchParams). Wrap in
 * <Suspense> at the call site. */
export function PeriodToggle() {
  const { locale } = useLocale();
  const params = useSearchParams();
  const period = params?.get("period") === "month" ? "month" : "week";
  const tab = params?.get("tab") ?? "";
  return (
    <Link
      href={`/insights?period=${period === "week" ? "month" : "week"}&tab=${tab}`}
      className="rounded-full border border-border px-3 py-1 text-sm text-fg-secondary transition-colors hover:text-fg"
    >
      {period === "week" ? t(locale, "Monthly") : t(locale, "Weekly")}
    </Link>
  );
}
