import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  setSpaceSession,
  spaceApiFetch,
  toSpaceSession,
  type SpaceAuthResponse,
} from "infrastructure/api/space-api-client.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { Icon, Pumpkin } from "ports/pages/space/Icons.tsx";
import { apiErrorMessage } from "ports/pages/space/api-error-message.ts";

// The first thing an invited neighbor sees. docs/SPEC.md section 2: accepting
// an invite is the only way a SpaceParticipant row is ever created - there's
// no public self-serve sign-up. The consent checkbox here is what sets
// consentAt/noticeVersion on the backend (application/space/space.use-cases.ts's
// acceptInvite), the GDPR consent record (section 3).
export default function InviteAcceptPage() {
  const { spaceSlug = "" } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const token = searchParams.get("token") ?? "";

  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) {
      setError(t.spaceApp.acceptInviteConsentRequired);
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      const result = await spaceApiFetch<SpaceAuthResponse>(
        spaceSlug,
        `/spaces/${spaceSlug}/invites/${token}/accept`,
        { method: "POST", body: JSON.stringify({ consent: true, language }) },
      );
      setSpaceSession(spaceSlug, toSpaceSession(result));
      // MapHomePage shows the three-step welcome once, for new participants.
      navigate(spacePaths.home(spaceSlug), { replace: true, state: { welcome: true } });
    } catch (err) {
      setStatus("failed");
      setError(apiErrorMessage(err, t, t.spaceApp.acceptInviteFailed));
    }
  };

  if (!token) {
    return (
      <SpacePage title={t.spaceApp.acceptInviteTitle} privacyLinkFor={spaceSlug}>
        <p role="alert">{t.spaceApp.acceptInviteFailed}</p>
      </SpacePage>
    );
  }

  return (
    <SpacePage privacyLinkFor={spaceSlug}>
      <hgroup className="hero">
        <Pumpkin size={132} face />
        <h1>{t.spaceApp.acceptInviteTitle}</h1>
        <p>{t.spaceApp.acceptInviteIntro}</p>
      </hgroup>

      <article>
        <p>
          <Icon name="lock" /> {t.spaceApp.acceptInviteInviteOnly}
        </p>
        <p>
          <Icon name="pin" /> {t.spaceApp.acceptInviteNoAddresses}
        </p>
        <p>
          <Icon name="trash" /> {t.spaceApp.acceptInviteDeleted}
        </p>
      </article>

      <form onSubmit={handleSubmit}>
        <label htmlFor="accept-consent">
          <input
            id="accept-consent"
            type="checkbox"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            required
          />
          {t.spaceApp.acceptInviteConsent()}{" "}
          <Link to={spacePaths.privacy(spaceSlug)} target="_blank" rel="noopener noreferrer">
            {t.spaceApp.privacyLink}
          </Link>
        </label>
        <p>
          <small>{t.spaceApp.fairness}</small>
        </p>
        <div className="actions">
          <button type="submit" aria-busy={status === "pending"} disabled={status === "pending"}>
            {t.spaceApp.acceptInviteSubmit}
          </button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
      </form>
    </SpacePage>
  );
}
