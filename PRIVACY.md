# HarvestTime Privacy Policy

Last updated: 9 July 2026

HarvestTime is a browser extension and local companion service that helps users reconstruct,
review, and submit work time entries. This policy describes the information handled by HarvestTime.

## Information HarvestTime Handles

HarvestTime may process the following information when required for its time-entry workflow:

- Same-day browser history metadata, including timestamps, page URLs, page titles, and host names.
- Active-tab metadata used to identify Jira issues, GitHub work, and configured work domains.
- Jira issue IDs or branch names detected from clipboard text while the side panel is open. Other
  clipboard text is ignored and is not retained.
- Time-entry details entered or edited by the user, including start and end times, notes, project,
  and task selections.
- The local companion URL stored through Chrome synchronized storage.

HarvestTime does not read page bodies, passwords, cookies, form contents, or payment information.

## How Information Is Used

This information is used only to detect work context, group related activity, construct daily time
entry suggestions, operate timers, and submit entries that the user reviews and approves.

The extension sends this information only to the HarvestTime companion service at
`http://127.0.0.1:8787` on the same computer. The developer does not receive this information and
does not operate a remote HarvestTime data service.

## Optional Third-Party Services

When the user explicitly configures a third-party integration:

- Harvest receives OAuth requests and the time entries the user chooses to submit.
- Jira receives issue-key lookup requests when optional Jira verification is enabled.
- Chrome may synchronize the configured companion URL through the user's Google account using
  Chrome synchronized storage.

Harvest and Jira handle information according to their own privacy policies. HarvestTime does not
sell user data or use it for advertising, profiling, or unrelated analytics.

## Storage And Retention

Daily activity and configuration are stored locally on the user's computer. Harvest OAuth tokens
and optional credentials are also stored locally and are excluded from the public repository.
Users control retention and can delete local HarvestTime data by removing `apps/api/data/` and
`.harvest-time/` from the companion installation.

## Data Sharing

HarvestTime does not share information with the developer or unrelated third parties. Information
is sent to Harvest or Jira only when the user enables those integrations and performs the related
workflow.

## Limited Use

The use of information received from Google APIs will adhere to the Chrome Web Store User Data
Policy, including the Limited Use requirements.

## Security

The companion service binds to the loopback interface by default. Users should not expose its port
to a local network or the public internet. Credentials and local data must never be committed to a
public repository.

## Contact

Questions or privacy requests: `lawrence@d3r.com`

Project support: `https://github.com/lcherone/harvest-time-companion/issues`
