import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpaceDialog from "ports/pages/space/SpaceDialog.tsx";

// The evening's unwritten rules, for the families walking around: pops up
// the first time the map opens in this browser (MapHomePage) and stays in
// the menu. The first two carry the "No pin, no ring" campaign, with the
// lit pumpkin as the sign for houses that didn't make it onto the map.
// No autofocus on the button: focusing it would scroll a phone straight
// past the first rule, the one that matters most.
export default function RulesDialog({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <SpaceDialog title={t.spaceRules.title} subtitle={t.spaceRules.intro} onClose={onClose}>
      <ol className="steps">
        {t.spaceRules.rules.map((rule) => (
          <li key={rule.title}>
            <strong>{rule.title}</strong>
            <p>{rule.text}</p>
          </li>
        ))}
      </ol>
      <footer>
        <button type="button" onClick={onClose}>
          {t.spaceRules.done}
        </button>
      </footer>
    </SpaceDialog>
  );
}
