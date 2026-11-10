import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { DEFAULT_SPACE_SLUG } from "ports/pages/space/space-routes.ts";
import { Pumpkin } from "ports/pages/space/Icons.tsx";

// After the event: the map has closed and its data is gone. Needs no server.
export default function ClosedPage() {
  const { t } = useTranslation();
  return (
    <SpacePage privacyLinkFor={DEFAULT_SPACE_SLUG}>
      <div className="hero">
        <Pumpkin size={72} />
        <h1>{t.spaceApp.closedTitle}</h1>
        <p>{t.spaceApp.eventEnded}</p>
      </div>
    </SpacePage>
  );
}
