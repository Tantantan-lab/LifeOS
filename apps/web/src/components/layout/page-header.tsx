export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-border pb-5">
      <div>
        <h1 className="text-h1 font-semibold tracking-tight text-fg">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-fg-secondary">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
