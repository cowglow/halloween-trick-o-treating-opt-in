import { Link } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { Pumpkin } from "ports/pages/space/Icons.tsx";
import { spaceAssetPath } from "infrastructure/space-assets/space-asset-url.ts";
import { spacePaths, DEFAULT_SPACE_SLUG } from "ports/pages/space/space-routes.ts";
import { REPO_URL, SETUP_GUIDE_URL, sitePaths } from "ports/pages/site/site-links.ts";
import ExternalLink from "ports/pages/site/ExternalLink.tsx";

// The 2026 pilot, counted by Philip (the server's logs went with it).
const PILOT_HOUSES = 12;

const SCREENSHOTS = ["site/invite.png", "site/map.png", "site/place.png"];

// The project's story and documentation: the problem, the idea, how it
// works, privacy, outreach, the 2026 pilot, how to run it, what's next.
export default function SiteHomePage() {
  const { t } = useTranslation();
  const s = t.spaceSite;
  return (
    <SpacePage>
      <header className="hero site-hero">
        <Pumpkin size={72} face />
        <p className="kicker">{s.kicker}</p>
        <h1>{s.title}</h1>
        <p>{s.lead}</p>
        <div className="actions">
          <Link to={sitePaths.demo} role="button">
            {s.tryDemo}
          </Link>
          <ExternalLink href={REPO_URL} role="button" className="secondary outline">
            {s.getCode}
          </ExternalLink>
        </div>
      </header>

      <h2>{s.problemTitle}</h2>
      <p>{s.problem}</p>

      <h2>{s.ideaTitle}</h2>
      <p>{s.idea}</p>

      <h2>{s.howTitle}</h2>
      <ol className="steps">
        {s.how.map((step) => (
          <li key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
      <div className="site-images">
        {SCREENSHOTS.map((path, i) => (
          <img key={path} src={spaceAssetPath(path)} alt={s.screenshotsAlt[i]} width={780} height={1688} loading="lazy" />
        ))}
      </div>

      <h2>{s.privacyTitle}</h2>
      <ul>
        {s.privacy.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p>
        <Link to={spacePaths.privacy(DEFAULT_SPACE_SLUG)}>{s.privacyExample}</Link>
      </p>

      <h2>{s.outreachTitle}</h2>
      <p>{s.outreach}</p>
      <p>
        <Link to={sitePaths.share}>{s.outreachLink}</Link>
      </p>

      <h2>{s.pilotTitle}</h2>
      <p>{s.pilot(PILOT_HOUSES)}</p>
      <ul className="site-timeline">
        {s.timeline.map((step) => (
          <li key={step.year}>
            <strong>{step.year}</strong> {step.text}
          </li>
        ))}
      </ul>
      <p>{s.effort}</p>

      <h2>{s.runTitle}</h2>
      <ol>
        {s.run.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p>
        <ExternalLink href={SETUP_GUIDE_URL}>{s.runGuide}</ExternalLink>
      </p>

      <h2>{s.nextTitle}</h2>
      <ul>
        {s.next.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p>{s.nextHelp}</p>

      <p>
        <small>
          {s.footer} <ExternalLink href={REPO_URL}>GitHub</ExternalLink>
        </small>
      </p>
    </SpacePage>
  );
}
