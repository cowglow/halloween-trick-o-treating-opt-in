import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";

interface WelcomeViewProps {
  onAddHouse: () => void;
  onLookAround: () => void;
}

// Shown once, right after a participant accepts their invite: what to do
// next, in three steps.
export default function WelcomeView({ onAddHouse, onLookAround }: WelcomeViewProps) {
  const { t } = useTranslation();
  return (
    <SpacePage bare>
      <p className="kicker">{t.spaceApp.welcomeKicker}</p>
      <h1>{t.spaceApp.welcomeTitle}</h1>
      <ol className="steps">
        {t.spaceApp.welcomeSteps.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <div className="actions">
        <button type="button" onClick={onAddHouse}>
          {t.spaceApp.addPin}
        </button>
        <button type="button" className="secondary outline" onClick={onLookAround}>
          {t.spaceApp.welcomeLookAround}
        </button>
      </div>
    </SpacePage>
  );
}
