# Anonymous trivia API — deployment and safeguards

**Status:** The app and database schema are complete but **this API is not deployed**. The church's GitHub Pages site cannot securely persist shared ratings or aggregate games by itself. Cloudflare account authorization and a D1 database are required.

## Cloudflare (free-tier capable) setup

1. Create/sign into an organization's Cloudflare account and install Node.js 20+.
2. `cd api && npx wrangler d1 create ebc-legacy-trivia`; copy the returned database ID to `wrangler.toml` (start by copying `wrangler.toml.example`).
3. `npx wrangler d1 execute ebc-legacy-trivia --remote --file=./schema.sql`
4. `npx wrangler secret put RATE_HASH_SECRET` and enter a high-entropy unique secret.
5. `npx wrangler deploy`; copy the resulting HTTPS URL.
6. Edit `../data/trivia-config.json` to set `apiBaseUrl` to that URL, and `status` to `live`; commit. GitHub Pages redeploys and starts using shared stats.

**Verify:** `https://YOUR_WORKER.workers.dev/health` should return `{"ok":true,"service":"legacy-trivia-api"}`. On the main site, `GET /v1/stats` should return numerical averages only after completed scores exist.

## Data and privacy

- No names, emails, phone numbers, IP addresses, or raw device IDs are stored.
- Browser issues an opaque random device token and a new random per-game session UUID. Each is one-way HMAC hashed using a secret before it is stored in D1.
- A device can update its rating of a question rather than generating duplicate votes (per browser storage).
- Hourly IP throttling via **HMAC** of IP+time bucket; the raw IP is never saved. Throttle records can be purged periodically: `DELETE FROM rate_limits WHERE expires_at < datetime('now')`.
- One game session can create at most one recorded completed score.
- The endpoint accepts only requests from `https://ebcnewington.github.io` via CORS; server-to-server requests can spoof Origin, so this is *not* full bot protection. Add Turnstile or other abuse protection for larger-scale exposure.
- Per-device uniqueness is a convenience, not identity verification. Scores are self-reported, so achievements are for friendly fun rather than formal competition.
- No personal information is collected by the game; public aggregate accuracy is based only on submitted completed games.
- The front end must never claim a shared average exists while the backend is not connected.

Docs: https://developers.cloudflare.com/d1/get-started/ and https://developers.cloudflare.com/workers/platform/pricing/
