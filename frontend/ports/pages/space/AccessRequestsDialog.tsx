import { useState } from "react";
import { spaceApiFetch, SpaceApiError } from "infrastructure/api/space-api-client.ts";
import type { SpaceRole } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpaceDialog from "ports/pages/space/SpaceDialog.tsx";
import { apiErrorMessage } from "ports/pages/space/api-error-message.ts";
import RoleChoice from "ports/pages/space/RoleChoice.tsx";
import { COMMUNITY } from "domain/community/community-config.ts";

export type AccessRequest = {
  id: string;
  email: string;
  message: string;
  createdAt: string;
};

// A request someone already answered, kept for a day so the participants who
// got the same notice email see it was handled. Says nothing about who asked.
export type AnsweredAccessRequest = {
  id: string;
  outcome: "allowed" | "denied";
  answeredAt: string;
  byYou: boolean;
  invite: "joined" | "pending" | "expired" | "revoked" | null;
};

// The community's time, with the weekday: "answered in the last 24 hours" can be
// yesterday.
function formatAnsweredAt(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleString(language, {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: COMMUNITY.timeZone,
    });
  } catch {
    return iso;
  }
}

interface AccessRequestsDialogProps {
  spaceSlug: string;
  requests: AccessRequest[];
  answered: AnsweredAccessRequest[];
  /** Reloads the list (MapHomePage owns it, for the count on the map). */
  onChanged: () => void;
  onClose: () => void;
}

// Any participant can answer (decided with Philip, see docs/WORKLOG.md
// 2026-10-26); the backend re-checks the role. Allowing sends an invite from
// whoever clicked, so it counts toward their invite limits.
export default function AccessRequestsDialog({
  spaceSlug,
  requests,
  answered,
  onChanged,
  onClose,
}: AccessRequestsDialogProps) {
  const { t, language } = useTranslation();
  const [roles, setRoles] = useState<Record<string, SpaceRole>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const answer = async (request: AccessRequest, allow: boolean) => {
    setBusyId(request.id);
    setStatus(null);
    setError(null);
    try {
      if (allow) {
        await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/access-requests/${request.id}/allow`, {
          method: "POST",
          body: JSON.stringify({ role: roles[request.id] ?? "visitor" }),
        });
        setStatus(t.spaceApp.accessRequestAllowed(request.email));
      } else {
        await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/access-requests/${request.id}`, { method: "DELETE" });
      }
      onChanged();
    } catch (err) {
      setError(
        err instanceof SpaceApiError && err.status === 429
          ? t.spaceApp.inviteLimit
          : apiErrorMessage(err, t, t.spaceApp.accessRequestFailed),
      );
      // Someone else may have answered it first.
      onChanged();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <SpaceDialog title={t.spaceApp.accessRequestsTitle} onClose={onClose}>
      <p>
        <small>{t.spaceApp.accessRequestsHint}</small>
      </p>
      {status ? <p role="status">{status}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {requests.length === 0 ? (
        <p>{t.spaceApp.noAccessRequests}</p>
      ) : (
        requests.map((request) => {
          const role = roles[request.id] ?? "visitor";
          const setRole = (next: SpaceRole) => setRoles((current) => ({ ...current, [request.id]: next }));
          return (
            <article key={request.id} aria-label={request.email}>
              <p>
                <strong>{request.email}</strong>
                {request.message ? (
                  <>
                    <br />
                    {request.message}
                  </>
                ) : null}
              </p>
              <RoleChoice name={`request-role-${request.id}`} role={role} onChange={setRole} />
              <div role="group">
                <button
                  type="button"
                  aria-busy={busyId === request.id}
                  disabled={busyId !== null}
                  onClick={() => void answer(request, true)}
                >
                  {t.spaceApp.allowAccess}
                </button>
                <button
                  type="button"
                  className="secondary outline"
                  disabled={busyId !== null}
                  onClick={() => void answer(request, false)}
                >
                  {t.spaceApp.denyAccess}
                </button>
              </div>
            </article>
          );
        })
      )}
      {answered.length > 0 ? (
        <section aria-label={t.spaceApp.answeredTitle}>
          <h3>{t.spaceApp.answeredTitle}</h3>
          <p>
            <small>{t.spaceApp.answeredHint}</small>
          </p>
          <ul>
            {answered.map((answer) => (
              <li key={answer.id}>
                {formatAnsweredAt(answer.answeredAt, language)}:{" "}
                {answer.outcome === "allowed"
                  ? t.spaceApp.answeredAllowed(answer.byYou)
                  : t.spaceApp.answeredDenied(answer.byYou)}
                {answer.invite ? `, ${t.spaceApp.answeredInvite[answer.invite]}` : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </SpaceDialog>
  );
}
