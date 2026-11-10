import type { PropsWithChildren, ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import LanguagePicker from "ports/pages/space/LanguagePicker.tsx";
import { spacePaths } from "ports/pages/space/space-routes.ts";

interface SpacePageProps {
  /** The page's h1. Omit it when the content brings its own heading. */
  title?: string;
  /** Above the title, e.g. "Step 2 of 2" and a Back link. */
  top?: ReactNode;
  /** The space whose privacy notice the footer links to; omitted on the notice itself. */
  privacyLinkFor?: string;
  /** Hide the footer, for focused steps like the pin form. */
  bare?: boolean;
}

// Every screen except the map: one narrow column (`.page` in app.css), and a
// footer with the privacy link and the language picker.
export default function SpacePage({
  title,
  top,
  privacyLinkFor,
  bare = false,
  children,
}: PropsWithChildren<SpacePageProps>) {
  const { t } = useTranslation();
  return (
    <div className="page">
      <main>
        {top}
        {title ? <h1>{title}</h1> : null}
        {children}
      </main>
      {bare ? null : (
        <footer>
          {privacyLinkFor ? (
            <p>
              <Link to={spacePaths.privacy(privacyLinkFor)}>{t.spaceApp.privacyLink}</Link>
            </p>
          ) : null}
          <LanguagePicker />
        </footer>
      )}
    </div>
  );
}
