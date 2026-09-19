import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { InsightsPreviewResult } from "@/data/selectors";
import { Panel } from "@/components/primitives/panel";
import { SectionHeading } from "@/components/primitives/section-heading";
import { SAMPLE_BADGE } from "@/lib/copy";

/**
 * Evidence-based observations. Live AI rows carry a provider/model badge;
 * the pre-AI sample cards stay badged Sample. Facts only — no judgment
 * words, no life philosophy.
 */
export function InsightsPreview({ insights }: { insights: InsightsPreviewResult }) {
  return (
    <Panel className="flex h-full flex-col">
      <SectionHeading
        title="Insights"
        action={
          <Link
            href="/insights"
            className="inline-flex items-center gap-1 text-sm text-fg-secondary transition-colors hover:text-fg"
          >
            View all <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      <div className="flex flex-1 flex-col justify-center gap-3">
        {insights.items.map((insight) => (
          <div
            key={insight.title}
            className="rounded-[10px] border border-border bg-surface-2/60 p-3"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-fg-muted" />
              <span className="text-sm font-medium text-fg">
                {insight.title}
              </span>
              <span className="ml-auto rounded-full border border-border px-2 py-0.5 text-micro text-fg-muted">
                {insights.live && insights.meta
                  ? `${insights.meta.provider} · ${insights.meta.model}`
                  : SAMPLE_BADGE}
              </span>
            </div>
            <p className="mt-1 text-sm text-fg-secondary">{insight.body}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
