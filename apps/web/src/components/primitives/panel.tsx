import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * The one card surface for the whole product: Surface 1 background,
 * 1px #242A36 border, 14px radius, no shadow. Padding is 20-24px
 * (normal) or 16px (tight, for dense domain cards).
 * See docs/design-system.md — never style a Card directly in a page.
 */
export function Panel({
  className,
  tight = false,
  children,
  ...props
}: React.ComponentProps<"div"> & { tight?: boolean }) {
  return (
    <Card
      className={cn(
        "rounded-[14px] border border-border bg-surface-1 ring-0 shadow-none",
        className
      )}
      {...props}
    >
      <CardContent className={tight ? "p-4" : "p-5 lg:p-6"}>
        {children}
      </CardContent>
    </Card>
  );
}
