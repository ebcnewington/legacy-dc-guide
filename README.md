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
- A **97-question** trivia game with source-linked explanations, 4 answer choices, continuous scoring, local progress, optional one-to-five-star ratings, play-anytime/quit-anytime and optional score comparison.
- Rich full-color half-sheet PDF, portrait **5.5 × 8.5 inches** with **¼-inch safe margins**, travel schedule, contact information, notes space and QR codes to the guide, trivia and selected official maps.
- Capitol-themed home-screen icon and offline-first reading of previously loaded site assets.
- Responsive layout and reduced-motion support.

## Updating the guide

For schedule corrections, announcements, contact changes or destinations, edit `data/guide.json` and commit to `main`. The website and PDF rebuild automatically.

`data/trivia.json` contains the first 30 trivia questions and `data/trivia-extra.json` contains 67 additional questions. Together they make the 97-question library. Every question includes `placeId`, `correctIndex`, `explanation` and a direct primary-source URL.

The website is public. Do not place private participant information in these files. The 300 block of L'Enfant Plaza SW is **only a possible Wednesday bus pickup point**; it must not be presented as confirmed without a new instruction from trip leadership.

## Shared ratings and score comparison

A separate Cloudflare Worker/D1 backend is complete in `api/`. It is not live yet because no Cloudflare database or Worker deployment credentials have been connected. Until activated, trivia is fully playable, star ratings persist on the visitor's device, and shared averages are explicitly unavailable rather than fabricated.

See `api/README.md` to configure the backend in a church-controlled account. Set the resulting Worker URL in `data/trivia-config.json` and republish. The frontend will automatically begin using true anonymous aggregate scores and ratings.

## Fonts and imagery

Brand colors: Dark Teal `#044F56`, Gold `#FFAE05`, Near Black `#232323`, Light Teal `#7BC2C8`, Cream `#EDE0CA`. The UI uses Montserrat via Google Fonts. The PDF builder embeds open-source Montserrat when reachable, with a safe fallback. Meno Banner is used as the display-family declaration with a Georgia fallback; it is **not** embedded or distributed from the public repository, pending verified webfont rights. See `BRAND-REFERENCE.md` and `PHOTO-CREDITS.md`.

## Quality gates

Every deployment validates `app.js`, `api/worker.js`, the complete trivia library, itinerary JSON, unique question IDs and generated PDF presence. A failed build does not publish. Changes to the main branch automatically trigger GitHub Pages deployment.

## Print map supplement

A separate high-resolution **11×17 inch** map supplement based on the source maps provided for the tour has been prepared as a downloadable PDF in the project conversation. It is not included in the public website repository because the source map PDFs were delivered as user attachments rather than repository assets.

The permanent twelve-item revision checklist is maintained in `REVISION-TRACKER.md`.
