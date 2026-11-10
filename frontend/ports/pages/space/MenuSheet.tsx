import { Link } from "react-router-dom";
import type { SpaceRole } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpaceDialog from "ports/pages/space/SpaceDialog.tsx";
import LanguagePicker from "ports/pages/space/LanguagePicker.tsx";
import { Icon } from "ports/pages/space/Icons.tsx";
import { spacePaths } from "ports/pages/space/space-routes.ts";

interface MenuSheetProps {
  spaceSlug: string;
  role: SpaceRole;
  /** Waiting requests to join; only participants see these. */
  accessRequestCount: number;
  onInvite: () => void;
  onAccessRequests: () => void;
  onRules: () => void;
  onSignOut: () => void;
  onRemoveMe: () => void;
  onClose: () => void;
}

// Everything that isn't the map or the main action: inviting, the
// trick-or-treat rules, the images to share, language, privacy, signing out, and - set apart at the bottom -
// "Remove me".
export default function MenuSheet({
  spaceSlug,
  role,
  accessRequestCount,
  onInvite,
  onAccessRequests,
  onRules,
  onSignOut,
  onRemoveMe,
  onClose,
}: MenuSheetProps) {
  const { t } = useTranslation();
  return (
    <SpaceDialog
      title={t.spaceApp.menu}
      subtitle={role === "participant" ? t.spaceApp.participantBadge : t.spaceApp.visitorBadge}
      variant="sheet"
      onClose={onClose}
    >
      <div className="actions">
        {role === "participant" ? (
          <button type="button" className="secondary outline" onClick={onInvite}>
            <Icon name="mail" /> {t.spaceApp.inviteTitle}
          </button>
        ) : null}
        <button type="button" className="secondary outline" onClick={onRules}>
          <Icon name="info" /> {t.spaceRules.menuLink}
        </button>
        <Link to={spacePaths.share(spaceSlug)} role="button" className="secondary outline">
          <Icon name="share" /> {t.spaceShare.menuLink}
        </Link>
        {role === "participant" ? (
          <button type="button" className="secondary outline" onClick={onAccessRequests}>
            {t.spaceApp.accessRequestsTitle} ({accessRequestCount})
          </button>
        ) : null}
        <LanguagePicker id="menu-language" />
        <Link to={spacePaths.privacy(spaceSlug)} role="button" className="secondary outline">
          <Icon name="shield" /> {t.spaceApp.privacyLink}
        </Link>
        <button type="button" className="secondary outline" onClick={onSignOut}>
          <Icon name="signOut" /> {t.spaceApp.signOut}
        </button>
      </div>
      <hr />
      <div className="actions">
        <button type="button" className="danger outline" onClick={onRemoveMe}>
          {t.spaceApp.removeMeButton}
        </button>
      </div>
      <p>
        <small>{t.spaceApp.removeMeHint}</small>
      </p>
    </SpaceDialog>
  );
}
