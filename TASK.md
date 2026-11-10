# TASK: Turn the Halloween map into an open-source kit any community can run

The value: an opt-in map that protects the neighbors who aren't into
Halloween. Families ring only where there's a pin: no pin, no ring.

## Where things stand (2026-11-09)

- The 2026 Meckenhausen event is over. The thank-you went out, the data was
  purged at 00:01 on 1 November, the Hetzner server is deleted and the
  `halloween-api.cowglow.io` DNS record is removed.
- https://halloween.cowglow.io (GitHub Pages) shows the project review
  (`#/review`); every app route redirects there.
- The repo is private. No secrets were ever committed (`cert/` and
  `deploy/hetzner/config.env` are ignored).

## Decisions (Philip, 2026-11-09)

- The repo becomes **public**, after the turn-key refactor and a privacy pass.
- The app stays in the repo, so people can fork and run it. The deployed
  site becomes a **static project site** with no backend: documentation, an
  in-browser **demo**, and the **share page** as an example of community
  outreach.
- The demo uses the self-hosted demo tiles. Visitors add houses by tapping
  the map. No default markers (they would be someone's real data), and
  nothing leaves the browser.
- Remove the **custom domain**: the site lives at its GitHub Pages address.
- Recommend Hetzner, but keep the deploy instructions and boilerplate
  generic enough for any server with Docker.
- The privacy notice becomes plain legal text for the example, without the
  change log; the change log's ideas come back on the site as the privacy
  design.
- The generic address in examples, texts and images is
  `https://halloween.domain.com`.
- **Printing the map** is a feature still to add.

## Steps, in order

1. ~~**The evening's numbers**~~ (done 2026-11-09): 12 houses, counted by
   Philip; the server's logs weren't kept, and there's no feedback to quote.
   The Hetzner deploy job and the backend-up/down workflows are gone (the
   old server address now belongs to someone else), and the e2e stack runs
   with a far-future event end so CI keeps passing after the event.
2. ~~**Tap to place a house**~~ (done 2026-11-09): a tap jumps the map so
   the tapped spot is under the pumpkin.
3. ~~**Turn-key refactor**~~ (done 2026-11-09: community config, privacy
   template, docs/SELF_HOSTING.md): one community config (name, slug, boundary,
   center and zoom, tiles file, event end and time zone, languages, email
   sender and texts) read by frontend and backend; Meckenhausen becomes the
   example config; no other place names Meckenhausen. Generic deploy:
   Docker Compose + Caddy on any server, with Hetzner as one documented
   option; the Hetzner-only deploy job goes.
4. ~~**Project site**~~ (done 2026-11-09): the problem and the value, how it works, privacy by
   design, the 2026 story and numbers, how to run it for your community,
   and the roadmap; the demo map; the share page. Remove `public/CNAME`.
   Deploy builds only the site.
5. **Privacy pass, then public.** Done 2026-11-09: the current files are
   clean (no keys or tokens ever committed; a neighbor's email address and
   the server IPs removed from the WORKLOG; the e2e seed email is a
   placeholder), README and CONTRIBUTING.md are written for the public.
   Then (2026-11-10): MIT license; the git history rewritten with
   `git filter-repo --replace-text` (the neighbor's address and the server
   IPs replaced in every commit) and force-pushed. The `.env.example` files
   stay as they are (Philip's call).
   Old secrets and DNS records removed (Philip). Pull requests keep the old
   commits, so the repo started again from one commit; the old one is the
   private `-archive`. Left for Philip: switch the repo to public.

## Roadmap, for whoever forks it

- Print the map (for neighbors without a smartphone, or to hang up).
- Move the Docker image off Node 22 to the current LTS (unblocks
  dependabot #8).
- `erase:participant` deletes only unaccepted invites before the participant
  row: it fails for someone whose invitee has joined, and leaves invites
  addressed to the erased person.

## Teardown leftovers (`docs/TEARDOWN.md`)

- GitHub secrets: the HETZNER_*, POSTGRES_*, SPACE_JWT_SECRET ones. The
  Resend key is shared with the visual directory: don't revoke it there.
- Local copies (step 5).
