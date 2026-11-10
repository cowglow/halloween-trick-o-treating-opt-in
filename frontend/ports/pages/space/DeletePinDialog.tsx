import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpaceDialog from "ports/pages/space/SpaceDialog.tsx";

interface DeletePinDialogProps {
  onConfirm: () => void;
  onClose: () => void;
}

// Replaces window.confirm(): a native confirm() can't be styled, labelled or
// driven reliably by tests, and blocks the page. Same alertdialog treatment
// as RemoveMeDialog: focus starts on Cancel.
export default function DeletePinDialog({ onConfirm, onClose }: DeletePinDialogProps) {
  const { t } = useTranslation();
  return (
    <SpaceDialog title={t.spaceApp.confirmDeletePinTitle} onClose={onClose} role="alertdialog">
      <p>{t.spaceApp.confirmDeletePinMessage}</p>
      <footer>
        <button type="button" className="secondary outline" data-autofocus onClick={onClose}>
          {t.common.cancel}
        </button>
        <button type="button" className="danger" onClick={onConfirm}>
          {t.spaceApp.deletePin}
        </button>
      </footer>
    </SpaceDialog>
  );
}
