/**
 * A bilingual section header, the way a UAE form labels a block: the English
 * name, its Arabic counterpart set quietly beside it, and a rule underneath
 * closing the field.
 *
 * The Arabic is a trust signal, not decoration — it tells a resident this site
 * belongs to the country they are in. Have a native speaker check these strings
 * before launch.
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
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b-2 border-ink pb-2">
      <h2 className="sign text-2xl text-ink">{children}</h2>
      {arabic && (
        <span className="arabic text-base text-ink-faint" aria-hidden="true">
          {arabic}
        </span>
      )}
      {action && <div className="ml-auto text-sm">{action}</div>}
    </div>
  );
}
