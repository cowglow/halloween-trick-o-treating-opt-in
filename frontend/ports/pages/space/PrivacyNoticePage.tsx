import { Link, useParams } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import type { Language } from "ports/i18n/language.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { CURRENT_NOTICE_VERSION } from "domain/space/notice-version.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { EVENT_END } from "ports/pages/space/event-config.ts";
import { COMMUNITY } from "domain/community/community-config.ts";

// Read from env vars with placeholders, per docs/SPEC.md section 3 ("controller
// (read name/contact from env vars, leave placeholders)") - the real values
// belong in the deployment's .env, not in source (see docs/WORKLOG.md for the
// exact lines to add to .env.example).
const CONTROLLER_NAME = import.meta.env.VITE_PRIVACY_CONTROLLER_NAME ?? "[controller name - set VITE_PRIVACY_CONTROLLER_NAME]";
const CONTROLLER_CONTACT =
  import.meta.env.VITE_PRIVACY_CONTROLLER_CONTACT ?? "[controller contact - set VITE_PRIVACY_CONTROLLER_CONTACT]";

// In the app's language, not the browser's, and on the community's clock, not
// the reader's: the deletion happens at midnight in Bavaria.
function formatRetentionDate(iso: string, language: Language): string {
  try {
    return new Date(iso).toLocaleString(language, {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: COMMUNITY.timeZone,
    });
  } catch {
    return iso;
  }
}

export default function PrivacyNoticePage() {
  const { t, language } = useTranslation();
  const { spaceSlug = "" } = useParams();
  const p = t.spacePrivacy;

  return (
    <SpacePage title={p.title}>
      <p>{p.intro}</p>

      <h2>{p.controllerTitle}</h2>
      <p>{p.controller(CONTROLLER_NAME, CONTROLLER_CONTACT)}</p>

      <h2>{p.purposeTitle}</h2>
      <p>{p.purpose}</p>

      <h2>{p.dataCollectedTitle}</h2>
      <p>{p.dataCollected}</p>

      <h2>{p.whoSeesTitle}</h2>
      <p>{p.whoSees}</p>

      <h2>{p.accessRequestsTitle}</h2>
      <p>{p.accessRequests}</p>

      <h2>{p.thirdPartiesTitle}</h2>
      <p>{p.thirdParties}</p>

      <h2>{p.retentionTitle}</h2>
      <p>{p.retention(formatRetentionDate(EVENT_END.toISOString(), language))}</p>

      <h2>{p.rightsTitle}</h2>
      <p>{p.rights}</p>

      <p>
        <small>{p.noticeVersion(CURRENT_NOTICE_VERSION)}</small>
      </p>
      <p>
        <Link to={spacePaths.home(spaceSlug)}>{t.spaceApp.backToMap}</Link>
      </p>
    </SpacePage>
  );
}
