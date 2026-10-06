/**
 * A section header, set the way a sign is: the Arabic line above, the English
 * below it, and a rule closing the pair.
 *
 * The Arabic is `aria-hidden` because it repeats the English rather than
 * adding to it — it is there so that a resident reads the line they have been
 * reading since the airport, not to be announced twice.
 *
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
    <div className="flex flex-wrap items-end gap-x-4 gap-y-2 border-b-2 border-sign/20 pb-2.5">
      <div>
        {arabic && (
          <span dir="rtl"
            className="arabic block text-left text-[0.8125rem] leading-tight text-ink-faint"
            aria-hidden="true">
            {arabic}
          </span>
        )}
        <h2 className="sign mt-0.5 text-[1.875rem] text-ink">{children}</h2>
      </div>
      {action && <div className="ml-auto pb-1.5 text-sm">{action}</div>}
    </div>
  );
}
