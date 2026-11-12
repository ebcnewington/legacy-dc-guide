# Washington Legacy Tour | November 9–12, 2026

A mobile-first, installable travel companion for Emmanuel Baptist Church's Legacy Group, published through the church's own GitHub organization.

**Website:** https://ebcnewington.github.io/legacy-dc-guide/  
**Printable half-sheet PDF:** https://ebcnewington.github.io/legacy-dc-guide/guide-half-sheet.pdf  
**Automated deployment:** .github/workflows/deploy.yml

## What's included

- Complete four-day timed itinerary with expandable activity notes and directions.
- Two National Harbor hotels, bus logistics and contacts for Ashlee Dickerson and Pastor Rob Brown.
- Frequently asked questions on walking, restrooms, security and packing.
- Thirteen location cards, official visitor resources, maps and audio-tour links. Verified iOS audio app ratings appear only where provider rating data was found.
- A **90-question** trivia game with source-linked explanations, 4 answer choices, continuous scoring, local progress, optional one-to-five-star ratings, play-anytime/quit-anytime and optional score comparison.
- 12-page full-color half-sheet PDF, portrait **5.5 × 8.5 inches** with **¼-inch minimum safe margins**, **right-hand Notes pages for Tuesday through Thursday** and a photographic back cover, travel schedule, contacts, QR maps and a cover QR code to the online guide.
- Capitol-themed home-screen icon and offline-first reading of previously loaded site assets.
- Responsive layout and reduced-motion support.

## Updating the guide

The PDF uses optional `printDescription` and `printAnswer` fields for concise itinerary and FAQ copy. Update those fields alongside the full text when the underlying facts change.

For schedule corrections, announcements, contact changes or destinations, edit `data/guide.json` and commit to `main`. The website and PDF rebuild automatically.

`data/trivia.json` contains the first 28 trivia questions and `data/trivia-extra.json` contains 62 additional questions. Together they make the 90-question library. Every question includes `placeId`, `correctIndex`, `explanation` and a direct primary-source URL.

The website is public. Do not place private participant information in these files. The 300 block of L'Enfant Plaza SW is **only a possible Wednesday bus pickup point**; it must not be presented as confirmed without a new instruction from trip leadership.

## Shared ratings and score comparison

The recommended shared backend is now **Google Apps Script + a private Google Sheet**, with code in `google-apps-script/`. It can run from a personal Google account without needing Emmanuel's Workspace administrator. It is **not live until its web app is deployed**. Until activated, trivia is playable, star ratings persist on the current device, and group averages are explicitly unavailable.

See `google-apps-script/README.md` for the one-time setup. The owner runs `setupTriviaBackend`, deploys the web app for anonymous access, then pastes the `/exec` URL into `data/trivia-config.json`. The frontend will automatically use aggregate scores and shared question ratings. Earlier optional Cloudflare code remains in `api/` but is not required.

## Fonts and imagery

Brand colors: Dark Teal `#044F56`, Gold `#FFAE05`, Near Black `#232323`, Light Teal `#7BC2C8`, Cream `#EDE0CA`. The UI uses Montserrat via Google Fonts. The PDF builder embeds open-source Montserrat when reachable, with a safe fallback. Meno Banner is used as the display-family declaration with a Georgia fallback; it is **not** embedded or distributed from the public repository, pending verified webfont rights. See `BRAND-REFERENCE.md` and `PHOTO-CREDITS.md`.

## Quality gates

Every deployment validates `app.js`, `api/worker.js`, the complete trivia library, itinerary JSON, unique question IDs and generated PDF presence. A failed build does not publish. Changes to the main branch automatically trigger GitHub Pages deployment.

## Print map supplement

A separate high-resolution **11×17 inch** map supplement based on the source maps provided for the tour has been prepared as a downloadable PDF in the project conversation. It is not included in the public website repository because the source map PDFs were delivered as user attachments rather than repository assets.

The permanent twelve-item revision checklist is maintained in `REVISION-TRACKER.md`.

## iPhone home-screen installation

The website now provides a dedicated root-level `apple-touch-icon.png` featuring the U.S. Capitol photograph. If your old iPhone shortcut displays a black **W**, remove that old **Home Screen shortcut** (this doesn't delete the website or its data), open the online guide in **Safari**, tap **Share → Add to Home Screen**, and add it again. iOS may cache an old icon until the shortcut is recreated. The close button on place details uses a clean SVG and keyboard-only focus outline.


## Publishing live trip updates

Trip updates come from trusted GitHub issues; the existing announcements remain as Trip reminders in data/guide.json. Travelers need no GitHub accounts. The guide reads data/updates.json on opening, returning to the app, every three minutes while visible, and when Refresh is tapped. Previously loaded notices are cached for offline access.

To publish a new announcement, send the title and message to ChatGPT in the Ministry Tools Development project and ask it to publish the Legacy Tour Trip Update. ChatGPT uses the connected GitHub integration to create or revise a public `[Trip Update]` issue; the existing GitHub Actions workflow then rebuilds the public feed. The owner can also use the issue template directly. Never post confidential traveler information.

GitHub Actions redeploys the guide when an authorized issue changes and builds a static feed with scripts/build_updates.py. This prevents GitHub API rate limiting for travelers. Changes appear after the publishing workflow completes.


## Automatic website releases (November 10)

Visitors **never need to clear browser history, cookies, or cache** to receive updated content. Each GitHub Pages deployment is stamped with a unique workflow run ID, including deployments triggered by new/edited trip announcements. The published HTML references versioned CSS and JavaScript files and ships a matching `data/site-version.json`. The small `update-check.js` checks the current release on opening and whenever a user returns to the guide, as well as periodically. When a newer release is available online, it navigates once to a cache-busted URL, preserving the current tab/hash and existing browser storage. The service worker continues to cache previously viewed resources for offline use.

**Limitations:** A website cannot modify a completely closed browser, nor retroactively make a previously loaded older JavaScript bundle run a new update-checker. Users already holding an older page in memory may need to close/reopen the guide or refresh it once to acquire the new update-checker; they still never need to delete browsing data. Newer releases automatically check on return. The update check requires a network connection; the installed guide remains available from offline cache.


## Publishing approach (November 10 — current)

**There is no in-guide organizer login or standalone publisher.** All organizer-only PIN, modal, Google Apps Script and Google Sheet publisher experiments have been intentionally removed at the owner's request. To update the feed, simply ask ChatGPT to publish a Trip Update to the connected `ebcnewington/legacy-dc-guide` GitHub repository. Existing announcements and the live refresh UI remain unchanged. For issue-tracked publication, use the `.github/ISSUE_TEMPLATE/trip-update.md` template or create an issue with the `[Trip Update]` prefix. Every new or edited authorized issue triggers GitHub Pages deployment; visitors do not need to clear caches or data.

## Destination photo headers (November 11)

All 13 **Places** cards use distinctive, individually sourced destination photography in their header area. Source photographs are linked through the Wikimedia Commons thumbnail CDN at **480 and 720 pixels** wide, chosen responsively with `srcset` / `sizes` rather than downloading multi-megabyte originals. Photos use lazy loading and asynchronous decoding, retain the teal gradient when unavailable, and include a discreet photographer credit linked to the source file and full licensing information. The source/credit metadata is stored alongside each place in `data/guide.json`. The image files are not bundled into the PDF.

The itinerary day heading no longer has a decorative yellow left border. Its timeline dots use one shared `--timeline-inset` variable and a 50% transform to center each marker on the gray vertical line at desktop and mobile sizes. The service worker has been bumped to v14.

## November 11 — confirmed 3:00 PM hotel-break pickup

The tentative L’Enfant Plaza bus pickup has been superseded. Wednesday's **3:00 PM hotel-break pickup** is confirmed at the **Air & Space Museum**, on the **large walkway to the right of the entrance, along Jefferson Dr SW**. User-provided map: https://clr.cm/wbWW. Only travelers returning to the hotels before the Capitol visit need to use this pickup. The itinerary, Essentials, FAQs, map, reminder and printed booklet note have been updated. GitHub issue #2 contains the original trip announcement. Service-worker cache v15.

## November 11 — time-limited updates

Active `[Trip Update]` issues may carry `<!-- expires_at: YYYY-MM-DDTHH:MM:SSZ -->` in their body. `scripts/build_updates.py` omits already expired issues and emits `expires_at` for future expirations. The app renders only currently active notices and schedules a browser timer to remove them at their precise expiration, even while offline or left open. This does **not require** the issue to be closed at the cutoff, though issue closure remains good housekeeping. Existing posts without expiration are unaffected. Issue #3 contains the Capitol Worship notice, set to expire at **2026-11-12T00:00:00Z (7:00 PM EST November 11)**. Previous 3:00 PM pickup issue #2 was closed and its stale static Trip reminder removed; itinerary and confirmed map remain for reference. Service worker v16.

## November 12 — Trip Updates only

The legacy **Trip reminders** section has been removed from the home screen and its rendering/data paths. The current **Trip updates** component remains in place with issue-driven publishing, expiry-aware notices, last-refresh status, refresh button, and offline-safe cached updates. Do not restore the retired static announcements component unless requested. Service worker v18.

## November 12 — Mobile pull to refresh

The live guide now supports a custom **pull-to-refresh** gesture for touch-capable devices, including iPhone Home Screen installations. Pull downward while already at the **top of a page**, then release when the branded indicator says “Release to refresh.” The gesture reuses the existing Trip Updates refresh request plus the site's deploy-version checker (which automatically reloads only if a new release exists). It does not reset current trivia progress or alter itinerary/places state unless an actual new deployment needs loading.

The handler is defined in `pull-refresh.js`. It activates only on a one-finger downward gesture starting at the page top, excludes active controls/dialogs and nested scrollers, and does not intercept horizontal or upward navigation. A responsive floating status indicator shows pulling, refreshing and success/failure states; reduced-motion preferences are honored. On compatible touch browsers the root overscroll behavior is contained to avoid competing with a browser-native refresh. The existing **Refresh** button remains accessible as a fallback in all browsers. JavaScript gesture tests live in `tests/pull-refresh.test.mjs` and run during CI validation. Service worker v19 precaches the gesture script. Real-device Safari and installed-PWA feel should be verified after deployment.

## November 12 — Photo visibility and pull animation refinement

The Places photo-cover problem was traced to **negative z-index stacking**. The photographs were being placed behind the opaque teal card background rather than above it. Cover layering is now explicit: image z-index 0, readable gradient overlay 1, and badges/attribution 2. Wikimedia image requests retry against the alternate Wikimedia thumbnail CDN if the first host fails, keeping the compact 480/720px images and the teal fallback. The 13 existing verified Wikimedia source photos, credits and site content are preserved.

The mobile pull-to-refresh animation now uses a **true centered SVG** with concentric circular track/spinner, an aligned down arrow, and success checkmark, replacing the off-center rotating text glyph. The status card is a consistent **194px × 82px** regardless of caption length or refresh state, with a vertically centered icon/caption stack, unchanged gesture threshold, and reduced-motion support. Service worker v20; normal cache/version auto-refresh continues.

## November 12 — Self-hosted optimized location photographs (permanent repair)

The original direct Wikimedia thumbnail links have not displayed reliably in the mobile guide, even after CSS layering fixes. **The guide no longer loads destination images from Wikimedia at viewing time.** Its `data/guide.json` now references locally served `assets/places/<place-id>-480.webp` and `-720.webp` files, with descriptive source/credit metadata and the Commons original URL `remote_src` retained for the image build. A new `scripts/build_place_photos.py` step fetches those photos only during the GitHub Actions deployment, resizes/crops with Pillow to 16:9 and compresses to WebP. An automated build gate opens and verifies all 26 files and their dimensions; deployment **fails visibly** if any image source cannot be downloaded, rather than silently showing blank cards. The first three visible cards load eagerly; others remain lazy. No new client dependency or external cross-origin image request is required. Files will be cached after first visit by the existing service worker. SW cache v21.

## November 12 — Consistent action-button margins

Standard action links now use a shared `.link-row` wrapper with a consistent 10px gap and 16px top / 10px bottom margins across Travel Essentials, expanded itinerary entries and place-details dialogs. The itinerary's previously standalone **Explore destination** link now joins the Directions/Website/Visitor Map links in the same row so wrapped links retain even spacing. Audio-guide links in the Place details dialog also use the same container. **Details & directions** buttons on photo cards have a dedicated `.place-card-actions` container, guaranteeing a 16px gap above the button and preserving its full width and the card's existing 20px padding. No change to navigation or destinations. Cache version v22.
