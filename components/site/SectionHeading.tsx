/**
 * A section header: the English name, its Arabic counterpart set quietly
 * alongside, and a brass hairline closing it.
 *
 * The Arabic tells a resident this site belongs to the country they are in.
 * Have a native speaker check these strings before launch.
 */
export function SectionHeading({
  children,
  arabic,
  action,
}: {
  children: React.ReactNode;
  arabic?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b border-brass/40 pb-3">
      <h2 className="sign text-[1.75rem] text-ink">{children}</h2>
      {arabic && (
        <span className="arabic text-base text-ink-faint" aria-hidden="true">
          {arabic}
        </span>
      )}
      {action && <div className="ml-auto text-sm">{action}</div>}
    </div>
  );
}
