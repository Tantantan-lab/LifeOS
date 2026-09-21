"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";

/** Week/Month switch in the page header — locale-aware label only. */
export function PeriodToggle({
  period,
  tab,
}: {
  period: "week" | "month";
  tab: string;
}) {
  const { locale } = useLocale();
  return (
    <Link
      href={`/insights?period=${period === "week" ? "month" : "week"}&tab=${tab}`}
      className="rounded-full border border-border px-3 py-1 text-sm text-fg-secondary transition-colors hover:text-fg"
    >
      {period === "week" ? t(locale, "Monthly") : t(locale, "Weekly")}
    </Link>
  );
}
