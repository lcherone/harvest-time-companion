export const managerHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <title>HarvestTime companion manager</title>
    <link rel="icon" href="data:," />
    <link rel="stylesheet" href="/setup/assets/manager.css" />
  </head>
  <body>
    <header class="site-header">
      <a class="brand" href="#setup" aria-label="HarvestTime setup">
        <svg class="brand-mark" viewBox="0 0 128 128" aria-hidden="true" focusable="false">
          <defs>
            <linearGradient id="manager-leaf-large" x1="48" y1="84" x2="106" y2="16" gradientUnits="userSpaceOnUse"><stop stop-color="#2b6049" /><stop offset="1" stop-color="#39785a" /></linearGradient>
            <linearGradient id="manager-leaf-small" x1="22" y1="96" x2="62" y2="58" gradientUnits="userSpaceOnUse"><stop stop-color="#3d7659" /><stop offset="1" stop-color="#67a07a" /></linearGradient>
          </defs>
          <path d="M59 74C58 43 72 19 108 12c3 35-8 59-39 68-5 1-8-1-10-6Z" fill="url(#manager-leaf-large)" />
          <path d="M54 99C29 99 14 85 12 60c25-1 43 10 48 31 1 5-1 8-6 8Z" fill="url(#manager-leaf-small)" />
          <path d="M57 108c1-31 14-55 36-76" fill="none" stroke="#24543f" stroke-linecap="round" stroke-width="7" />
          <path d="M57 108c-5-20-16-31-34-38" fill="none" stroke="#24543f" stroke-linecap="round" stroke-width="7" />
        </svg>
        <span>HarvestTime</span>
      </a>
      <button class="menu-toggle" id="menu-toggle" type="button" aria-controls="manager-navigation" aria-expanded="false">
        <span></span><span></span><span></span><span class="sr-only">Menu</span>
      </button>
      <nav class="main-nav" id="manager-navigation" aria-label="Companion manager">
        <a href="#setup" data-nav="setup">Setup</a>
        <a href="#connections" data-nav="connections">Connections</a>
        <a href="#history" data-nav="history">History</a>
        <a href="#settings" data-nav="settings">Settings</a>
        <a href="#health" data-nav="health">Health</a>
      </nav>
      <div class="header-links">
        <a href="https://chromewebstore.google.com/detail/harvesttime/pbdiaopaeddjdblijddkkgfiheejolol" target="_blank" rel="noopener noreferrer">
          <svg class="store-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <circle cx="12" cy="12" r="10.5" fill="#f4b400" />
            <path d="M12 1.5a10.5 10.5 0 0 1 9.1 5.25H12a5.25 5.25 0 0 0-4.55 2.63L4.82 4.82A10.45 10.45 0 0 1 12 1.5Z" fill="#db4437" />
            <path d="M2.9 6.75A10.5 10.5 0 0 0 12 22.5l4.55-7.88A5.25 5.25 0 0 1 7.45 9.38L2.9 6.75Z" fill="#0f9d58" />
            <circle cx="12" cy="12" r="5.2" fill="#ffffff" />
            <circle cx="12" cy="12" r="3.9" fill="#4285f4" />
          </svg>
          <span>Chrome Web Store</span>
          <svg class="external-mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6M17 3l-8 8M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
        </a>
        <a href="https://github.com/lcherone/harvest-time-companion" target="_blank" rel="noopener noreferrer">
          <svg class="github-mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.87c-2.78.6-3.37-1.18-3.37-1.18-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02A9.55 9.55 0 0 1 12 6.82c.85 0 1.71.12 2.51.34 1.91-1.29 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.77c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>
          <span>GitHub</span>
          <svg class="external-mark" viewBox="0 0 20 20" aria-hidden="true"><path d="M11 3h6v6M17 3l-8 8M15 11v5a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" /></svg>
        </a>
      </div>
    </header>

    <main class="app-shell">
      <div class="manager" id="manager">
        <aside class="step-rail" aria-label="Setup guide">
          <div class="step-rail-heading">
            <p class="eyebrow">Setup guide</p>
            <span id="setup-progress-count">Checking progress…</span>
          </div>
          <ol>
            <li data-step="companion"><a href="#health"><span>1</span><div><strong>Companion</strong><small data-step-status="companion">Checking local service</small></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></a></li>
            <li data-step="harvest"><a href="#setup"><span>2</span><div><strong>Harvest</strong><small data-step-status="harvest">Checking connection</small></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></a></li>
            <li data-step="jira"><a href="#connections"><span>3</span><div><strong>Jira</strong><small data-step-status="jira">Checking optional setup</small></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></a></li>
            <li data-step="detection"><a href="#settings"><span>4</span><div><strong>Work detection</strong><small data-step-status="detection">Checking matching rules</small></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></a></li>
            <li data-step="review"><a href="#review"><span>5</span><div><strong>Review</strong><small data-step-status="review">Waiting for setup</small></div><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></a></li>
          </ol>
          <div class="progress-reason" id="setup-progress-reason" aria-live="polite">
            <strong id="setup-progress-title">Checking your setup</strong>
            <p id="setup-progress-detail">The companion is confirming which step needs your attention.</p>
            <a id="setup-progress-action" href="#setup">Continue setup <span aria-hidden="true">→</span></a>
          </div>
          <div class="local-note">
            <strong>Local by design</strong>
            <p>Credentials and activity remain on this computer. This page is available only through a short-lived extension session.</p>
          </div>
        </aside>

        <div class="content">
          <div class="notice is-hidden" id="notice" role="status" aria-live="polite"></div>

          <section class="page" data-page="setup">
            <header class="setup-intro">
              <h1>Set up HarvestTime</h1>
              <p class="lede">Connect your local companion without editing configuration files.</p>
            </header>

            <div class="mobile-progress" aria-label="Setup progress">
              <ol>
                <li data-step="companion"><span>1</span><strong>Companion</strong></li>
                <li data-step="harvest"><span>2</span><strong>Harvest</strong></li>
                <li data-step="jira"><span>3</span><strong>Jira</strong></li>
                <li data-step="detection"><span>4</span><strong>Work detection</strong></li>
                <li data-step="review"><span>5</span><strong>Review</strong></li>
              </ol>
            </div>

            <article class="harvest-setup" id="harvest-setup-panel">
              <div class="setup-section-heading">
                <h2>Connect Harvest</h2>
                <span class="status-badge sr-only" id="setup-harvest-badge">Checking</span>
              </div>
              <p class="setup-copy"><span class="desktop-setup-copy">HarvestTime needs read access to time entries, projects, clients, and users.<br />Your credentials are stored only on this computer and never leave it.</span><span class="mobile-setup-copy">Create a Personal Access Token in <a href="https://id.getharvest.com/developers" target="_blank" rel="noopener noreferrer">Harvest Developers&nbsp;↗</a>, then paste it below. HarvestTime stores it locally on your device.</span></p>
              <a class="developer-link" href="https://id.getharvest.com/developers" target="_blank" rel="noopener noreferrer">
                <svg class="harvest-logo" viewBox="0 0 250 250" aria-hidden="true">
                  <path d="M109.39 156.56V250H93.63V109.53a15.58 15.58 0 0 1 15.76-15.47h46.67v46.72a15.58 15.58 0 0 1-15.45 15.78Z" />
                  <path d="M250 0v234.22A15.84 15.84 0 0 1 234.24 250h-15.45V15.47A15.31 15.31 0 0 1 234.24 0Z" />
                  <path d="M187.58 0H203v234.22A15.78 15.78 0 0 1 187.58 250h-15.76V78a15.57 15.57 0 0 1 15.76-15.5Z" />
                  <path d="M62.42 250H47V15.47A15.31 15.31 0 0 1 62.42 0h15.76v171.72a15.83 15.83 0 0 1-15.76 15.78Z" />
                  <path d="M0 250V15.47A15.58 15.58 0 0 1 15.76 0h15.45v234.22A15.58 15.58 0 0 1 15.76 250Z" />
                </svg>
                <span>Open Harvest Developers</span>
                <svg class="developer-link-arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg>
              </a>
              <div class="setup-form-area" id="setup-form-area">
                <form id="token-form" class="form-stack">
                  <label for="token-input">Personal access token <span class="label-help" title="Create this token in your Harvest developer settings">?</span></label>
                  <div class="secure-input">
                    <input id="token-input" name="token" type="password" autocomplete="off" required placeholder="Paste your token" />
                    <button class="visibility-toggle" id="token-visibility" type="button" aria-label="Show personal access token" aria-pressed="false">
                      <svg class="eye-open" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" /><circle cx="12" cy="12" r="2.75" /></svg>
                      <svg class="eye-closed" viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 16M10.2 6.2A9.9 9.9 0 0 1 12 6c6 0 9.5 6 9.5 6a16 16 0 0 1-2.2 2.8M6.3 7.3A15.4 15.4 0 0 0 2.5 12s3.5 6 9.5 6a9.6 9.6 0 0 0 3-.5" /></svg>
                    </button>
                  </div>
                </form>
                <form id="account-form" class="form-stack">
                  <label for="account-select">Account</label>
                  <div class="select-wrap">
                    <select id="account-select" name="account" required disabled><option value="">Select your Harvest account</option></select>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg>
                  </div>
                </form>
                <button class="setup-primary-action" id="setup-primary-action" type="submit" form="token-form">
                  <span>Validate and continue</span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M14 7l5 5-5 5" /></svg>
                </button>
              </div>
              <div class="connected-summary is-hidden" id="harvest-connected-summary">
                <span class="check">✓</span><div><strong>Harvest is connected</strong><p id="harvest-connected-detail">Your credentials are ready.</p></div>
              </div>
              <details class="advanced-oauth">
                <summary><span>Advanced OAuth (optional)</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 9 5 5 5-5" /></svg></summary>
                <p>If your companion has Harvest OAuth credentials configured, you can <a href="/auth/harvest/start">connect with Harvest OAuth</a> instead of storing a personal access token.</p>
              </details>
              <div class="resource-links" aria-label="Harvest resources">
                <a href="https://id.getharvest.com" target="_blank" rel="noopener noreferrer"><span><strong>Open Harvest</strong><small>Sign in or choose the account you want to use</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg></a>
                <a href="https://support.getharvest.com/hc/en-us/articles/26871883335821-Tracking-time-in-Harvest" target="_blank" rel="noopener noreferrer"><span><strong>How Harvest time tracking works</strong><small>Read Harvest's guide to timesheets and timers</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></svg></a>
              </div>
            </article>
            <span class="sr-only" id="setup-jira-badge">Checking</span>
          </section>

          <section class="page is-hidden" data-page="connections">
            <p class="eyebrow">Connections</p><h1>Services on this computer</h1><p class="lede">See what is connected, where it is managed, and what HarvestTime can use.</p>
            <div class="card-grid">
              <article class="status-card"><div class="card-icon harvest">H</div><div><h2>Harvest</h2><p id="connection-harvest">Checking connection…</p></div><span class="status-badge" id="connection-harvest-badge">Checking</span></article>
              <article class="status-card"><div class="card-icon jira">J</div><div><h2>Jira</h2><p id="connection-jira">Checking optional enrichment…</p></div><span class="status-badge subtle" id="connection-jira-badge">Checking</span></article>
            </div>
            <article class="panel jira-setup-guide">
              <h2>Optional Jira enrichment</h2>
              <p>Jira verification replaces noisy browser titles with the ticket summary, status, type, project, and assignee. It never blocks timers, detection, or manual entries, so leaving Jira off is a valid completed setup.</p>
              <ol class="instruction-list">
                <li><span>1</span><div><strong>Create an Atlassian API token</strong><p>Name it HarvestTime, choose an appropriate expiry, then copy it. Atlassian shows the token only once.</p></div></li>
                <li><span>2</span><div><strong>Add four values to the companion environment</strong><p>Set your Jira site URL, login email, API token, and enable verification. The token stays in the local companion and is never sent to this page.</p></div></li>
                <li><span>3</span><div><strong>Restart the companion</strong><p>Open Health and restart once so the local service reads the new environment values.</p></div></li>
              </ol>
              <div class="config-example" aria-label="Jira environment example"><code>JIRA_VERIFY_ISSUES=true<br />JIRA_SITE_URL=https://your-site.atlassian.net<br />JIRA_EMAIL=you@example.com<br />JIRA_API_TOKEN=your-token</code></div>
              <div class="inline-actions">
                <a class="secondary-action" href="https://id.atlassian.com/manage-profile/security/api-tokens" target="_blank" rel="noopener noreferrer">Create Atlassian token ↗</a>
                <a class="text-action" href="https://github.com/lcherone/harvest-time-companion#optional-jira-enrichment" target="_blank" rel="noopener noreferrer">Read the full Jira setup guide ↗</a>
              </div>
            </article>
            <article class="panel"><h2>Credential boundary</h2><p>Secrets are kept by the local Node companion. The extension receives connection status and account IDs, never access tokens.</p><button type="button" class="danger-link is-hidden" id="disconnect-harvest">Disconnect locally managed Harvest credentials</button></article>
          </section>

          <section class="page is-hidden" data-page="review">
            <p class="eyebrow">Step 5 of 5</p>
            <h1>You’re ready to review your day</h1>
            <p class="lede" id="review-ready-reason">HarvestTime has the local services it needs. Return to the extension to check today’s evidence before anything new is added to Harvest.</p>
            <div class="review-ready-banner">
              <span aria-hidden="true">✓</span>
              <div><strong>Setup complete</strong><p>Review is the normal working stage, not another configuration task. Jira can remain off because it only adds optional ticket detail.</p></div>
            </div>
            <ol class="review-flow" aria-label="How daily review works">
              <li><span>1</span><div><strong>Open the HarvestTime extension</strong><p>Select the leaf icon in Chrome’s toolbar. The side panel gathers today’s active-tab and same-day browser-history metadata.</p></div></li>
              <li><span>2</span><div><strong>Check each Daily entry</strong><p>Confirm the suggested start and end, project, task, and note. Browser suggestions remain local until you deliberately apply them.</p></div></li>
              <li><span>3</span><div><strong>Send only approved time to Harvest</strong><p>Applying a suggestion creates the Harvest entry. Existing Harvest rows appear alongside local suggestions so overlaps and missing time are easy to spot.</p></div></li>
            </ol>
            <div class="review-actions">
              <a class="primary-external-action" href="https://id.getharvest.com" target="_blank" rel="noopener noreferrer">Open Harvest <span aria-hidden="true">↗</span></a>
              <a class="secondary-action" href="#history">Review previous days</a>
            </div>
            <p class="review-privacy-note"><strong>Nothing automatic:</strong> browsing evidence never starts a timer or writes to Harvest. Timer changes and time-entry creation always require an explicit action in the extension.</p>
          </section>

          <section class="page is-hidden" data-page="history" aria-labelledby="history-title">
            <div class="history-heading">
              <div>
                <p class="eyebrow">Local history</p>
                <h1 id="history-title" tabindex="-1">Previous days</h1>
                <p class="lede">Review completed days, spot overlapping or incomplete time, and confirm what reached Harvest.</p>
              </div>
              <button class="history-clear-button" id="history-clear-button" type="button" disabled>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>
                <span>Remove all history</span>
              </button>
            </div>

            <section class="history-summary is-hidden" id="history-summary" aria-label="Previous-day history summary">
              <div><strong id="history-day-count">0</strong><span>Previous days</span></div>
              <div><strong id="history-time-total">0m</strong><span>Recorded time</span></div>
              <div><strong id="history-entry-count">0</strong><span>Time entries</span></div>
              <div class="history-summary-attention"><strong id="history-attention-count">0</strong><span>Needs review</span></div>
            </section>

            <div class="history-tools is-hidden" id="history-tools">
              <div class="history-filter" role="group" aria-label="Filter previous-day entries">
                <button class="is-active" type="button" data-history-filter="all" aria-pressed="true">All entries</button>
                <button type="button" data-history-filter="attention" aria-pressed="false">Needs review</button>
              </div>
              <div class="history-tool-actions">
                <span id="history-result-summary" aria-live="polite">Showing all entries</span>
                <button class="history-expand-button" id="history-expand-button" type="button">Expand all</button>
              </div>
            </div>

            <div class="history-list" id="history-list" role="region" aria-label="Previous-day entries" aria-live="polite" aria-busy="true">
              <div class="history-state" role="status"><span class="history-spinner" aria-hidden="true"></span><strong>Loading previous days…</strong></div>
            </div>

            <dialog class="confirmation-dialog" id="history-clear-dialog" aria-labelledby="history-clear-title" aria-describedby="history-clear-description">
              <div class="dialog-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>
              </div>
              <h2 id="history-clear-title">Remove all previous-day history?</h2>
              <p id="history-clear-description">This permanently removes the locally stored previous days shown here. Today’s work, companion settings, credentials, and entries already on Harvest are not affected.</p>
              <p class="dialog-error is-hidden" id="history-clear-error" role="alert"></p>
              <div class="dialog-actions">
                <button class="secondary-button" id="history-clear-cancel" type="button">Cancel</button>
                <button class="danger-button" id="history-clear-confirm" type="button">Remove history</button>
              </div>
            </dialog>
          </section>

          <section class="page is-hidden" data-page="settings">
            <p class="eyebrow">Detection settings</p><h1>Ticket matching</h1><p class="lede">These rules influence future detections. Saved changes take effect after the companion restarts.</p>
            <article class="detection-explainer">
              <h2>How work detection works</h2>
              <p>HarvestTime reads compact metadata from the active tab and same-day browser history—URL, title, and visit time—then matches it against the rules below. It does not read page content.</p>
              <dl>
                <div><dt>Ticket pattern</dt><dd>Finds keys such as <code>ABC-123</code> in a title or URL.</dd></div>
                <div><dt>Jira hosts</dt><dd>Recognises ticket pages and can add verified Jira detail when step 3 is configured.</dd></div>
                <div><dt>GitHub hosts</dt><dd>Recognises issue and pull-request work without treating GitHub as a Harvest external link.</dd></div>
                <div><dt>Other work domains</dt><dd>Marks internal tools or client sites as useful work evidence even when no ticket key is present.</dd></div>
              </dl>
              <p class="detection-boundary"><strong>Detection suggests; you decide.</strong> It can prepare a review row, but it never starts, switches, stops, or submits time by itself.</p>
            </article>
            <form class="panel form-stack" id="matching-form">
              <label for="ticket-regex">Ticket key pattern</label><input id="ticket-regex" name="ticketKeyRegex" required />
              <label for="jira-hosts">Jira hosts <small>one per line</small></label><textarea id="jira-hosts" name="jiraHosts" rows="4"></textarea>
              <label for="github-hosts">GitHub hosts <small>one per line</small></label><textarea id="github-hosts" name="githubHosts" rows="3"></textarea>
              <label for="work-hosts">Other work domains <small>one per line</small></label><textarea id="work-hosts" name="genericWorkDomains" rows="3"></textarea>
              <div class="form-footer"><p>Environment values remain authoritative and are shown as managed where applicable.</p><button type="submit">Save</button></div>
            </form>
          </section>

          <section class="page is-hidden" data-page="health">
            <p class="eyebrow">Companion health</p><h1>Local service status</h1><p class="lede">Useful checks when the extension cannot connect or a timer looks out of sync.</p>
            <dl class="health-list">
              <div><dt>Service</dt><dd id="health-service">Checking…</dd></div>
              <div><dt>Companion version</dt><dd id="health-version">—</dd></div>
              <div><dt>Uptime</dt><dd id="health-uptime">—</dd></div>
              <div><dt>Data directory</dt><dd class="health-path" id="health-data-directory">Checking…</dd></div>
              <div><dt>Session expires</dt><dd id="health-session">—</dd></div>
            </dl>
            <article class="companion-explainer">
              <h2>What the companion is for</h2>
              <p>The companion is a small Node.js service that runs only on this computer. It securely connects the Chrome extension to Harvest, stores local review evidence, and keeps Harvest and Jira credentials out of the browser extension.</p>
              <ul>
                <li><strong>Private:</strong> credentials and activity stay in the local data directory shown above.</li>
                <li><strong>Required:</strong> the extension needs this local bridge to talk to Harvest and build the review view.</li>
                <li><strong>Recoverable:</strong> installation, service control, updates, and troubleshooting are documented in the public companion repository.</li>
              </ul>
              <div class="inline-actions">
                <a class="secondary-action" href="https://github.com/lcherone/harvest-time-companion#one-time-installation" target="_blank" rel="noopener noreferrer">Installation guide ↗</a>
                <a class="text-action" href="https://github.com/lcherone/harvest-time-companion/releases/latest" target="_blank" rel="noopener noreferrer">Download latest release ↗</a>
              </div>
            </article>
            <div class="callout health-restart">
              <div class="health-restart-heading">
                <span class="health-restart-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.8-2L20 12M4 12l2.1 5a7 7 0 0 0 11.8-2" /></svg></span>
                <div><strong>Need to reload changes?</strong><p>Restart the local companion to reload <code>.env</code> and saved configuration. Your settings, credentials, history, and Harvest entries stay in place.</p></div>
              </div>
              <div class="restart-actions">
                <button class="restart-button" id="restart-button" type="button" disabled><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.8-2L20 12M4 12l2.1 5a7 7 0 0 0 11.8-2" /></svg><span>Checking restart…</span></button>
                <small id="restart-availability" role="status">Checking the installed background service…</small>
              </div>
              <details class="restart-fallback" id="restart-fallback">
                <summary>Command-line fallback</summary>
                <p>If service control is unavailable, reinstall or start the per-user service with:</p>
                <div class="restart-command"><strong>macOS or Linux</strong><code>npm run service:install --prefix "$HOME/.harvest-time/companion"</code></div>
                <div class="restart-command"><strong>Windows PowerShell</strong><code>npm.cmd run service:install --prefix "$env:USERPROFILE&#92;.harvest-time&#92;companion"</code></div>
              </details>
              <p class="restart-status is-hidden" id="restart-status" role="status" tabindex="-1"></p>
            </div>
            <dialog class="confirmation-dialog restart-dialog" id="restart-dialog" aria-labelledby="restart-dialog-title" aria-describedby="restart-dialog-description">
              <div class="dialog-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.8-2L20 12M4 12l2.1 5a7 7 0 0 0 11.8-2" /></svg></div>
              <h2 id="restart-dialog-title">Restart the local companion?</h2>
              <p id="restart-dialog-description">The extension will be offline briefly while a fresh companion process reloads <code>.env</code> and saved configuration. This secure manager session will end, so reopen Companion manager from the extension afterwards.</p>
              <p class="dialog-note"><strong>No local data or Harvest entries will be deleted.</strong></p>
              <p class="dialog-error is-hidden" id="restart-error" role="alert"></p>
              <div class="dialog-actions">
                <button class="secondary-button" id="restart-cancel" type="button">Cancel</button>
                <button id="restart-confirm" type="button">Restart companion</button>
              </div>
            </dialog>
          </section>
        </div>

        <aside class="help-rail">
          <div data-help-page="default">
            <h2>What you need</h2>
            <ul class="check-list desktop-needs"><li>Sign in to Harvest.</li><li>Create a Personal Access Token with read-only access.</li><li>Copy the token and paste it here.</li></ul>
            <ol class="mobile-needs"><li>Log in to Harvest.</li><li>Go to Your profile &gt; Developers.</li><li>Create a <a href="https://id.getharvest.com/developers" target="_blank" rel="noopener noreferrer">Personal Access Token</a> with read-only account access.</li><li>Copy the token and paste it above.</li></ol>
            <hr />
            <h3 class="security-title"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>Stored locally</h3><p>Your token and settings are stored only on this computer in <code class="help-data-directory" id="storage-data-directory">the companion data directory</code>. Nothing is sent to HarvestTime servers.</p>
            <a href="https://github.com/lcherone/harvest-time-companion/blob/master/SECURITY.md" target="_blank" rel="noopener noreferrer">Learn more ↗</a>
          </div>
          <div class="is-hidden" data-help-page="history">
            <p class="eyebrow">Previous days</p><h2>Entry status</h2>
            <ul class="history-legend">
              <li><span class="history-legend-mark is-harvest"></span><div><strong>On Harvest</strong><small>Already recorded on your timesheet</small></div></li>
              <li><span class="history-legend-mark is-local"></span><div><strong>Local only</strong><small>Review before adding it to Harvest</small></div></li>
              <li><span class="history-legend-mark is-attention"></span><div><strong>Needs review</strong><small>Missing time or overlaps another entry</small></div></li>
            </ul>
            <hr />
            <h3 class="security-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" /></svg>Removal boundary</h3><p>Remove all history clears previous-day records only. Today’s work, settings, credentials, cache, and entries already on Harvest stay in place.</p>
          </div>
          <div class="is-hidden" data-help-page="connections">
            <p class="eyebrow">Step 3</p><h2>Jira is optional</h2>
            <p>Skip this step if HarvestTime already recognises your work clearly. Enable it only when verified ticket summaries and statuses make review more useful.</p>
            <hr />
            <h3>What the token can see</h3><p>HarvestTime uses Jira credentials only to look up a detected issue. The manager reports readiness but never receives or displays the token.</p>
          </div>
          <div class="is-hidden" data-help-page="settings">
            <p class="eyebrow">Step 4</p><h2>Start with the defaults</h2>
            <p>The default ticket pattern covers common Jira keys. Add domains only when a real work page is not being recognised.</p>
            <hr />
            <h3>After saving</h3><p>Restart from Health before testing the new rules, then reopen the extension on a matching page.</p>
          </div>
          <div class="is-hidden" data-help-page="review">
            <p class="eyebrow">Why step 5?</p><h2>This means ready</h2>
            <p>The companion is running, Harvest is connected, and matching rules are available. Jira is either ready or intentionally optional, so setup no longer needs attention.</p>
            <hr />
            <h3>Where review happens</h3><p>Today’s detailed review stays in the Chrome side panel. This manager handles setup, previous days, matching, and local service health.</p>
          </div>
          <div class="is-hidden" data-help-page="health">
            <p class="eyebrow">Service control</p><h2>Restart safely</h2>
            <ul class="check-list"><li>Save any setup or matching changes.</li><li>Confirm the restart on this page.</li><li>Wait for recovery, then reopen the manager from the extension.</li></ul>
            <hr />
            <h3 class="security-title"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5M6.1 9a7 7 0 0 1 11.8-2L20 12M4 12l2.1 5a7 7 0 0 0 11.8-2" /></svg>Local process only</h3><p>Restart replaces the companion process on this computer. It does not delete local data or change entries already on Harvest.</p>
          </div>
        </aside>

        <section class="connection-overview" aria-labelledby="connection-overview-title">
          <h2 id="connection-overview-title">Connection status</h2>
          <div class="connection-row"><span class="connection-dot is-ready"></span><strong>Companion</strong><span class="overview-status is-ready" id="overview-companion">Connected</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></div>
          <div class="connection-row"><span class="connection-dot" id="overview-harvest-dot"></span><strong>Harvest</strong><span id="overview-harvest">Checking</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></div>
          <div class="connection-row"><span class="connection-dot" id="overview-jira-dot"></span><strong>Jira</strong><span id="overview-jira">Checking</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></div>
          <div class="connection-row"><span class="connection-dot is-info"></span><strong>Work detection</strong><span class="overview-status is-info">Using defaults</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6" /></svg></div>
        </section>
      </div>
    </main>
    <script src="/setup/assets/manager.js" defer></script>
  </body>
</html>`;
