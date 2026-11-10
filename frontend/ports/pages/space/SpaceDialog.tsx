import { useEffect, useId, useRef, type PropsWithChildren } from "react";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

interface SpaceDialogProps {
  title: string;
  onClose: () => void;
  role?: "dialog" | "alertdialog";
  /** "sheet" docks the dialog to the bottom of a phone screen (app.css). */
  variant?: "modal" | "sheet";
  /** A line under the title. */
  subtitle?: string;
}

// A modal built on the native <dialog> element, in Pico's modal markup
// (<article> with a <header> holding the close button).
// showModal() gives, with no extra code: a real focus trap, the rest of the
// page made inert (so screen readers and Tab can't reach behind it), Escape
// to close, a backdrop, and focus returned to whatever opened it on close.
// The dialog is labelled by its visible title; put `data-autofocus` on the
// control that should get focus first (a form's first field, or the safe
// button of an alertdialog).
export default function SpaceDialog({
  title,
  onClose,
  role = "dialog",
  variant = "modal",
  subtitle,
  children,
}: PropsWithChildren<SpaceDialogProps>) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || dialog.open) return; // StrictMode runs this twice on the same element
    dialog.showModal();
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      role={role}
      aria-labelledby={titleId}
      onClose={onClose}
      className={variant === "sheet" ? "sheet" : undefined}
    >
      <article>
        <header>
          <button type="button" rel="prev" aria-label={t.common.close} onClick={onClose} />
          <h2 id={titleId}>{title}</h2>
          {subtitle ? <small>{subtitle}</small> : null}
        </header>
        {children}
      </article>
    </dialog>
  );
}
