# Chrome Web Store Reviewer Instructions

HarvestTime is an internal time-entry assistant that uses a companion API running locally on the
user's computer. The API binds only to `http://127.0.0.1:8787`; it is not a remote data service.

Reviewer setup:

1. Download or clone the companion repository from:
   `https://github.com/lcherone/harvest-time-companion`
2. Install Node.js 22 or newer.
3. In the companion directory, run `npm install` and then `npm start`.
4. Open `http://127.0.0.1:8787/health`. Confirm the response includes `"status":"ok"` and
   `"service":"harvest-time-api"`.
5. Open the HarvestTime extension from the Chrome toolbar. Its side panel should show the companion
   as available.
6. No Harvest or Jira credentials are required. A fresh installation uses mock mode. Open a GitHub
   issue in another tab, return to HarvestTime, and use the detected context to start and stop a
   timer. Daily entries can then be reviewed and edited locally.
7. The **New entry** button can also be used to add a Jira-style test item such as `TEST-101`.
8. Live Harvest submission is optional and requires the user to connect their own Harvest account
   through OAuth. Jira verification is also optional.

The extension processes same-day browser history metadata to construct reviewable time entries.
That metadata is sent only to the loopback companion on the same computer and is not transmitted to
the developer or unrelated third parties.

---
