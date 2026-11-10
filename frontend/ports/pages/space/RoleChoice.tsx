import type { SpaceRole } from "domain/space/space.types.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { Icon } from "ports/pages/space/Icons.tsx";

interface RoleChoiceProps {
  /** Unique per form: the radio group's name and the ids' prefix. */
  name: string;
  role: SpaceRole;
  onChange: (role: SpaceRole) => void;
}

// "They can": who someone is invited as, in Invite neighbors and in
// Requests to join. One card per option, the way the "Who are you
// inviting?" WhatsApp image shows it, because the choice can't be changed
// after they join (a wrong one means "Remove me" and a new invite).
export default function RoleChoice({ name, role, onChange }: RoleChoiceProps) {
  const { t } = useTranslation();
  const options = [
    { value: "participant", icon: "house", label: t.spaceApp.roleParticipant, hint: t.spaceApp.roleParticipantHint },
    { value: "visitor", icon: "eye", label: t.spaceApp.roleVisitor, hint: t.spaceApp.roleVisitorHint },
  ] as const;

  return (
    <fieldset>
      <legend>{t.spaceApp.inviteRole}</legend>
      {options.map((option) => (
        <label key={option.value} className="role-option" htmlFor={`${name}-${option.value}`}>
          <input
            id={`${name}-${option.value}`}
            type="radio"
            name={name}
            checked={role === option.value}
            onChange={() => onChange(option.value)}
            aria-describedby={`${name}-${option.value}-hint`}
          />
          <span>
            <strong>
              <Icon name={option.icon} size={20} /> {option.label}
            </strong>
            <small id={`${name}-${option.value}-hint`}>{option.hint}</small>
          </span>
        </label>
      ))}
      <small className="role-fixed">
        <strong>{t.spaceApp.roleFixedHint}</strong>
      </small>
    </fieldset>
  );
}
