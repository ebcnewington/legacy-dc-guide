# No-Cloudflare alternative: Google Apps Script + Google Sheets

This is the recommended shared-trivia backend for Washington Legacy Tour. It is **not deployed yet**. It can run entirely from a personal Google account; **Emmanuel's Google Workspace administrator account is not required**.

## One-time installation (about five steps)

1. Open https://script.google.com/home/projects/create while signed in to your Google account. Name the script **Washington Legacy Trivia Statistics**.
2. Replace the default Code.gs with the complete contents of **Code.gs** in this directory. Save.
3. Select **setupTriviaBackend** from the function menu and press **Run**, then approve your own account's requested Google Sheets permissions. This automatically creates a **private** spreadsheet in your Google Drive and logs its URL.
4. Choose **Deploy → New deployment → Web app**. Choose **Execute as: Me**, and **Who has access: Anyone**, then **Deploy**. Copy the **/exec URL**, not the /dev URL.
5. Edit **data/trivia-config.json** in GitHub: set `provider` to `apps-script`, `scriptUrl` to the full /exec URL, and `status` to `live`. Commit. GitHub Pages republishes automatically and the game will begin showing real aggregate statistics.

This backend does not alter your other ministry Apps Script projects. You can change the spreadsheet owner or transfer the script later, but transferring web apps between domains can require redeployment.

## How it works

- The site is hosted on **GitHub Pages** and the anonymous statistics sheet stays private in **your Google Drive**.
- The browser generates random opaque tokens per device and per game. The script hashes each device token using a private key stored in Script Properties; it does not save names, emails, or the device token itself.
- It accepts **POST** requests for ratings and scores. A given device has one editable rating per question. A given session can submit only one score. Basic daily limits help curb repeat activity.
- The app reads **only nonsensitive aggregate statistics** through Google's documented JSONP Content Service technique. It never returns individual game rows or device hashes.
- Because Apps Script doesn't expose the necessary CORS response headers, submissions use cross-origin requests with **no-cors** and can't receive an authoritative success acknowledgment. The website should not tell visitors a submission is confirmed by the server; it can display a per-device saved rating and update shared figures on subsequent reads.
- Public anonymous submissions remain open to manipulation by determined users who change devices or scripts. No anonymous, password-free system can guarantee individual identity; treat the game as friendly recreation rather than a formal competition.
- Keep the Google Sheet private. Use normal Google account security, and review Apps Script quotas if usage grows.

## Testing

After deployment, open the provided /exec URL with `?action=health`. It should show `{"ok":true,"service":"ebc-legacy-trivia-google"}`.

To test the frontend without contaminating existing data, ask two people on separate devices to each rate one question and complete a game. After a short delay, the average and community ratings should update.

Official references:
- https://developers.google.com/apps-script/guides/web
- https://developers.google.com/apps-script/guides/content

## Rollback

If you don't want shared ratings after the trip, set **data/trivia-config.json** to `{"provider":"apps-script","scriptUrl":"","status":"not-configured"}`. The game continues to work locally without a shared database.
