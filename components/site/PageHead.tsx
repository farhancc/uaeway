/**
 * The head of a page, set the way the masthead and every section heading are:
 * the Arabic line above, the English below it, and the one sentence that says
 * what this page is for.
 *
 * It exists because nine pages were each building their own h1 and drifting —
 * two had a lede, one had none, the Arabic appeared on some and not others.
 * A site whose job is wayfinding cannot have a different sign at every door.
 *
 * The Arabic is `aria-hidden`: it repeats the English rather than adding to
 * it. Have a native speaker check these strings before launch.
 */
export function PageHead({
  title,
  arabic,
  children,
}: {
  title: string;
  arabic?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-b-2 border-sign/20 pb-6">
      {arabic && (
        <p
          dir="rtl"
          className="arabic text-left text-sm leading-tight text-ink-faint"
          aria-hidden="true"
        >
          {arabic}
        </p>
      )}
      <h1 className="sign mt-1 text-[2.25rem] text-ink sm:text-[2.75rem]">{title}</h1>
      {children && (
        <div className="mt-3 max-w-[62ch] leading-relaxed text-ink-soft">{children}</div>
      )}
    </div>
  );
}
