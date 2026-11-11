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
