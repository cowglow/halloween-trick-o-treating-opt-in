import { useState } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpaceDialog from "ports/pages/space/SpaceDialog.tsx";

interface RemoveMeDialogProps {
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

// docs/SPEC.md section 3's "deletion fairness messaging" - the fairness copy
// appears here too (not just on LocationForm), since removing your whole
// account is the same "please don't do this at the last minute, but you
// always can" moment as removing just your pin. An alertdialog with focus
// starting on Cancel, so the destructive button is never the default.
export default function RemoveMeDialog({ onConfirm, onClose }: RemoveMeDialogProps) {
  const { t } = useTranslation();
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setRemoving(true);
    setError(null);
    try {
      await onConfirm();
    } catch {
      setError(t.spaceApp.removeMeFailed);
      setRemoving(false);
    }
  };

  return (
    <SpaceDialog title={t.spaceApp.removeMeConfirmTitle} onClose={onClose} role="alertdialog">
      <p>{t.spaceApp.removeMeConfirmMessage}</p>
      <p>
        <small>{t.spaceApp.fairness}</small>
      </p>
      {error ? <p role="alert">{error}</p> : null}
      <footer>
        <button type="button" className="secondary outline" data-autofocus onClick={onClose} disabled={removing}>
          {t.common.cancel}
        </button>
        <button type="button" className="danger" onClick={handleConfirm} aria-busy={removing} disabled={removing}>
          {t.spaceApp.removeMeConfirmButton}
        </button>
      </footer>
    </SpaceDialog>
  );
}
