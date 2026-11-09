# Washington Legacy Tour — Revision Wish List & Delivery Tracker

**Trip:** November 9–12, 2026
**Maintainer:** Emmanuel Baptist Church, GitHub organization ebcnewington
**Guide:** https://ebcnewington.github.io/legacy-dc-guide/

## Twelve agreed items

1. [x] No italic Washington, D.C. homepage heading. Nonitalic display text. Meno Banner font currently falls back to Georgia; public font embedding requires a suitable web license.
2. [x] Remove the print-spec line below the PDF button.
3. [x] Remove the decorative footer overline “A Guide for the Journey.”
4. [x] Remove the text line below the footer church logo.
5. [x] Prominent PDF QR code to the official online guide.
6. [x] Organization-owned website URL contains no “ChatGPT”; optional custom domain can be added later.
7. [x] Replace cryptic glyph icons with distinct vector icons in home cards and mobile navigation.
8. [x] REMOVE only the tiny category/eyebrow labels, KEEP full-width photographic banners and their main headings. This supersedes any earlier interpretation to remove banners.
9. [x] Remove date pill; substitute “November 9–12, 2026” for “Your travel companion.”
10. [x] Richly designed, full-color 5.5×8.5-inch PDF with quarter-inch safe margins. Photo, dark teal, cream, gold, QR codes, itinerary, contacts, FAQ and notes, no ink-saving requirement.
11. [~] Interactive historical trivia: **97 source-linked questions** across historical sites; one question at a time, score tracking, finish/restart anytime, discreet ratings, in-game compare, and local progress persistence. Weighted community selection and shared average/player statistics are implemented in the frontend plus a fully coded Google Apps Script/Sheets backend. **Remaining external authorization:** deploy the Apps Script web app under the user's Google account and paste the /exec endpoint in data/trivia-config.json. Until connected, local ratings work, the game remains usable offline, and no imaginary shared statistics are shown.
12. [x] Narrated tour links on 12 individual destination pages where appropriate: official Mount Vernon 29-stop audio tour, NPS Lincoln Memorial brochure, U.S. Capitol Visitor Center 95-minute audio-described Exhibition Hall tour, Museum of the Bible official self-guided app, iOS National Mall GPS audio (App Store 4.6/5, 75 ratings, $16.99 full tour), and Arlington's authorized live-narrated tram (clearly NOT recorded). Links, prices and ratings are based on provider information as of November 8, 2026.

## Additional source-document requirements

- [x] Four-day schedule, including timed Mount Vernon mansion tours, evening memorial loop, Museum of the Bible, Capitol service, hotel break, and Arlington.
- [x] Trip leaders and both hotel addresses/assignments.
- [x] FAQs covering packing, restrooms, walking, security and travel.
- [x] Official maps, food/restroom guidance and destination links.
- [x] Unconfirmed L'Enfant Plaza SW 300-block Wednesday bus pickup prominently marked POSSIBLE / NOT CONFIRMED.
- [x] Dedicated **full-page Notes** sheet immediately after *each* day's itinerary, plus QR shortcuts to official maps. The PDF maintains **¼-inch minimum safe margins** on all sides.
- [x] Optional high-resolution 11×17 printable map supplement created from the organizer's provided NPS National Mall, Mount Vernon, National Harbor and bus-company maps. Distributed as a separate PDF attachment; not embedded in GitHub Pages yet.
- [ ] Optional postcard-background integration. The supplied image was reviewed, but the current licensed Capitol photography and official teal/gold brand palette have been retained to preserve the established visual hierarchy. Source artwork was not uploaded to the public GitHub repo.

## Guardrails

GitHub Pages is a static host. The optional Google Apps Script + private Google Sheet service has been written for deployment under a personal Google account; no Cloudflare or Emmanuel Workspace administrator access is required. Its web app still needs authorization and connection before cross-visitor statistics can work. Do not fabricate a community average. No traveler identity should be collected by default. Keep source citations for each trivia answer. Do not present tentative pickup locations as confirmed. Publishing continues automatically from the main branch.

## November 8 iPhone + print refinements

- [x] Replace the iOS popup close character with a true SVG X and remove the mobile blue focus artifact; screen readers and keyboard users retain a visible accessible focus state.
- [x] Generate a photo-based 180×180 Apple touch icon at the site root; increase icon cache version. An older iPhone home-screen shortcut may need to be removed and installed again.
- [x] Confirm PDF cover links to the online guide through a QR code.
- [x] Improve PDF spacing with per-day QR map resources, four full-page ruled notes sheets and an explicit quarter-inch margin minimum.
- [~] Community backend moved from Cloudflare to Google Apps Script + private Google Sheets. Script/code are ready; anonymous web app deployment requires authorization by the owner's Google account.

### November 8 — Physical print border and Apple icon recheck
- [x] Correction: white **¼-inch physical border** enforced by clipping every PDF page, including the cover (not just the text margin).
- [x] Generated multiple 180×180 Capitol PNG filenames, including a fresh cache-busting version; iOS meta links use a direct absolute URL under the GitHub Pages subpath.
- [x] PDF build validation checks the clipping frame on **every page** and checks the fresh Apple image.
- [x] The organizer confirmed the Capitol photo when installing from Safari on iPhone. The black W appeared when installing from Firefox.

### November 8 — Work transition review

- [x] Verified the live guide against `main` at `ee2abed`, checked the 97 unique source-linked questions, played a game through completion and confirmed that its score and star rating survived a reload.
- [x] Inspected the published 23-page booklet, the cover trivia promotion, the four daily Notes pages and the physical white borders. Located the separate three-page 11×17 map supplement.
- [ ] Make offline setup reliable on a fresh visit. In `app.js`, `init()` waits for the guide data before attaching the window load listener that registers `sw.js`. A timing test of the current script produced zero registrations when load fired before the data response, and one when load fired after it. Verify the correction with a fresh browser profile, a delayed data response and an offline reload of the itinerary and trivia.
