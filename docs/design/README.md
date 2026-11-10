# Design

The design source is the "Halloween Map Mockups" canvas (a Claude Design
artifact): https://claude.ai/artifact/YXWpKawTtePSVAroGidBrc. It is private
to Philip's claude.ai account; share it from the canvas's Share menu to give
someone else access.

These PNGs are exports of that canvas (2026-10-15), kept here so the design
is visible without access to it. They show the mockups as approved on
2026-10-14; the built app differs in small details (for example the Map/List
switch is purple and the top bar has a refresh button). When the canvas
changes, re-export the PNGs.

| File | What |
| --- | --- |
| `01-invite-landing.png` | Invite landing: what the map is, consent, "Join the map" |
| `02-first-visit.png` | Welcome steps after a participant joins |
| `03-map-home.png` | The map home, with a pin's popup |
| `04-add-house-place.png` | Add my house, step 1: place the pin |
| `05-add-house-details.png` | Add my house, step 2: name and note |
| `06-menu.png` | The menu sheet |
| `whatsapp-story-de.png`, `whatsapp-story-en.png` | WhatsApp story (1080 × 1920) announcing the map |
| `whatsapp-story-ask-to-join-de.png`, `whatsapp-story-ask-to-join-en.png` | WhatsApp story (1080 × 1920): the address and how to ask to join (2026-10-26) |
| `whatsapp-story-homes-de.png`, `whatsapp-story-homes-en.png` | WhatsApp story (1080 × 1920): recruiting homes that hand out sweets, from asking to join to placing the pin (2026-10-27; restyled on 2026-10-28 to match "Where's the candy?") |
| `whatsapp-story-ask-to-join-es.png`, `whatsapp-story-homes-es.png` | The Spanish versions of those two (2026-10-28) |
| `whatsapp-story-candy-de.png`, `-en.png`, `-es.png` | "Where's the candy?" from the Mockups canvas, ending in just the address instead of "reply to me", so anyone on the map can post it; the map strip no longer gets squeezed (2026-10-28) |
| `whatsapp-story-quiet-de.png`, `-en.png`, `-es.png` | "Not into Halloween?" / "No pin, no ring": for neighbors who would rather not be rung, and a reminder to families (2026-10-28) |
| `whatsapp-story-roles-de.png`, `-en.png`, `-es.png` | For people on the map: which option to pick when inviting or allowing a request (2026-10-28) |

The same fifteen images (without the `whatsapp-story-` prefix) are in
`public/whatsapp/`, served on the app's "Let your neighbors know" page in the
reader's language. When a story changes on the canvas, re-render it into both
places.

The "ask to join" stories come from a second canvas, "Halloween Map: Ask
to Join": https://claude.ai/artifact/8CMb1zH44cPFTwLHDGsZb6 (also private).
It also has the status captions, with the tappable link to
`https://halloween.cowglow.io/#/meckenhausen/request-access`. The "homes" stories
and their captions are on the same canvas, in a second row. These PNGs
were rendered from its artboards with Playwright and the app's bundled
Fredoka and Nunito fonts.

Phone screens are 390 × 844 at 2× resolution.
