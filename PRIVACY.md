# HarvestTime Privacy Policy

Last updated: 10 July 2026

HarvestTime is a browser extension and local companion service that helps users reconstruct,
review, and submit work time entries. This policy describes the information handled by HarvestTime.

## Information HarvestTime Handles

- Same-day browser history metadata, including timestamps, page URLs, page titles, and host names.
- Active-tab metadata used to identify Jira issues, GitHub work, and configured work domains.
- Jira issue IDs or branch names detected from clipboard text while the side panel is open. Other
  clipboard text is ignored and is not retained.
- Time-entry details entered or edited by the user, including times, notes, projects, and tasks.
- The local companion URL stored through Chrome synchronized storage.

HarvestTime does not read page bodies, passwords, cookies, form contents, or payment information.

## Use and Sharing

The information is used only to detect work context, group activity, construct time suggestions,
operate timers, and submit entries that the user reviews and approves. The extension sends it only
to the companion at `http://127.0.0.1:8787` on the same computer. The developer does not receive it
and does not operate a remote HarvestTime data service.

When explicitly configured by the user, Harvest receives OAuth requests and approved time entries,
Jira receives issue-key lookups, and Chrome may synchronize the configured companion URL through
the user's Google account. HarvestTime does not sell user data or use it for advertising, profiling,
or unrelated analytics.

## Storage and Retention

Activity, configuration, OAuth tokens, and optional credentials are stored locally. Users control
retention and can delete local state by removing `apps/api/data/` and `.harvest-time/` from the
companion installation.

## Limited Use

Use of information received from Google APIs adheres to the Chrome Web Store User Data Policy,
including its Limited Use requirements.

## Security

The companion binds to the loopback interface by default. Users should not expose its port to a
local network or the public internet. Credentials and local data must never be committed.

## Contact

Questions or privacy requests: `lawrence@d3r.com`

Project support: `https://github.com/lcherone/harvest-time-companion/issues`
