import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  fetchLocationsRevalidated,
  getSpaceSession,
  setSpaceSession,
  spaceApiFetch,
  SpaceApiError,
  SpaceEventEndedError,
  toSpaceSession,
  type SpaceAuthResponse,
  type SpaceSession,
} from "infrastructure/api/space-api-client.ts";
import type { Space, SpaceLocation } from "domain/space/space.types.ts";
import { readCachedLocations, writeCachedLocations } from "infrastructure/space-cache/location-cache.ts";
import { forgetSpaceLocally } from "infrastructure/space-cache/forget-space.ts";
import { readCachedSpace, writeCachedSpace } from "infrastructure/space-cache/space-info-cache.ts";
import PinPlacement from "ports/pages/space/PinPlacement.tsx";
import LocationForm from "ports/pages/space/LocationForm.tsx";
import LocationsMapView from "ports/pages/space/LocationsMapView.tsx";
import LocationsListView from "ports/pages/space/LocationsListView.tsx";
import InviteDialog from "ports/pages/space/InviteDialog.tsx";
import AccessRequestsDialog, {
  type AccessRequest,
  type AnsweredAccessRequest,
} from "ports/pages/space/AccessRequestsDialog.tsx";
import DeletePinDialog from "ports/pages/space/DeletePinDialog.tsx";
import SpacePage from "ports/pages/space/SpacePage.tsx";
import RemoveMeDialog from "ports/pages/space/RemoveMeDialog.tsx";
import MenuSheet from "ports/pages/space/MenuSheet.tsx";
import WelcomeView from "ports/pages/space/WelcomeView.tsx";
import RulesDialog from "ports/pages/space/RulesDialog.tsx";
import { hasSeenRules, markRulesSeen } from "infrastructure/space-cache/rules-seen.ts";
import { Icon, Pumpkin } from "ports/pages/space/Icons.tsx";
import { apiErrorMessage } from "ports/pages/space/api-error-message.ts";
import { spacePaths } from "ports/pages/space/space-routes.ts";
import { useTranslation } from "ports/context/i18n/i18n.hook.ts";

type Mode = "view" | "placing" | "form";

export default function MapHomePage() {
  const { spaceSlug = "" } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, language } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const [space, setSpace] = useState<Space | null>(null);
  // Load failures are kept as the error itself and translated when rendered,
  // so switching language also switches an error that's already showing.
  const [spaceError, setSpaceError] = useState<unknown>(null);
  const [session, setSession] = useState<SpaceSession | null>(() => getSpaceSession(spaceSlug));
  const [eventEnded, setEventEnded] = useState(false);

  const [email, setEmail] = useState("");
  const [magicLinkStatus, setMagicLinkStatus] = useState<"idle" | "pending" | "sent" | "failed">("idle");
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);

  const [locations, setLocations] = useState<SpaceLocation[] | null>(null);
  const [locationsError, setLocationsError] = useState<unknown>(null);
  const [view, setView] = useState<"map" | "list">("map");

  const [mode, setMode] = useState<Mode>("view");
  const [placedCoords, setPlacedCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [answeredRequests, setAnsweredRequests] = useState<AnsweredAccessRequest[]>([]);
  const [showAccessRequests, setShowAccessRequests] = useState(false);
  const [showDeletePin, setShowDeletePin] = useState(false);
  const [showRemoveMe, setShowRemoveMe] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  // The trick-or-treat rules pop up the first time the map opens here.
  const [showRules, setShowRules] = useState(() => !hasSeenRules(spaceSlug));
  // Set by InviteAcceptPage right after a new participant joins.
  const [showWelcome, setShowWelcome] = useState(() => Boolean((location.state as { welcome?: boolean } | null)?.welcome));

  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Tell the server which language this person uses the app in, so their
  // emails (the thank-you above all) come in it: on opening the map and on
  // every change. Best effort: a failure changes nothing on screen.
  const sessionParticipantId = session?.participantId;
  useEffect(() => {
    if (!sessionParticipantId) return;
    spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/me/language`, {
      method: "PUT",
      body: JSON.stringify({ language }),
    }).catch(() => undefined);
  }, [spaceSlug, sessionParticipantId, language]);

  // Sign-out, 401, "Remove me" and 410 all drop everything this browser holds
  // for the space (docs/SPEC.md section 6).
  const forget = useCallback(async () => {
    await forgetSpaceLocally(spaceSlug);
    setSession(null);
    setLocations(null);
  }, [spaceSlug]);

  // A write's 401 (session gone) or 410 (event over) ends the session the
  // same way a failed read does. Returns whether it handled the error.
  const handleSessionLoss = useCallback(
    async (err: unknown) => {
      if (err instanceof SpaceEventEndedError) {
        setEventEnded(true);
        await forget();
        return true;
      }
      if (err instanceof SpaceApiError && err.status === 401) {
        await forget();
        return true;
      }
      return false;
    },
    [forget],
  );

  // Public, no session needed - just to show its name and to 404 cleanly on a
  // bad link.
  useEffect(() => {
    let cancelled = false;
    spaceApiFetch<{ space: Space }>(null, `/spaces/${spaceSlug}`)
      .then((result) => {
        if (cancelled) return;
        setSpace(result.space);
        writeCachedSpace(result.space);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof SpaceEventEndedError) {
          setEventEnded(true);
          void forget();
          return;
        }
        // Status 0 = the server was unreachable (offline). Render from the last good copy
        // instead of failing the whole page; the pins come from the IndexedDB cache.
        const cached = err instanceof SpaceApiError && err.status === 0 ? readCachedSpace(spaceSlug) : null;
        if (cached) {
          setSpace(cached);
          return;
        }
        setSpaceError(err ?? new Error("load failed"));
      });
    return () => {
      cancelled = true;
    };
  }, [spaceSlug, forget]);

  // A returning-participant magic-link landing (?token=): verify and store
  // the session. Invite-acceptance is a *different* route/page
  // (InviteAcceptPage.tsx) since it needs the consent step first.
  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) return;
    setSearchParams((params) => {
      params.delete("token");
      return params;
    });
    spaceApiFetch<SpaceAuthResponse>(spaceSlug, `/spaces/${spaceSlug}/verify`, {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((result) => {
        const next = toSpaceSession(result);
        setSpaceSession(spaceSlug, next);
        setSession(next);
      })
      .catch(() => {
        setMagicLinkError(t.spaceApp.signInFailed);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // docs/SPEC.md section 6: serve the IndexedDB cache first, then revalidate with
  // a conditional (ETag/If-None-Match) request - on a 304 the cache is
  // already correct and nothing re-renders with new data; on a real change
  // the fresh copy replaces both the on-screen state and the cache. Called on
  // session start (once per session, satisfying that half of "at most once
  // per session or per N hours"), after the user's own create/edit/delete
  // (loadLocations() below), and from the explicit refresh button.
  const loadLocations = useCallback(async () => {
    if (!session) return;
    const cached = await readCachedLocations(spaceSlug);
    try {
      const result = await fetchLocationsRevalidated(spaceSlug, cached?.etag ?? null);
      if (result.status === "ok") {
        setLocations(result.locations);
        await writeCachedLocations(spaceSlug, result.locations, result.etag);
      } else if (cached) {
        setLocations(cached.locations);
      }
    } catch (err) {
      if (await handleSessionLoss(err)) return;
      // Offline/unreachable: serve the last-known cache rather than an error
      // screen.
      if (cached) {
        setLocations(cached.locations);
      } else {
        setLocationsError(err ?? new Error("load failed"));
      }
    }
  }, [session, spaceSlug, handleSessionLoss]);

  useEffect(() => {
    if (!session) return;
    readCachedLocations(spaceSlug).then((cached) => {
      if (cached) setLocations(cached.locations);
    });
    // loadLocations only sets state after awaiting IndexedDB and the network,
    // which the rule can't see through the useCallback.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, spaceSlug]);

  // Requests to join, for participants: loaded with the map and after each
  // answer. A failure just leaves the list as it was; it's not worth an error
  // on the map screen.
  const isParticipantSession = session?.role === "participant";
  const loadAccessRequests = useCallback(async () => {
    if (!isParticipantSession) return;
    try {
      const result = await spaceApiFetch<{ requests: AccessRequest[]; answered?: AnsweredAccessRequest[] }>(
        spaceSlug,
        `/spaces/${spaceSlug}/access-requests`,
      );
      setAccessRequests(result.requests);
      setAnsweredRequests(result.answered ?? []);
    } catch (err) {
      await handleSessionLoss(err);
    }
  }, [isParticipantSession, spaceSlug, handleSessionLoss]);

  useEffect(() => {
    // Sets state only after the fetch resolves (same as loadLocations above).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAccessRequests();
  }, [loadAccessRequests]);

  const myLocation = useMemo(
    () => locations?.find((location) => location.participantId === session?.participantId) ?? null,
    [locations, session],
  );

  const handleRequestLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setMagicLinkStatus("pending");
    setMagicLinkError(null);
    try {
      const result = await spaceApiFetch<{ message: string; devToken?: string }>(null, `/spaces/${spaceSlug}/magic-link`, {
        method: "POST",
        // The link, and this participant's later emails, come in this language.
        body: JSON.stringify({ email, language }),
      });
      if (result.devToken) {
        const verifyResult = await spaceApiFetch<SpaceAuthResponse>(
          spaceSlug,
          `/spaces/${spaceSlug}/verify`,
          { method: "POST", body: JSON.stringify({ token: result.devToken }) },
        );
        const next = toSpaceSession(verifyResult);
        setSpaceSession(spaceSlug, next);
        setSession(next);
        setMagicLinkStatus("idle");
      } else {
        setMagicLinkStatus("sent");
      }
    } catch (err) {
      setMagicLinkStatus("failed");
      setMagicLinkError(apiErrorMessage(err, t, t.spaceApp.signInRequestFailed));
    }
  };

  const handleSignOut = () => {
    void forget();
  };

  const handleConfirmPlacement = (coords: { lat: number; lng: number }) => {
    setPlacedCoords(coords);
    setMode("form");
  };

  const handleSaveLocation = async (input: { label: string; note: string }) => {
    if (!placedCoords) return;
    setSavingLocation(true);
    setSaveError(null);
    try {
      const method = myLocation ? "PATCH" : "POST";
      const path = myLocation ? `/spaces/${spaceSlug}/locations/${myLocation.id}` : `/spaces/${spaceSlug}/locations`;
      await spaceApiFetch(spaceSlug, path, { method, body: JSON.stringify({ ...input, ...placedCoords }) });
      // Reload before going back to the map: the map fits its view to the
      // houses it opens with, so opening it on the old list left the moved
      // (or new) house out of view until something rebuilt the map.
      await loadLocations();
      setMode("view");
      setPlacedCoords(null);
    } catch (err) {
      if (await handleSessionLoss(err)) return;
      setSaveError(apiErrorMessage(err, t, t.spaceApp.saveFailed));
    } finally {
      setSavingLocation(false);
    }
  };

  const handleDeletePin = async () => {
    if (!myLocation) return;
    setShowDeletePin(false);
    try {
      await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/locations/${myLocation.id}`, { method: "DELETE" });
      await loadLocations(); // same reason as in handleSaveLocation
      setMode("view");
    } catch (err) {
      if (await handleSessionLoss(err)) return;
      setSaveError(t.spaceApp.saveFailed);
    }
  };

  const handleRemoveMe = async () => {
    await spaceApiFetch(spaceSlug, `/spaces/${spaceSlug}/me`, { method: "DELETE" });
    await forget();
    setShowRemoveMe(false);
  };

  // The welcome screen shows once: drop the flag from this history entry too,
  // so a reload doesn't bring it back.
  const dismissWelcome = () => {
    setShowWelcome(false);
    navigate(location.pathname, { replace: true, state: null });
  };

  const title = space?.name ?? spaceSlug;

  if (eventEnded) {
    return (
      <SpacePage title={title} privacyLinkFor={spaceSlug}>
        <p>{t.spaceApp.eventEnded}</p>
      </SpacePage>
    );
  }

  if (spaceError) {
    return (
      <SpacePage title={title} privacyLinkFor={spaceSlug}>
        <p role="alert">{apiErrorMessage(spaceError, t, t.spaceApp.loadSpaceFailed)}</p>
      </SpacePage>
    );
  }

  if (!space) {
    return (
      <SpacePage title={title} privacyLinkFor={spaceSlug}>
        <p aria-busy="true">{t.spaceApp.loading}</p>
      </SpacePage>
    );
  }

  if (!session) {
    return (
      <SpacePage>
        <hgroup className="hero">
          <Pumpkin size={96} face />
          <h1>{t.spaceApp.signInTitle}</h1>
          <p>{t.spaceApp.signInIntro}</p>
        </hgroup>
        {magicLinkStatus === "sent" ? (
          <p role="status" className="notice">
            {t.spaceApp.signInSent}
          </p>
        ) : (
          <form onSubmit={handleRequestLink}>
            <label htmlFor="space-email">{t.spaceApp.signInEmail}</label>
            <input
              id="space-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <div className="actions">
              <button type="submit" aria-busy={magicLinkStatus === "pending"} disabled={magicLinkStatus === "pending"}>
                {t.spaceApp.signInSubmit}
              </button>
            </div>
            {magicLinkStatus === "failed" ? <p role="alert">{magicLinkError}</p> : null}
          </form>
        )}
        {magicLinkError && magicLinkStatus !== "failed" ? <p role="alert">{magicLinkError}</p> : null}
        <p className="center">
          <Link to={spacePaths.requestAccess(spaceSlug)}>{t.spaceApp.requestAccessLink}</Link>
        </p>
        <p className="center">
          <Link to={spacePaths.privacy(spaceSlug)}>{t.spaceApp.privacyLink}</Link>
        </p>
      </SpacePage>
    );
  }

  const isParticipant = session.role === "participant";

  let screen;
  if (mode === "placing") {
    screen = (
      <PinPlacement initial={myLocation ?? undefined} onConfirm={handleConfirmPlacement} onCancel={() => setMode("view")} />
    );
  } else if (mode === "form" && placedCoords) {
    screen = (
      <LocationForm
        initialLabel={myLocation?.label}
        initialNote={myLocation?.note}
        onSubmit={handleSaveLocation}
        onBack={() => setMode("placing")}
        onDelete={myLocation ? () => setShowDeletePin(true) : undefined}
        submitting={savingLocation}
        error={saveError}
      />
    );
  } else if (showWelcome && isParticipant && !myLocation) {
    screen = (
      <WelcomeView
        onAddHouse={() => {
          dismissWelcome();
          setMode("placing");
        }}
        onLookAround={dismissWelcome}
      />
    );
  } else {
    screen = (
      <div className="map-screen">
        <header className="top-bar">
          <Pumpkin size={30} />
          <div className="grow">
            <h1>{space.name}</h1>
            <small>{t.spaceApp.brandSubtitle}</small>
          </div>
          <button
            type="button"
            className="icon-button secondary outline"
            aria-label={t.spaceApp.refresh}
            onClick={() => {
              void loadLocations();
              void loadAccessRequests();
            }}
          >
            <Icon name="refresh" />
          </button>
          <button
            type="button"
            className="icon-button secondary outline"
            aria-label={t.spaceApp.menu}
            onClick={() => setShowMenu(true)}
          >
            <Icon name="menu" />
          </button>
        </header>

        <div className="map-area">
          {locations === null ? (
            <p className="list-view" aria-busy="true">
              {t.spaceApp.loading}
            </p>
          ) : view === "map" ? (
            <LocationsMapView locations={locations} ownParticipantId={session.participantId} />
          ) : (
            <LocationsListView locations={locations} ownParticipantId={session.participantId} />
          )}

          <div className="floating">
            <div role="group" aria-label={t.spaceApp.viewLabel}>
              <button
                type="button"
                aria-pressed={view === "map"}
                className={view === "map" ? "secondary" : "secondary outline"}
                onClick={() => setView("map")}
              >
                {t.spaceApp.mapView}
              </button>
              <button
                type="button"
                aria-pressed={view === "list"}
                className={view === "list" ? "secondary" : "secondary outline"}
                onClick={() => setView("list")}
              >
                {t.spaceApp.listView}
              </button>
            </div>
            {locations ? <span className="chip">{t.spaceApp.housesCount(locations.length)}</span> : null}
            {isParticipant && accessRequests.length > 0 ? (
              <button type="button" className="secondary" onClick={() => setShowAccessRequests(true)}>
                {t.spaceApp.accessRequestsWaiting(accessRequests.length)}
              </button>
            ) : isParticipant && answeredRequests.length > 0 ? (
              // Nobody waiting, but someone answered in the last day: whoever
              // opens the map from the notice email sees where it went.
              <button type="button" className="secondary outline" onClick={() => setShowAccessRequests(true)}>
                {t.spaceApp.accessRequestsAnswered(answeredRequests.length)}
              </button>
            ) : null}
            {offline ? (
              <p role="alert" className="notice">
                {t.spaceApp.offline}
              </p>
            ) : null}
            {locationsError ? (
              <p role="alert" className="notice">
                {apiErrorMessage(locationsError, t, t.spaceApp.loadPinsFailed)}
              </p>
            ) : null}
            {saveError ? (
              <p role="alert" className="notice">
                {saveError}
              </p>
            ) : null}
          </div>
        </div>

        {isParticipant ? (
          <div className="bottom-bar">
            <div className="actions">
              <button type="button" onClick={() => setMode("placing")}>
                <Icon name={myLocation ? "pin" : "plus"} size={20} /> {myLocation ? t.spaceApp.editPin : t.spaceApp.addPin}
              </button>
              <button type="button" className="secondary outline" onClick={() => setShowInviteDialog(true)}>
                {t.spaceApp.inviteTitle}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <>
      {screen}
      {showRules && mode === "view" && !(showWelcome && isParticipant && !myLocation) ? (
        <RulesDialog
          onClose={() => {
            markRulesSeen(spaceSlug);
            setShowRules(false);
          }}
        />
      ) : null}
      {showMenu ? (
        <MenuSheet
          spaceSlug={spaceSlug}
          role={session.role}
          accessRequestCount={accessRequests.length}
          onInvite={() => {
            setShowMenu(false);
            setShowInviteDialog(true);
          }}
          onAccessRequests={() => {
            setShowMenu(false);
            setShowAccessRequests(true);
          }}
          onRules={() => {
            setShowMenu(false);
            setShowRules(true);
          }}
          onSignOut={() => {
            setShowMenu(false);
            handleSignOut();
          }}
          onRemoveMe={() => {
            setShowMenu(false);
            setShowRemoveMe(true);
          }}
          onClose={() => setShowMenu(false)}
        />
      ) : null}
      {showInviteDialog ? <InviteDialog spaceSlug={spaceSlug} onClose={() => setShowInviteDialog(false)} /> : null}
      {showAccessRequests ? (
        <AccessRequestsDialog
          spaceSlug={spaceSlug}
          requests={accessRequests}
          answered={answeredRequests}
          onChanged={() => void loadAccessRequests()}
          onClose={() => setShowAccessRequests(false)}
        />
      ) : null}
      {showDeletePin ? <DeletePinDialog onConfirm={handleDeletePin} onClose={() => setShowDeletePin(false)} /> : null}
      {showRemoveMe ? <RemoveMeDialog onConfirm={handleRemoveMe} onClose={() => setShowRemoveMe(false)} /> : null}
    </>
  );
}
