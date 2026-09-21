"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Panel } from "@/components/primitives/panel";
import { useLocale } from "@/components/i18n/locale-provider";
import { t } from "@/lib/i18n";
import type { DataSourceRow } from "@/data/types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DataSourcesView({ sources }: { sources: DataSourceRow[] }) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  const connectors = sources.filter((s) => s.isConnector);
  const provenance = sources.filter((s) => !s.isConnector);

  return (
    <>
      <PageHeader
        title="Data Sources"
        description="Every source normalizes into the unified Event stream — private by default, credentials never touch the database."
      />

      <Panel className="mb-5 border-brand-soft bg-brand-soft/20">
        <p className="text-sm text-fg-secondary">
          {zh ? (
            <>
              {t(locale, "Connector credentials live in")}{" "}
              <code className="text-fg">apps/api/.env</code>
              。{t(locale, "Fill a token, then run")}{" "}
              <code className="text-fg">npm run sync</code>{" "}
              {t(locale, "each source syncs independently and reports its own status.")}
            </>
          ) : (
            <>
              Connector credentials live in{" "}
              <code className="text-fg">apps/api/.env</code>.
              Fill a token, then run <code className="text-fg">npm run sync</code> —{" "}
              each source syncs independently and reports its own status.
            </>
          )}
        </p>
      </Panel>

      <h2 className="mb-3 text-h2 font-semibold text-fg">
        {t(locale, "Connectors")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {connectors.map((source) => (
          <ConnectorCard key={source.source} source={source} />
        ))}
      </div>

      <h2 className="mb-3 mt-6 text-h2 font-semibold text-fg">
        {t(locale, "Mock provenance")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {provenance.map((source) => (
          <ConnectorCard key={source.source} source={source} />
        ))}
      </div>
    </>
  );
}

function ConnectorCard({ source }: { source: DataSourceRow }) {
  const { locale } = useLocale();
  const zh = locale === "zh";
  return (
    <Panel tight className="flex h-full flex-col">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className={cn(
            "size-2 rounded-full",
            source.connected ? "bg-trend-up" : "bg-fg-muted/40"
          )}
        />
        <span className="truncate text-sm font-medium text-fg">
          {source.label}
        </span>
        <span
          className={cn(
            "ml-auto rounded-full border border-border px-2 py-0.5 text-micro",
            source.connected
              ? "text-trend-up"
              : "text-fg-muted"
          )}
        >
          {t(locale, source.connected ? "Connected" : "Disconnected")}
        </span>
      </div>

      <div className="mt-3 space-y-1 text-micro text-fg-muted">
        <div>
          {t(locale, "Last sync:")}{" "}
          {source.lastSyncAt ? formatRelativeTime(source.lastSyncAt) : t(locale, "never")}
        </div>
        <div className="num">
          {zh
            ? `${source.events30d} ${t(locale, "events · last 30 days")}`
            : `${source.events30d} events · last 30 days`}
        </div>
      </div>

      {!source.connected && (
        <div className="mt-3 border-t border-border pt-2 text-micro text-fg-muted">
          {t(
            locale,
            source.isConnector
              ? "Add the token to apps/api/.env, then run `npm run sync`."
              : "Seeded demo history — replaced as real data arrives."
          )}
        </div>
      )}
    </Panel>
  );
}
