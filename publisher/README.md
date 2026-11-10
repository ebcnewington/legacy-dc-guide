# Legacy Tour organizer publisher — one-time setup

The public website is on GitHub Pages, which cannot safely validate a PIN or store a token that can post to GitHub. This separate Google Apps Script web app is the secured publishing service. It is displayed in the guide after you activate it and is independent of the unfinished trivia backend.

## Enable private organizer access

1. Open https://script.google.com/home/projects/create in the Google account that will own the publisher. Create a standalone project named **Legacy Tour Updates Publisher**. Replace Code.gs with the contents of publisher/Code.gs, and create an HTML file named **Index** using publisher/Index.html.

2. Go to **Project Settings → Script Properties**. Enter the following five values privately:

   - EBC_UPDATES_ROB_EMAIL — Rob's email address to receive verification codes
   - EBC_UPDATES_ASHLEE_EMAIL — Ashlee's email address to receive verification codes
   - EBC_UPDATES_ROB_PIN_INITIAL — Rob's initial four-digit PIN
   - EBC_UPDATES_ASHLEE_PIN_INITIAL — Ashlee's initial four-digit PIN
   - EBC_UPDATES_GITHUB_TOKEN — a fine-grained GitHub personal access token that grants Issues **Read and write** permission on only ebcnewington/legacy-dc-guide

   Use the last four digits of the respective phone number for each initial PIN if desired. Do **not** put actual PINs, the full phone numbers, email addresses, or the GitHub token in public GitHub source code, files, or a ChatGPT message.

3. Run the **initializePublisher** function from the Apps Script editor and authorize its requested access. This function validates configuration, hashes both PINs with independent random salts, and deletes the raw PIN properties after successful setup. The script requires permissions for email and outbound HTTPS.

4. Choose **Deploy → New deployment → Web app** with **Execute as: Me** and **Who has access: Anyone**. Deploy and copy the full HTTPS /exec URL (not /dev). The published app page may be accessible to anyone, but posting requires the organizer's PIN plus a six-digit email code.

5. In this repository update **data/publisher-config.json** with status **live** and appUrl set to the full /exec URL. Commit the change. The discreet organizer lock icon will appear beside Trip updates on the online guide. Rob or Ashlee can use the in-guide editor without a GitHub login.

## Posting workflow

Choose your name, enter your four-digit PIN, then enter the email code. Compose a title and message, and tap Publish update. The server makes a GitHub issue titled [Trip Update] followed by your title, with a private fine-grained token. The existing GitHub Actions workflow regenerates and publishes the public JSON feed; travelers see the update after the build completes. They can tap Refresh to check for it. The issue body may include a public organizer attribution comment, which is stripped from the display text.

Each six-digit code expires in ten minutes. Sessions expire after one hour. The server rejects more than five wrong PIN attempts in an hour per organizer, limits sign-in emails to three per hour per organizer, rejects more than five wrong verification codes per hour, and limits publishing to fifteen announcements per hour per organizer.

**Why email verification is necessary:** the requested PINs derive from telephone numbers, which may be displayed publicly in the guide. A four-digit PIN and a hidden icon are not sufficient security. PIN checking, throttling, email codes and the GitHub access token remain server-side, never in browser JavaScript.

## Validation and recovery

After setup, verify separate logins for Rob and Ashlee. Post a harmless test message, confirm GitHub creates an issue, verify the Actions workflow succeeds, then check the update's timestamp on the guide. Close a test issue to remove its notice during the next deployment.

If embedding the Google app is blocked by a browser privacy restriction, the same /exec URL can be opened separately, without a GitHub account. To hide organizer access, change status to not-configured and clear appUrl in data/publisher-config.json; to disable server-side posting, revoke the fine-grained GitHub token.

These repository files prepare the service, but **do not automatically deploy the Apps Script**, set anyone's PIN, or enable organizer access. The account owner must complete the one-time steps above. Treat the existing published updates as operational even if this optional publisher has not been configured.
