import { cn } from "@/lib/utils";

/**
 * Server-rendered SVG sparkline — no JS. Color comes from currentColor,
 * so callers pick the semantics with a text-* class (trend colors only —
 * never domain colors; see docs/design-system.md).
 */
export function Sparkline({
  values,
  className,
  height = 32,
}: {
  values: number[];
  className?: string;
  height?: number;
}) {
  if (values.length < 2) {
    return <div className={cn("h-8 w-full", className)} aria-hidden />;
  }
  const width = 120;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 3 - ((v - min) / range) * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("block h-8 w-full", className)}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
