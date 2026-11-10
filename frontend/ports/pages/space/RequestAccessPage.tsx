import { FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { spaceApiFetch } from "infrastructure/api/space-api-client.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { Pumpkin } from "ports/pages/space/Icons.tsx";
import { apiErrorMessage } from "ports/pages/space/api-error-message.ts";

const MESSAGE_MAX = 280;

// For someone without an invite. Any participant can then allow the request
// (which sends a normal invite) or deny it. The reply is the same whether or
// not the email is already on the map, so the page always ends on one message.
export default function RequestAccessPage() {
  const { spaceSlug = "" } = useParams();
  const { t, language } = useTranslation();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!consent) {
      setError(t.spaceApp.requestAccessConsentRequired);
      return;
    }
    setStatus("pending");
    setError(null);
    try {
      await spaceApiFetch(null, `/spaces/${spaceSlug}/access-requests`, {
        method: "POST",
        // Their invite, if someone allows this, is written in this language.
        body: JSON.stringify({ email, message, consent: true, language }),
      });
      setStatus("sent");
    } catch (err) {
      setStatus("failed");
      setError(apiErrorMessage(err, t, t.spaceApp.requestAccessFailed));
    }
  };

  return (
    <SpacePage privacyLinkFor={spaceSlug}>
      <hgroup className="hero">
        <Pumpkin size={96} face />
        <h1>{t.spaceApp.requestAccessTitle}</h1>
        <p>{t.spaceApp.requestAccessIntro}</p>
      </hgroup>

      {status === "sent" ? (
        <p role="status" className="notice">
          {t.spaceApp.requestAccessSent}
        </p>
      ) : (
        <form onSubmit={handleSubmit}>
          <label htmlFor="request-email">{t.spaceApp.requestAccessEmail}</label>
          <input
            id="request-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <label htmlFor="request-message">{t.spaceApp.requestAccessMessage}</label>
          <textarea
            id="request-message"
            rows={2}
            maxLength={MESSAGE_MAX}
            placeholder={t.spaceApp.requestAccessMessagePlaceholder}
            aria-describedby="request-message-hint"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
          <small id="request-message-hint">{t.spaceApp.requestAccessMessageHint}</small>
          <label htmlFor="request-consent">
            <input
              id="request-consent"
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            {t.spaceApp.requestAccessConsent()}{" "}
            <Link to={spacePaths.privacy(spaceSlug)} target="_blank" rel="noopener noreferrer">
              {t.spaceApp.privacyLink}
            </Link>
          </label>
          <div className="actions">
            <button type="submit" aria-busy={status === "pending"} disabled={status === "pending"}>
              {t.spaceApp.requestAccessSubmit}
            </button>
          </div>
          {error ? <p role="alert">{error}</p> : null}
        </form>
      )}
      <p className="center">
        <Link to={spacePaths.home(spaceSlug)}>{t.spaceApp.backToMap}</Link>
      </p>
    </SpacePage>
  );
}
