# Trip Updates — simple organizer publishing

The Legacy Tour guide includes a discreet lock icon beside Trip updates. Once the publisher is activated, the icon opens a modal with a single form: choose **Rob** or **Ashlee**, enter a short title and update, type your four-digit PIN, and tap **Publish update**.

There is no email verification, account creation or GitHub login for organizers. The private Google Apps Script server validates each PIN and submits the announcement through the existing GitHub issue-based update pipeline.

## One-time activation by the owner

1. Open https://script.google.com/home/projects/create in your Google account and create a standalone project called Legacy Tour Updates Publisher.
2. Replace Code.gs in that project with the contents of publisher/Code.gs from this repository. Add an HTML file named Index using the contents of publisher/Index.html. Save.
3. In Project Settings → Script Properties, set only the following three private properties:
   - EBC_UPDATES_ROB_PIN_INITIAL — Rob's initial four-digit PIN, using his phone number's last four digits if desired
   - EBC_UPDATES_ASHLEE_PIN_INITIAL — Ashlee's initial four-digit PIN, using her phone number's last four digits if desired
   - EBC_UPDATES_GITHUB_TOKEN — a fine-grained token scoped only to ebcnewington/legacy-dc-guide, with Issues Read and write permission
4. Run initializePublisher once in the Apps Script editor. Authorize the permissions it asks for. Initialization hashes each PIN with a unique salt and deletes the raw initial PIN properties, leaving the private hashed values.
5. Select Deploy → New deployment → Web app. Choose Execute as: Me and Who has access: Anyone. Deploy and copy the URL ending in /exec.
6. In the existing repository, edit data/publisher-config.json: set status to live and appUrl to the deployed Apps Script /exec URL. Commit the change. The existing lock button will open the functioning organizer modal.

Do not send the actual PINs, phone numbers or GitHub access token in ChatGPT or commit them to public code. GitHub fine-grained token management: https://github.com/settings/personal-access-tokens/new.

## Everyday publishing

Open the guide, tap the lock icon beside Trip updates, choose your name, enter a title, type the announcement, enter your four-digit PIN, and tap Publish update. The private server creates a public issue whose title begins [Trip Update]. The existing GitHub workflow publishes the new feed and timestamps the update; visitors can tap Refresh or reopen the guide. No traveler needs to clear browsing history, cookies or the app cache.

This is deliberately simple and accepts the limited security of four-digit phone-derived PINs. The server still throttles incorrect PIN attempts (five per hour per organizer) and successful posting (fifteen per hour per organizer). Keep posts limited to non-sensitive public information and the GitHub credential scoped to this one repository.

**Activation is still required.** These files prepare the modal and private publishing service but do not create Google Apps Script deployments or set secrets automatically. Until activation, the lock icon truthfully displays the setup notice; the ordinary Trip Updates section remains functional.

If the browser prevents the embedded form from opening, the exact same secure publishing page can be opened directly via its /exec URL (still no GitHub login).
