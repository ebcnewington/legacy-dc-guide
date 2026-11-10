# Fast setup: Legacy Tour Trip Updates

This is the simplified publisher. **Only one code file is needed.** It saves new announcements to a private Google Sheet owned by you, not to GitHub, so you do not need a GitHub access token, a second HTML file, or email verification.

## One-time setup

1. Open the [online Legacy Tour guide](https://ebcnewington.github.io/legacy-dc-guide/), tap the small lock icon next to **Trip updates**, and tap **Copy setup code**.
2. Open [New Google Apps Script project](https://script.google.com/home/projects/create) in your Google account. Delete the default contents of **Code.gs**, paste the copied code, and save. Call the project **Legacy Tour Updates Publisher**.
3. In the Apps Script editor open **Project Settings** (gear) → **Script Properties**. Add only TWO private properties:
   - `EBC_UPDATES_ROB_PIN_INITIAL`: your chosen four-digit PIN
   - `EBC_UPDATES_ASHLEE_PIN_INITIAL`: Ashlee's chosen four-digit PIN

   You can choose the last four digits of each phone number, as originally requested. Enter these PINs only inside Google's Script Properties. **Do not send them in this chat or add them to the public GitHub repository.**
4. At the top of the Apps Script editor, choose the function **initializePublisher**, click **Run**, and approve Google authorization. This automatically creates a private Google Sheet named **Washington Legacy Tour — Trip Updates**, hashes your two PINs with separate salts, and deletes the original plain PIN entries.
5. Choose **Deploy → New deployment → Web app**. Configure **Execute as: Me** and **Who has access: Anyone**, then deploy. Copy the URL ending in **/exec**, and paste that URL back into this ChatGPT conversation. The URL itself is not a password. I'll connect it to the existing guide and check deployment.

That is all. You do not need GitHub for setup or everyday posting, and Ashlee does not need any account to submit an announcement.

## Everyday use

Tap the discreet lock icon beside **Trip updates** in the guide, select Rob or Ashlee, enter a title and message, type your four-digit PIN, then **Publish update**.

The new entry is saved to the private Sheet, but only its public title, message and publication timestamp are returned through the Script's **read-only** update feed. The public guide combines those direct updates with the earlier GitHub-based trip updates, so nothing previously published disappears. The guide checks for new announcements when opened, returned to, and every three minutes; visitors can also tap **Refresh**. No browser cache clearing is needed.

## Notes

- Only two Script Properties and one code file are needed. The `publisher/Index.html` source file in GitHub is retained for maintainers, but **do not create it separately in Apps Script**: the HTML form is already embedded inside Code.gs.
- The Google Sheet remains private; the web app exposes only the public updates through its JSONP endpoint. PIN checks and rate limits happen server-side, not in the webpage.
- This is intentionally low-friction PIN-only authentication. Four digits (especially phone-number digits) are guessable; keep posts to non-sensitive trip information.
- The initial GitHub-backed announcements stay available. The Apps Script bridge does not need to create GitHub issues or rebuild the website for each new organizer post.
- If the browser blocks the modal's embedded Google frame, the deployed /exec URL opens the same form directly in another browser tab.
- Until the owner finishes deployment and shares the /exec URL, the lock icon shows setup instructions instead of an active posting form.
