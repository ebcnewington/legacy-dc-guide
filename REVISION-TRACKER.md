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
11. [~] Interactive historical trivia: **90 source-linked questions** across historical sites; one question at a time, score tracking, finish/restart anytime, discreet ratings, in-game compare, and local progress persistence. Weighted community selection and shared average/player statistics are implemented in the frontend plus a fully coded Google Apps Script/Sheets backend. **Remaining external authorization:** deploy the Apps Script web app under the user's Google account and paste the /exec endpoint in data/trivia-config.json. Until connected, local ratings work, the game remains usable offline, and no imaginary shared statistics are shown.
12. [x] Narrated tour links on 12 individual destination pages where appropriate: official Mount Vernon 29-stop audio tour, NPS Lincoln Memorial brochure, U.S. Capitol Visitor Center 95-minute audio-described Exhibition Hall tour, Museum of the Bible official self-guided app, iOS National Mall GPS audio (App Store 4.6/5, 75 ratings, $16.99 full tour), and Arlington's authorized live-narrated tram (clearly NOT recorded). Links, prices and ratings are based on provider information as of November 8, 2026.

## Additional source-document requirements

- [x] Four-day schedule, including timed Mount Vernon mansion tours, evening memorial loop, Museum of the Bible, Capitol service, hotel break, and Arlington.
- [x] Trip leaders and both hotel addresses/assignments.
- [x] FAQs covering packing, restrooms, walking, security and travel.
- [x] Official maps, food/restroom guidance and destination links.
- [x] Unconfirmed L'Enfant Plaza SW 300-block Wednesday bus pickup prominently marked POSSIBLE / NOT CONFIRMED.
- [x] Dedicated **full-page Notes** sheet facing each Tuesday–Thursday itinerary, plus QR shortcuts to official maps. The PDF maintains **¼-inch minimum safe margins** on all sides.
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

### November 8 · Approved 12-page print edition and trivia revision

Page 1 is the photo cover, page 2 has contacts and hotels, and pages 3–10 pair each day's itinerary with a ruled Notes sheet and its visitor-map QR. Pages 11–12 condense landmarks and FAQs. The physical quarter-inch white borders remain. The cover uses a smaller QR panel and an optically centered logo. Interior headers use the same Capitol photo under a teal gradient. Allow a clear gutter between time labels and itinerary text. Packing, Travel Light and Keep Exploring sections are omitted from print.

The current bank has 90 questions with stable IDs. Review prompts, choices, explanations and linked sources for slavery-related material before adding questions. Favor observable landmark details and source-verifiable history. The print-only itinerary and FAQ wording lives alongside its full version in `data/guide.json`.

### November 8 · Facing-page booklet revision

Monday’s itinerary and National Harbor map share page 3. Tuesday, Wednesday and Thursday each have a left-hand itinerary facing a ruled Notes page (4–5, 6–7 and 8–9). Landmarks and FAQs occupy pages 10 and 11. Page 12 is a photographic back cover with the church logo, tour title and dates.

### Map supplement · print revision

The separate three-sheet 11×17 supplement now uses the booklet’s Capitol-photo header, Montserrat type and quarter-inch white borders. The dining information sits beside the National Harbor map. The original map artwork remains at its original scale, with lossless compression. Continue editing the existing supplement file.


## November 10 — Dynamic trip updates

- [x] Live, timestamped updates from data/updates.json, with Check now, foreground refresh, three-minute polling and offline last-seen cache.
- [x] Previous notices preserved under Trip reminders.
- [x] Trusted GitHub issue publishing template with automatic GitHub Pages rebuild for new, edited and closed updates.
- [x] Avoid calling GitHub's rate-limited issues API from travelers' browsers.
- [x] Service-worker cache v8 includes the updates JSON.


## November 10 — Trip Update refresh + organizer-access preparation

- [x] Show published and, if applicable, revised timestamps on update cards.
- [x] Put Refresh at the top of Trip Updates with a relative "Last refreshed" indicator updated every 20 seconds.
- [x] Retain previously saved update content and indicate offline/error states without falsely claiming a new successful refresh.
- [x] Add a hidden-by-default organizer entry and responsive editor dialog.
- [x] Add independently deployable Google Apps Script publisher with separate PIN+email-OTP logins, throttling and GitHub issue creation.
- [ ] Account owner must privately set Rob and Ashlee's initial PINs, email addresses and narrow GitHub token, deploy Apps Script, and enable data/publisher-config.json; verify both login flows.

## November 10 — Organizer visibility and automatic updates

- [x] Make the organizer lock button persistently visible on the Trip Updates heading.
- [x] Show a setup-required message rather than falsely presenting an operational organizer login while the private Apps Script publisher remains unconfigured.
- [x] Add deployment-specific release metadata, CSS/JS version query strings, and a lightweight client-side update checker.
- [x] Detect new releases on opening, foreground return, connectivity restoration and periodically; auto-navigate once to a cache-busted URL without clearing visitor data.
- [x] Precache update checker in service worker v10, retain offline fallback, preserve hash and local data.
- [ ] Privately configure and deploy organizer publishing, then verify Rob and Ashlee login, two-factor email codes, and a posting test.

## November 10 — Reduce publishing friction

- [x] Replace two-factor organizer sign-in with a single-step four-digit PIN form, branded for in-guide modal use.
- [x] Remove email address/OTP configuration and keep private PIN hashes, retry limits and GitHub write token on server.
- [ ] Account owner must create/deploy the independent Apps Script publisher, set initial PINs privately and connect its /exec URL. Verify a Rob and Ashlee test post. This remains the only activation blocker.

## November 10 — One-file Google Sheets publishing (current)

- [x] Eliminate GitHub issue creation and GitHub token from the in-guide organizer publisher.
- [x] Embed the posting form in a single Google Apps Script Code.gs file.
- [x] Automatically create a private Google Sheet for new organizer updates; only the read-only public JSONP feed is exposed.
- [x] Preserve existing GitHub-based announcements and combine them with new private-sheet entries.
- [x] Add a Copy setup code action to the visible organizer modal.
- [x] Keep separate server-side four-digit PINs for Rob and Ashlee; no email code or GitHub login.
- [ ] Owner creates/deploys the one-file Apps Script and supplies its /exec URL. Both private PINs must be entered in Google Script Properties by the owner. No access is live until verified.

## November 10 — Roll back organizer publisher; keep dynamic updates (CURRENT)

- [x] Remove lock icon, PIN controls, setup modal, and copy-code button from live guide.
- [x] Remove Apps Script publisher integration, external feed merge, private publisher config and publisher source files from repository.
- [x] Preserve existing GitHub issue-driven Trip Updates feed, timestamps, manual Refresh and relative last-refresh indicator.
- [x] Preserve automated Pages deployment, deployment-specific release ID, and online auto-update mechanism with SW cache v12.
- [x] Owner now publishes notices by asking ChatGPT to write a trusted public `[Trip Update]` GitHub issue. Earlier publisher-specific checklist items are retired/superseded, not outstanding tasks.

## November 11 — Schedule expand controls and Wednesday pickup time

- [x] Render header-only schedule items as nonexpandable cards with no + icon; preserve the existing layout and expansion for entries with descriptions, details, links, or destination information.
- [x] Include 3:00 PM with the tentative Wednesday pickup location in the itinerary, Trip reminders, essentials, FAQ and map listing. Preserve the unconfirmed-location warning.
- [x] Align the print booklet's Wednesday pickup note with the 3:00 PM time.
- [x] Increment service-worker cache to v13 so the corrected guide is picked up by returning visitors.

## November 11 — Photo headers and schedule alignment

- [x] Add photo-cover headers for all 13 location cards, using curated Wikimedia Commons images with accessible alt text and linked photographer credits.
- [x] Limit network image requests through 480/720px responsive thumbnails, lazy loading and async decoding; keep a teal fallback if the external photo cannot load.
- [x] Remove the yellow left border from the day's main itinerary heading.
- [x] Center timeline dots on the gray line using one responsive CSS inset variable instead of independent offsets.
- [x] Increase service-worker cache version to v14, preserving all trip updates, trivia, PDF and guide deployment behavior.

## November 11 — Confirmed pickup announcement

- [x] Post user-supplied 3:00 PM pickup announcement as GitHub issue #2, with original map link.
- [x] Remove outdated tentative pickup details and show Air & Space Museum, Jefferson Dr SW, right-hand entrance walkway as confirmed pickup.
- [x] Update itinerary, Essentials, FAQ, map reference, reminders, and booklet.
- [x] Avoid unnecessary apt updates in workflow after recent GitHub runner DNS outage; SW v15.

## November 11 — Capitol Worship announcement (until 7:00 PM EST)

- [x] Post the organizer's Capitol Worship reminder as GitHub issue #3, including ID/security, optional tips for bus driver Todd, and the 5:30 PM meeting in front of AC.
- [x] Close prior 3:00 PM pickup update issue #2 and remove its now-stale static Trip reminder.
- [x] Add optional `expires_at` metadata to issue-driven updates; the builder omits already expired posts.
- [x] Have the guide hide expiring updates automatically at the deadline, including saved offline copies.
- [x] Expiry for issue #3: 2026-11-12T00:00:00Z, i.e. Wednesday Nov 11 at 7:00 PM Eastern.
- [x] Increment service-worker cache to v16.

## November 12 — Retire initial departure reminder

- [x] Remove `Please read before departure` reminder from static Trip reminders; preserve schedule and other content.
- [x] Retain the conditional section heading and Trip Updates functionality.
- [x] Bump service-worker cache to v17.
