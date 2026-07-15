# HarvestTime Companion

> **The private, local engine that turns browser context into a reviewable Harvest workday.**

HarvestTime Companion is a small Node.js service used by the HarvestTime Chrome extension. It owns
durable daily state, keeps Harvest credentials out of the browser, reconciles timers with Harvest,
and turns approved browser evidence into useful Daily entry suggestions.

You install it once. It starts when you sign in, runs quietly in the background, and listens only
on `127.0.0.1:8787` by default. There is no HarvestTime activity-data cloud and no terminal window
that must remain open.

<p align="center">
  <img src="screenshots/app-overview.png" width="500" alt="HarvestTime side panel powered by the local companion" />
</p>

## Contents

- **Understand it:** [why it runs locally](#why-a-local-nodejs-companion) ·
  [quality model](#lightweight-by-design-thoroughly-tested) ·
  [privacy promise](#privacy-security-and-a-free-forever-promise) ·
  [extension features](#what-it-unlocks-in-the-extension)
- **Install it:** [one-time installation](#one-time-installation) ·
  [inspect first](#prefer-to-inspect-it-first) ·
  [architecture](#how-the-pieces-communicate) · [first run](#first-run-and-mock-mode)
- **Configure it:** [Harvest and the manager](#connect-a-harvest-account) ·
  [optional Jira](#optional-jira-enrichment)
- **Operate it:** [day-to-day behaviour](#normal-day-to-day-operation) ·
  [commands](#useful-commands) · [local files](#local-files) ·
  [troubleshooting](#troubleshooting) · [uninstall](#uninstall-or-remove-automatic-startup)

## Why a local Node.js companion?

A browser extension is excellent at presenting a focused side panel and collecting the context you
approve. It is deliberately not the right place for long-lived API credentials, filesystem-backed
daily state, or reliable background reconciliation.

The companion supplies those capabilities without sending your work history to somebody else’s
server:

| Local capability             | Why it matters                                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Credential isolation**     | Harvest OAuth/PAT and optional Jira credentials never need to live in Chrome sync storage.                          |
| **Durable workday state**    | Suggestions, manual entries, dismissed noise, timer history, and resume targets survive panel and browser restarts. |
| **Harvest reconciliation**   | Running, edited, restarted, stopped, and deleted Harvest entries are reflected back into the side panel.            |
| **Resilient live reads**     | Account- and query-scoped snapshots keep task choices and today’s entries usable through brief transient failures.  |
| **Review generation**        | Same-day evidence becomes ticket-sized suggestions rather than a raw URL log.                                       |
| **Background operation**     | A per-user service starts at login and updates safely without an open terminal.                                     |
| **Inspectable installation** | It is an ordinary local checkout with documented npm commands, local files, policies, and an uninstall path.        |

## Lightweight by design, thoroughly tested

The companion is intentionally a small, inspectable Node.js application. It uses Fastify for the
local HTTP boundary, Zod for shared runtime contracts, and plain TypeScript modules for services,
storage, and integrations. The extension uses browser-native DOM APIs rather than a heavy frontend
framework. There is no Electron shell, hosted dashboard, analytics runtime, or always-connected
HarvestTime cloud process competing for memory. The result is quick to start, modest in resource
use, and straightforward for a web developer to audit.

Reliability is protected at several levels:

- unit tests cover shared contracts, configuration, context detection, stores, timer adapters, and
  Harvest/Jira integrations;
- cache tests cover account/query isolation, corrupt-file recovery, transient Harvest failures,
  authentication boundaries, and the prohibition on substituting cached data for failed writes;
- injected-client route tests exercise authentication, validation, setup, timer, review, timeline,
  and Harvest actions without using real credentials or the public network;
- Playwright tests the compiled extension and its user-visible actions in Chromium, including
  stopped/running states, settings, themes, time inputs, suggestions, links, recovery, and failures;
- the distribution is rebuilt from the production API, installed from its lockfile in isolation,
  started on a temporary loopback port, and checked through its real health endpoint;
- CI enforces builds, TypeScript, linting, formatting, coverage thresholds, browser tests, companion
  parity, and distribution freshness.

This is defence-in-depth testing: contracts, backend behaviour, HTTP actions, rendered UI, and the
actual package people install all have explicit regression checks.

## Privacy, security, and a free-forever promise

HarvestTime will remain free to use. The project does not monetise browser activity,
timesheet content, credentials, or work patterns.

There is no HarvestTime telemetry, analytics SDK, advertising pixel, behavioural profiling, or
hosted activity-data service. Daily state and credentials stay on the user's machine. The
companion contacts only services needed for a user-configured feature: Harvest for explicit timer
and timesheet actions, Jira when optional verification is enabled, and the configured Git remote
when updates are requested or allowed. It never sends work-history data to the HarvestTime
maintainers or unrelated third parties.

Browser evidence cannot submit time or control a timer by itself. Network-facing actions remain
explicit, the service binds to `127.0.0.1` by default, tokens are kept out of Chrome sync storage,
and sensitive mutable files are excluded from Git.

### Security boundaries at a glance

| Boundary              | Protection                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Network**           | The API and manager bind to loopback; the port must not be exposed to a LAN or public internet.              |
| **Credentials**       | Harvest OAuth/PAT and optional Jira values stay in companion-owned storage or `.env`, never Chrome sync.     |
| **Manager access**    | The extension creates a 60-second, single-use capability that becomes a short-lived local session.           |
| **Manager mutations** | Session, exact loopback origin, and CSRF checks are required; responses never return stored secrets.         |
| **Restart**           | The browser can request one fixed supervisor action, never an arbitrary command, path, PID, or service name. |
| **Updates**           | Only clean, fast-forwardable installations update automatically; local modifications stop the update safely. |

## What it unlocks in the extension

### A reconstructed day you can actually review

The companion combines same-day browser metadata, active-ticket context, manual additions, and
existing Harvest entries into one Daily entries workflow.

<p align="center">
  <img src="screenshots/daily-review.png" width="500" alt="Daily entries powered by HarvestTime Companion" />
</p>

Every row has independent time, Harvest project, task type, and notes controls. Rows remain compact
while scanning the day, and one editor expands at a time; switching rows preserves in-progress
drafts. A developer can correct a suggestion; a designer can move it to the right project; either
can remove unrelated noise before it reaches a timesheet.

Start and End fields are keyboard-friendly. Enter `12:30` directly, use shorthand such as `930`,
or leave End blank to create a running Harvest timer. Existing Harvest rows are protected from the
suggestion-removal action and update their remote entry instead of creating duplicates.

### Evidence without pretending every guess is perfect

<p align="center">
  <img src="screenshots/history-suggestions.png" width="500" alt="Expanded browser evidence behind a Daily entry suggestion" />
</p>

Broad contexts such as a Jira board or a local checkout flow can cover multiple tasks. The
companion retains compact evidence—timestamp, URL, title, host, and detected ticket context—so an
uncertain suggestion can be inspected, split into better entries, or dismissed.

It does **not** read page bodies, passwords, cookies, form contents, or payment information.

### Harvest-aware timer control

The companion owns explicit start, switch, stop, and resume transitions. Browser activity can
suggest context, but it cannot operate a timer by itself.

<p align="center">
  <img src="screenshots/timer-running.png" width="500" alt="HarvestTime active Harvest timer powered by the local companion" />
</p>

On each side-panel refresh, today’s Harvest list is treated as authoritative:

- remote note, mapping, and clock-time edits update the local row;
- a timer restarted in Harvest becomes the active local timer;
- stale stop events are removed after a restart;
- entries deleted in Harvest disappear locally;
- a transient network, rate-limit, timeout, or Harvest server failure may return the matching
  validated local read snapshot for task assignments or time entries;
- rejected credentials never fall back to cached data, and mutations always remain live—cached
  data can never claim that a create, update, or timer action succeeded.

### A clean, editable Today story

The Today timeline turns detailed timer and context events into a compact human-facing narrative.
It can collapse on long days, groups low-level evidence, and gives eligible timer events focused
edit, resume, and remove actions.

<p align="center">
  <img src="screenshots/today-timeline.png" width="500" alt="HarvestTime Today timeline with an editable timer event" />
</p>

Timeline changes pass through shared validation and the companion's daily store. Harvest-backed
events update their real time entry; browser evidence remains local until the user approves an
entry action.

### Optional Jira detail

Basic Jira-key and GitHub context detection is local. Optional Jira verification adds the canonical
summary, status, issue type, project, assignee, and browse URL. Jira failure is non-blocking: Daily
entries, local detection, timer operations, and Harvest submission continue to work.

### Plain-language privacy and recovery

<table>
  <tr>
    <td align="center"><img src="screenshots/settings-privacy.png" width="390" alt="HarvestTime privacy and security settings in the light theme" /></td>
    <td align="center"><img src="screenshots/dark-theme.png" width="390" alt="HarvestTime settings in the dark theme" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Light theme</strong></td>
    <td align="center"><strong>Dark theme</strong></td>
  </tr>
</table>

The extension explains what is processed and where credentials live. If the companion stops, the
normal work UI is replaced with a friendly reconnect screen instead of failing silently. A fresh
install sees Welcome and an in-panel Getting Started guide rather than a connection error.

<p align="center">
  <img src="screenshots/server-unreachable.png" width="500" alt="HarvestTime companion unavailable recovery screen" />
</p>

<p align="center">
  <img src="screenshots/getting-started.png" width="500" alt="HarvestTime first-run companion installation and health-check guide" />
</p>

## One-time installation

### Requirements

- [Node.js 22 or newer](https://nodejs.org/)
- Git

The installer creates an ordinary local checkout, installs locked production dependencies, and
registers a per-user service. It does not require administrator access and does not hide the files
it installs.

- The HarvestTime Chrome extension

The installer creates a local checkout, installs the exact locked dependencies with dependency
scripts disabled, registers a per-user background service, and starts it. Administrator access is
not required.

### macOS or Linux

```sh
curl -fsSL https://raw.githubusercontent.com/lcherone/harvest-time-companion/master/install.sh | sh
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/lcherone/harvest-time-companion/master/install.ps1 | iex
```

Confirm it is ready:

```sh
npm run health --prefix "$HOME/.harvest-time/companion"
```

The response should identify `harvest-time-api` with status `ok`. The extension connects to
`http://127.0.0.1:8787` automatically.

## Prefer to inspect it first?

The one-line installer is optional. Clone the repository, inspect the scripts, install locked
dependencies, and register the service yourself:

```sh
git clone https://github.com/lcherone/harvest-time-companion.git
cd harvest-time-companion
npm ci --ignore-scripts
npm run service:install
npm run health
```

For foreground-only use without a login service or automatic updates:

```sh
npm run start
```

## How the pieces communicate

```text
Chrome extension
  ├─ renders the side panel
  ├─ collects approved active-tab and same-day history metadata
  └─ calls http://127.0.0.1:8787
       └─ HarvestTime Companion (Node.js + Fastify)
            ├─ stores local daily state
            ├─ generates and reconciles review entries
            ├─ calls the Harvest API
            └─ optionally verifies Jira issues
```

The loopback boundary is important: credentials and daily state stay in the companion, while the
extension receives only the product state it needs to render and act on.

## First run and mock mode

A clean extension install first opens Getting Started when it has not connected to the companion.
The guide includes the platform installers, service health commands, the latest-release link, and a
**Check connection** action. It remains available from Settings and from reconnect troubleshooting.

After the companion connects, a clean install starts in mock mode. No Harvest or Jira credentials
are required to understand the workflow. Mock mode uses local deterministic timer entries and is
safe for evaluation or Chrome Web Store review.

When you are ready for live time tracking, configure Harvest and explicitly choose the live setup
path in the extension.

When you need to disconnect later, Settings provides a confirmed **Log out of Harvest** action. It
clears locally managed OAuth/PAT credentials, the selected account, and the validated Harvest read
cache before returning the extension to Mock mode with OAuth setup available again. It never
deletes or edits remote Harvest entries.

## Connect a Harvest account

The easiest path is in the extension: open **Settings > Companion manager**. HarvestTime creates a
single-use local link and opens the manager at `http://127.0.0.1:8787/setup`. From there you can:

- open Harvest's developer page and paste a personal access token;
- validate the token before it is saved;
- choose the Harvest account to use;
- inspect connection status and read-only previous-day summaries;
- review optional Jira setup, matching rules, and companion health;
- securely restart the installed background companion after changing `.env` or matching rules.

<p align="center">
  <img src="screenshots/companion-manager.png" width="900" alt="HarvestTime secure local companion manager showing guided Harvest setup and connection status" />
</p>

Connections shows Harvest and Jira readiness without returning stored credentials to the page.
Optional Jira remains environment-managed and non-blocking.

<p align="center">
  <img src="screenshots/companion-connections.png" width="900" alt="HarvestTime companion manager connection status and optional Jira guidance" />
</p>

The previous-day History view is read-only: it shows what reached Harvest, marks overlapping or
incomplete local time, and filters entries needing review. Removing history clears only locally
stored previous days; it does not affect today, settings, credentials, caches, or Harvest entries.

<p align="center">
  <img src="screenshots/companion-history.png" width="900" alt="HarvestTime companion manager previous-day history and needs-review filters" />
</p>

The remaining manager areas make detection and service behaviour inspectable. Matching shows the
ticket pattern and recognised hosts used for future evidence. Health shows the exact loopback
service, version, uptime, local data directory, session expiry, and whether supervised restart is
available.

<table>
  <tr>
    <td align="center"><img src="screenshots/companion-matching.png" width="430" alt="HarvestTime companion manager ticket matching rules" /></td>
    <td align="center"><img src="screenshots/companion-health.png" width="430" alt="HarvestTime companion manager local service health and restart controls" /></td>
  </tr>
  <tr>
    <td align="center"><strong>Matching rules</strong></td>
    <td align="center"><strong>Health and restart</strong></td>
  </tr>
</table>

The manager is responsive down to the same narrow widths used to stress-test the extension UI.

<p align="center">
  <img src="screenshots/companion-manager-mobile.png" width="320" alt="Responsive HarvestTime companion manager setup view" />
</p>

Typing the setup address directly does not reveal private settings. The link must be created by the
extension, expires after 60 seconds, and becomes a short-lived local session. PAT setup is stored in
the companion's private JSON file; the manager never rewrites `.env`. When a production companion
is used with an unpacked extension, that first button click pairs and stores the exact extension
origin in `config.json`; a different extension ID is rejected afterward.

On an installed background service, **Health > Restart companion** asks for confirmation and then
requests a fresh process from the service supervisor. This reloads `.env` and saved configuration
without deleting local data or changing Harvest entries. The restart ends the short-lived manager
session, so wait a few seconds and reopen **Settings > Companion manager** from the extension. A
foreground `npm run start` process has no supervisor and keeps the command-line fallback visible.

For environment-managed OAuth, copy the environment template:

```sh
cp .env.example .env
```

Create a Harvest OAuth application with this redirect URL:

```text
http://127.0.0.1:8787/auth/harvest/callback
```

Set the OAuth application details:

```sh
HARVEST_CLIENT_ID=...
HARVEST_CLIENT_SECRET=
HARVEST_USER_AGENT=Your App Name (you@example.com)
HARVEST_REDIRECT_URI=http://127.0.0.1:8787/auth/harvest/callback
```

Restart the service, choose **Connect with Harvest** in the extension, and select the Harvest
account. Environment values remain authoritative; the manager reports them as companion-managed
and does not reveal or overwrite them.

## Optional Jira enrichment

Jira remains an advanced, environment-managed option while its public authentication policy is
being finalized. Create an Atlassian API token from your Atlassian account security page, then add
these values to `.env` only when verified Jira metadata is wanted:

```sh
JIRA_VERIFY_ISSUES=true
JIRA_SITE_URL=https://your-site.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=
```

Detection still works without them. Jira is enrichment, not a runtime dependency.

## Normal day-to-day operation

There is normally nothing to manage:

- the service starts when you sign in;
- the extension discovers it on the loopback address;
- the companion checks for a safe fast-forward update every six hours;
- accepted updates install locked dependencies and restart the service;
- `.env`, credentials, and daily data remain local across updates.

Automatic updates stop safely when tracked files have local changes or the branch has diverged.
They do not overwrite a modified installation.

## Useful commands

Run these inside the companion directory, or use
`--prefix "$HOME/.harvest-time/companion"` from elsewhere.

| Command                     | Purpose                                                      |
| --------------------------- | ------------------------------------------------------------ |
| `npm run health`            | Check the local API and report whether it is ready.          |
| `npm run start`             | Run in the current terminal without automatic Git updates.   |
| `npm run start:auto`        | Run in the current terminal with the update supervisor.      |
| `npm run update:check`      | Check whether a safe fast-forward update is available.       |
| `npm run update`            | Apply the latest safe update immediately.                    |
| `npm run service:install`   | Install or refresh the per-user login service.               |
| `npm run service:uninstall` | Remove automatic startup while preserving settings and data. |
| `npm run smoke`             | Start an isolated instance and verify its health endpoint.   |
| `npm run smoke:supervisor`  | Verify restart recovery and `.env` reload under supervision. |

## Local files

| Data                                                               | Default location                           |
| ------------------------------------------------------------------ | ------------------------------------------ |
| Companion application                                              | `~/.harvest-time/companion/`               |
| Daily activity, review state, and validated Harvest read snapshots | `~/.harvest-time/companion/apps/api/data/` |
| OAuth token store                                                  | `~/.harvest-time/companion/.harvest-time/` |
| Optional environment settings                                      | `~/.harvest-time/companion/.env`           |

All sensitive and mutable files are excluded from Git.

## Troubleshooting

### The extension says the companion is not running

```sh
npm run health --prefix "$HOME/.harvest-time/companion"
npm run service:install --prefix "$HOME/.harvest-time/companion"
```

Confirm another process is not using port `8787` and that the service remains bound to
`127.0.0.1`.

### Harvest and the side panel differ

Bring the side panel into focus or wait for its refresh cycle. The companion fetches an
authoritative snapshot of today’s Harvest entries and reconciles remote edits, restarts, and
deletions. If Harvest is temporarily unavailable for a transient reason, the exact account/query
read may use its last validated local snapshot. Authentication failures and all writes still fail
normally instead of being hidden by cached data.

### An update is refused

Run `npm run update:check`. Updates are intentionally blocked when tracked files are modified or
the branch cannot be fast-forwarded. Preserve intentional edits, return the checkout to a clean
state, or update it manually after inspection.

## Uninstall or remove automatic startup

```sh
npm run service:uninstall --prefix "$HOME/.harvest-time/companion"
```

This removes the background-service registration but does not silently delete settings or daily
data. Inspect and remove `~/.harvest-time/companion` yourself if complete deletion is wanted.

## Privacy and security

The service is intended to remain bound to `127.0.0.1`. Do not expose port `8787` to a LAN or the
public internet.

- Read [PRIVACY.md](PRIVACY.md) for the complete data-handling description.
- Read [SECURITY.md](SECURITY.md) for deployment and credential guidance.
- Chrome Web Store reviewers can use [REVIEWER-INSTRUCTIONS.md](REVIEWER-INSTRUCTIONS.md).
