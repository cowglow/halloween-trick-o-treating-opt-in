import type { AnchorHTMLAttributes } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

// A link to another site: opens in a new window, without giving that page a
// handle on this one (noopener) or vouching for it (nofollow). Screen readers
// hear that it opens a new window. Every link off the site goes through here;
// external-links.test.ts checks that.
export default function ExternalLink({ children, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { t } = useTranslation();
  return (
    <a {...props} target="_blank" rel="noopener nofollow">
      {children}
      <span className="sr-only"> {t.common.newWindow}</span>
    </a>
  );
}
