# HarvestTime Companion

Local companion API for the HarvestTime Chrome extension. It receives browser activity metadata
from the extension, builds reviewable daily time entries, and optionally connects to Harvest and
Jira. The service listens only on `127.0.0.1:8787` by default.

This repository contains the production JavaScript runtime, not the private development source,
tests, credentials, signing keys, or user data.

## Requirements

- Node.js 22 or newer
- npm 10 or newer
- The HarvestTime extension from the Chrome Web Store

## Start

```sh
npm install
npm start
```

Keep that terminal open while using HarvestTime. Confirm the companion is ready in another
terminal:

```sh
npm run health
```

The health check should report `harvest-time-api` with status `ok`. The extension connects to
`http://127.0.0.1:8787` automatically.

## Mock Mode

No account or API credentials are required. A fresh installation starts in mock mode so reviewers
and new users can detect tickets, start and stop timers, reconstruct a workday from browser history,
and edit daily entries without sending anything to Harvest or Jira.

## Optional Live Harvest Setup

Copy the example environment file and fill in your own Harvest OAuth application values:

```sh
cp .env.example .env
```

Register this redirect URL in Harvest:

```text
http://127.0.0.1:8787/auth/harvest/callback
```

Set `HARVEST_CLIENT_ID`, `HARVEST_CLIENT_SECRET`, and a contact address in
`HARVEST_USER_AGENT`, restart the companion, then choose **Connect with Harvest** in the extension.
Jira enrichment is optional and disabled by default.

## Local Data

Runtime state is created under `apps/api/data/`. OAuth tokens are stored under `.harvest-time/` by
default. Both locations are ignored by git. Delete those directories to remove local HarvestTime
state and credentials.

The service is intended to remain bound to `127.0.0.1`. Do not expose port `8787` to a network or
the public internet.

## Chrome Web Store Review

See [REVIEWER-INSTRUCTIONS.md](REVIEWER-INSTRUCTIONS.md) for the text and verification flow to use
in the Chrome Web Store Developer Dashboard.

## Privacy

See [PRIVACY.md](PRIVACY.md). Replace the contact and repository placeholders before publishing
this repository or submitting the extension for review.
