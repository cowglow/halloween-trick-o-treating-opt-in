import { FormEvent, useState } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { Icon } from "ports/pages/space/Icons.tsx";

const LABEL_MAX = 60;
const NOTE_MAX = 500;

interface LocationFormProps {
  initialLabel?: string;
  initialNote?: string;
  onSubmit: (input: { label: string; note: string }) => Promise<void>;
  onBack: () => void;
  /** Shown only when editing an existing house. */
  onDelete?: () => void;
  submitting: boolean;
  error: string | null;
}

// Step 2 of adding a house: the name and note neighbors see (docs/SPEC.md
// section 9, "label and note form with counters"). The GDPR consent record
// (consentAt/noticeVersion) is captured once, when the invite is accepted
// (InviteAcceptPage.tsx) - nobody reaches this form without it, so the form
// itself asks for no second confirmation.
export default function LocationForm({
  initialLabel = "",
  initialNote = "",
  onSubmit,
  onBack,
  onDelete,
  submitting,
  error,
}: LocationFormProps) {
  const { t } = useTranslation();
  const [label, setLabel] = useState(initialLabel);
  const [note, setNote] = useState(initialNote);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    await onSubmit({ label, note });
  };

  return (
    <SpacePage
      bare
      title={t.spaceApp.detailsTitle}
      top={
        <nav>
          <ul>
            <li>
              <button type="button" className="secondary outline" onClick={onBack} disabled={submitting}>
                <Icon name="back" size={18} /> {t.common.back}
              </button>
            </li>
          </ul>
          <ul>
            <li>
              <small>{t.spaceApp.stepOf(2, 2)}</small>
            </li>
          </ul>
        </nav>
      }
    >
      <form onSubmit={handleSubmit}>
        <label htmlFor="pin-label">{t.spaceApp.labelField}</label>
        <input
          id="pin-label"
          type="text"
          value={label}
          maxLength={LABEL_MAX}
          placeholder={t.spaceApp.labelPlaceholder}
          aria-describedby="pin-label-count"
          onChange={(event) => setLabel(event.target.value)}
          required
        />
        <small id="pin-label-count">{t.spaceApp.labelCounter(label.length, LABEL_MAX)}</small>

        <label htmlFor="pin-note">{t.spaceApp.noteField}</label>
        <textarea
          id="pin-note"
          value={note}
          maxLength={NOTE_MAX}
          rows={4}
          placeholder={t.spaceApp.notePlaceholder}
          aria-describedby="pin-note-count pin-hint"
          onChange={(event) => setNote(event.target.value)}
        />
        <small id="pin-note-count">{t.spaceApp.noteCounter(note.length, NOTE_MAX)}</small>

        <p className="notice" id="pin-hint">
          {t.spaceApp.minimizationHint}
        </p>
        <p>
          <small>{t.spaceApp.fairness}</small>
        </p>

        {error ? <p role="alert">{error}</p> : null}

        <div className="actions">
          <button type="submit" aria-busy={submitting} disabled={submitting}>
            {t.spaceApp.save}
          </button>
          {onDelete ? (
            <button type="button" className="danger outline" onClick={onDelete} disabled={submitting}>
              <Icon name="trash" size={18} /> {t.spaceApp.deletePin}
            </button>
          ) : null}
        </div>
      </form>
    </SpacePage>
  );
}
