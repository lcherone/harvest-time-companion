# HarvestTime Companion

The small local service used by the HarvestTime Chrome extension. It listens only on
`127.0.0.1:8787`, turns browser activity into reviewable time entries, and optionally connects to
your Harvest and Jira accounts.

## Install

Requirements: [Node.js 22+](https://nodejs.org/) and Git.

### macOS or Linux

```sh
curl -fsSL https://raw.githubusercontent.com/lcherone/harvest-time-companion/master/install.sh | sh
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/lcherone/harvest-time-companion/master/install.ps1 | iex
```

The installer clones the companion into `~/.harvest-time/companion`, installs exact dependencies,
and registers a background service for the current user. It does not require administrator access.
The service starts at login and checks this repository every six hours for a safe, fast-forward
update. When an update is available, it installs dependencies and restarts itself.

If you prefer to inspect every command before running it, clone the repository and install the
service explicitly:

```sh
git clone https://github.com/lcherone/harvest-time-companion.git
cd harvest-time-companion
npm ci
npm run service:install
```

Confirm it is running:

```sh
npm run health
```

The response should identify `harvest-time-api` with status `ok`. The Chrome extension connects to
`http://127.0.0.1:8787` automatically.

## Useful Commands

| Command                     | Purpose                                                    |
| --------------------------- | ---------------------------------------------------------- |
| `npm run health`            | Check that the local service is ready.                     |
| `npm run update`            | Install the latest fast-forward update immediately.        |
| `npm run update:check`      | Check for an update without changing files.                |
| `npm run start`             | Run in the current terminal without automatic Git updates. |
| `npm run start:auto`        | Run in the current terminal with automatic updates.        |
| `npm run service:install`   | Install or refresh the login background service.           |
| `npm run service:uninstall` | Remove the service while keeping settings and local data.  |

## Account Setup

A fresh installation starts in mock mode, so no credentials are required to try HarvestTime. To
use a real Harvest account, copy the environment template:

```sh
cp .env.example .env
```

Create a Harvest OAuth application with this redirect URL:

```text
http://127.0.0.1:8787/auth/harvest/callback
```

Set `HARVEST_CLIENT_ID`, `HARVEST_CLIENT_SECRET`, and a contact address in `HARVEST_USER_AGENT`,
then restart the companion service and choose **Connect with Harvest** in the extension. Jira
enrichment is optional and disabled by default.

## Updates and Local Changes

Automatic updates run `git fetch` and accept only a fast-forward of the tracked branch. They stop
if a tracked file has local changes or if the branch has diverged; local data and `.env` are ignored
by Git and do not block updates. Run `npm run update` to see a clear diagnostic.

Runtime state lives under `apps/api/data/`. OAuth tokens live under `.harvest-time/` by default.
Both are ignored by Git. Removing the background service does not delete either directory.

## Privacy and Security

The service is intended to remain bound to `127.0.0.1`. Do not expose port `8787` to a network or
the public internet. See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for details.

Chrome Web Store reviewers can use [REVIEWER-INSTRUCTIONS.md](REVIEWER-INSTRUCTIONS.md).
