# Chrome Web Store Reviewer Instructions

Paste the section below into the Chrome Web Store **Test instructions** field.

---

HarvestTime is a time-entry assistant that uses a companion API running locally on the user's
computer. The API binds only to `http://127.0.0.1:8787`; it is not a remote data service.

Reviewer setup:

1. Install Node.js 22 or newer and Git.
2. Clone `https://github.com/lcherone/harvest-time-companion`.
3. In that directory run `npm ci` and `npm start`.
4. Open `http://127.0.0.1:8787/health` and confirm the response includes `"status":"ok"` and
   `"service":"harvest-time-api"`.
5. Open HarvestTime from the Chrome toolbar. Its side panel should show the companion as available.
6. No credentials are needed. A fresh installation uses mock mode. Open a GitHub issue in another
   tab, return to HarvestTime, and use the detected context to start and stop a timer.
7. The **New entry** button can add a Jira-style test item such as `TEST-101`.
8. Live Harvest submission and Jira verification are optional and use the reviewer's own accounts.

The extension processes same-day browser history metadata to construct reviewable time entries.
That metadata is sent only to the loopback companion and not to the developer or unrelated third
parties.

---
