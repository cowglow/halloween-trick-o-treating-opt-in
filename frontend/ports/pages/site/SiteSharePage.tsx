import { Link } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { ShareResourceList } from "ports/pages/space/ShareResourcesPage.tsx";
import { sitePaths } from "ports/pages/site/site-links.ts";

// The app's "Let your neighbors know" page, as an example of the outreach:
// the same images and captions, with the example address.
export default function SiteSharePage() {
  const { t } = useTranslation();
  return (
    <SpacePage title={t.spaceShare.title}>
      <p>{t.spaceSite.shareIntro}</p>
      <ShareResourceList linkUrl={`https://${t.spaceSite.shareUrl}`} />
      <p>
        <Link to={sitePaths.home}>{t.spaceSite.backToSite}</Link>
      </p>
    </SpacePage>
  );
}
