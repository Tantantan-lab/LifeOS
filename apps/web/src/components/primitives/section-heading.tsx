export function SectionHeading({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-h2 font-semibold text-fg">{title}</h2>
      {action}
    </div>
  );
}
