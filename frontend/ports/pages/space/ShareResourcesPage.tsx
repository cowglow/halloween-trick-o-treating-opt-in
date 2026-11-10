import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { spaceAssetPath } from "infrastructure/space-assets/space-asset-url.ts";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import { Icon } from "ports/pages/space/Icons.tsx";
import { SHARE_RESOURCES, shareResourcePath, type ShareResourceId } from "ports/pages/space/share-resources.ts";
import { COMMUNITY } from "domain/community/community-config.ts";

// "Let your neighbors know": the WhatsApp status images (public/whatsapp/,
// rendered from scripts/whatsapp/templates/ by `pnpm images:whatsapp`) in the
// reader's language only, each with its caption, to download or share
// straight to WhatsApp.
export default function ShareResourcesPage() {
  const { t } = useTranslation();
  const { spaceSlug = "" } = useParams();
  const s = t.spaceShare;
  // The link in the captions: where someone without an invite asks to join.
  const requestAccessUrl = `${window.location.origin}${spaceAssetPath("")}#${spacePaths.requestAccess(spaceSlug)}`;

  return (
    <SpacePage title={s.title}>
      <p>{s.intro}</p>
      <ShareResourceList linkUrl={requestAccessUrl} />
      <p>
        <Link to={spacePaths.home(spaceSlug)}>{t.spaceApp.backToMap}</Link>
      </p>
    </SpacePage>
  );
}

/** Every image with its caption; `linkUrl` is the address in the captions. */
export function ShareResourceList({ linkUrl }: { linkUrl: string }) {
  const { t, language } = useTranslation();
  const s = t.spaceShare;
  return (
    <>
      <p>
        <small>{s.mobileHint}</small>
      </p>
      {SHARE_RESOURCES.map((id) => (
        <ShareResource
          key={id}
          id={id}
          src={spaceAssetPath(shareResourcePath(id, language))}
          fileName={`${COMMUNITY.slug}-halloween-${id}-${language}.png`}
          caption={s.resources[id].caption(linkUrl)}
        />
      ))}
    </>
  );
}

function ShareResource({ id, src, fileName, caption }: { id: ShareResourceId; src: string; fileName: string; caption: string }) {
  const { t } = useTranslation();
  const s = t.spaceShare;
  const r = s.resources[id];
  const [status, setStatus] = useState<string | null>(null);
  // Phones that can share files (Android, iOS Safari) get a Share button that
  // hands the image and its text to WhatsApp directly.
  const [canShare] = useState(() => typeof navigator.canShare === "function");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      setStatus(s.copied);
    } catch {
      setStatus(s.copyFailed);
    }
  };

  const share = async () => {
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], fileName, { type: "image/png" });
      if (!navigator.canShare({ files: [file] })) {
        setStatus(null);
        return;
      }
      await navigator.share({ files: [file], text: caption });
    } catch {
      // Cancelled, or not allowed: Download and Copy still work.
    }
  };

  return (
    <article aria-labelledby={`share-${id}`}>
      <h2 id={`share-${id}`}>{r.title}</h2>
      <p>{r.audience}</p>
      <img className="share-preview" src={src} alt={r.alt} width={1080} height={1920} loading="lazy" />
      <div role="group">
        {canShare ? (
          <button type="button" onClick={() => void share()}>
            <Icon name="share" /> {s.share}
          </button>
        ) : null}
        <a href={src} download={fileName} role="button" className={canShare ? "secondary outline" : undefined}>
          <Icon name="download" /> {s.download}
        </a>
      </div>
      <p className="share-caption">{caption}</p>
      <button type="button" className="secondary outline" onClick={() => void copy()}>
        {s.copyText}
      </button>
      {status ? <p role="status">{status}</p> : null}
    </article>
  );
}
