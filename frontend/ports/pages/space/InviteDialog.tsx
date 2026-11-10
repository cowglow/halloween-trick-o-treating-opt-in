import { FormEvent, useEffect, useState } from "react";
import { spaceApiFetch, SpaceApiError } from "infrastructure/api/space-api-client.ts";
import type { SpaceRole } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpaceDialog from "ports/pages/space/SpaceDialog.tsx";
import { apiErrorMessage } from "ports/pages/space/api-error-message.ts";
import RoleChoice from "ports/pages/space/RoleChoice.tsx";

type InviteListItem = {
  id: string;
  email: string;
  role: SpaceRole;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
};

type InviteStatus = "revoked" | "accepted" | "expired" | "pending";

function inviteStatus(invite: InviteListItem): InviteStatus {
  if (invite.revokedAt) return "revoked";
  if (invite.usedAt) return "accepted";
  if (new Date(invite.expiresAt) < new Date()) return "expired";
  return "pending";
}

function inviteStatusLabel(status: InviteStatus, t: ReturnType<typeof useTranslation>["t"]): string {
  return {
    revoked: t.spaceApp.inviteStatusRevoked,
    accepted: t.spaceApp.inviteStatusAccepted,
    expired: t.spaceApp.inviteStatusExpired,
    pending: t.spaceApp.inviteStatusPending,
  }[status];
}

// Only ever shown to a `participant` (docs/SPEC.md section 2: only a participant
// can invite) - the caller (MapHomePage) already gates on role before
// rendering this, and the backend re-checks it on every request regardless.
export default function InviteDialog({ spaceSlug, onClose }: { spaceSlug: string; onClose: () => void }) {
  const { t, language } = useTranslation();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SpaceRole>("visitor");
  const [status, setStatus] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [invites, setInvites] = useState<InviteListItem[] | null>(null);

  const loadInvites = () => {
    spaceApiFetch<{ invites: InviteListItem[] }>(spaceSlug, `/spaces/${spaceSlug}/invites`)
      .then((result) => setInvites(result.invites))
      .catch(() => setInvites([]));
  };

  useEffect(loadInvites, [spaceSlug]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus("pending");
    setError(null);
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/invites`, {
        method: "POST",
        // The invite email is written in the inviter's language.
        body: JSON.stringify({ email, role, language }),
      });
      setStatus("sent");
      setEmail("");
      loadInvites();
    } catch (err) {
      setStatus("failed");
      setError(
        err instanceof SpaceApiError && err.status === 429 ? t.spaceApp.inviteLimit : apiErrorMessage(err, t, t.spaceApp.inviteFailed),
      );
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/invites/${id}`, { method: "DELETE" });
      loadInvites();
    } catch {
      setError(t.spaceApp.revokeInviteFailed);
    }
  };

  // Only for an invite that can no longer be accepted, e.g. a mistyped
  // address: erases it from the list (the backend keeps a blank row so it
  // still counts toward the invite limits).
  const handleDelete = async (id: string) => {
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/invites/${id}/erase`, { method: "POST" });
      loadInvites();
    } catch {
      setError(t.spaceApp.deleteInviteFailed);
    }
  };

  return (
    <SpaceDialog title={t.spaceApp.inviteTitle} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <label htmlFor="invite-email">{t.spaceApp.inviteEmail}</label>
        <input
          id="invite-email"
          type="email"
          autoComplete="off"
          data-autofocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <RoleChoice name="invite-role" role={role} onChange={setRole} />
        <button type="submit" aria-busy={status === "pending"} disabled={status === "pending"}>
          {t.spaceApp.sendInvite}
        </button>
        {status === "sent" ? <p role="status">{t.spaceApp.inviteSent}</p> : null}
        {status === "failed" || error ? <p role="alert">{error}</p> : null}
      </form>

      <h3>{t.spaceApp.pendingInvitesTitle}</h3>
      {invites === null ? (
        <p aria-busy="true">{t.spaceApp.loading}</p>
      ) : invites.length === 0 ? (
        <p>{t.spaceApp.noPendingInvites}</p>
      ) : (
        <ul>
          {invites.map((invite) => {
            const status = inviteStatus(invite);
            return (
              <li key={invite.id}>
                {invite.email} ({inviteStatusLabel(status, t)})
                {status === "pending" ? (
                  <>
                    {" "}
                    <button type="button" className="secondary outline" onClick={() => handleRevoke(invite.id)}>
                      {t.spaceApp.revokeInvite}
                    </button>
                  </>
                ) : null}
                {status === "revoked" || status === "expired" ? (
                  <>
                    {" "}
                    <button type="button" className="secondary outline" onClick={() => handleDelete(invite.id)}>
                      {t.spaceApp.deleteInvite}
                    </button>
                  </>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </SpaceDialog>
  );
}
