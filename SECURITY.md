# Security

HarvestTime Companion is designed to run only on `127.0.0.1`. Do not bind it to a public or shared
network interface.

Never commit `.env`, `.harvest-time/`, `apps/api/data/config.json`,
`apps/api/data/auth.local.json`, daily JSON files, OAuth tokens, Jira tokens, or extension signing
keys.

Report security issues privately to `lawrence@d3r.com`. Do not include credentials,
tokens, browser history, or customer data in a public issue.
