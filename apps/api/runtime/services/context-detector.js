import { DEFAULT_GENERIC_WORK_DOMAINS, DEFAULT_GITHUB_HOSTS, DEFAULT_JIRA_HOSTS, DEFAULT_TICKET_KEY_REGEX, MatchingHostRuleListSchema, TicketKeyRegexSchema, matchesHostRule } from "@harvest-time/shared";
export class ContextDetector {
    genericWorkDomains;
    githubHosts;
    jiraHosts;
    now;
    ticketKeyPattern;
    constructor(options) {
        this.ticketKeyPattern = TicketKeyRegexSchema.parse(options.ticketKeyRegex ?? options.jiraKeyRegex ?? DEFAULT_TICKET_KEY_REGEX);
        this.jiraHosts = MatchingHostRuleListSchema.parse(options.jiraHosts ?? DEFAULT_JIRA_HOSTS);
        this.githubHosts = MatchingHostRuleListSchema.parse(options.githubHosts ?? DEFAULT_GITHUB_HOSTS);
        this.genericWorkDomains = MatchingHostRuleListSchema.parse(options.genericWorkDomains ?? DEFAULT_GENERIC_WORK_DOMAINS);
        this.now = options.now ?? (() => new Date());
    }
    detect(payload) {
        const detectedAt = payload.occurredAt ?? this.now().toISOString();
        const parsedUrl = parseTabUrl(payload.url);
        const title = normalizeWhitespace(payload.title);
        const jiraContext = this.detectJiraIssue(payload, parsedUrl, detectedAt, title);
        if (jiraContext) {
            return jiraContext;
        }
        const githubContext = this.detectGitHubContext(payload, parsedUrl, detectedAt, title);
        if (githubContext) {
            return githubContext;
        }
        const genericContext = this.detectGenericTicket(payload, parsedUrl, detectedAt, title);
        if (genericContext) {
            return genericContext;
        }
        return {
            id: "unknown",
            trackable: false,
            kind: "unknown",
            source: "unknown",
            confidence: 0,
            detectedAt,
            title: title ?? undefined,
            url: payload.url,
            host: parsedUrl?.hostname,
            reason: "No ticket context detected"
        };
    }
    detectClipboardTicket(payload) {
        const detectedAt = payload.occurredAt ?? this.now().toISOString();
        const key = this.findWholeTicketKey(payload.key) ??
            this.findTicketKeyInEvidence([payload.title, payload.url]);
        const parsedUrl = payload.url ? parseTabUrl(payload.url) : null;
        const title = normalizeWhitespace(payload.title) ?? key ?? normalizeWhitespace(payload.key);
        if (!key) {
            return {
                id: "unknown",
                trackable: false,
                kind: "unknown",
                source: "unknown",
                confidence: 0,
                detectedAt,
                title: title ?? undefined,
                url: payload.url ?? `clipboard://ticket/${encodeURIComponent(payload.key)}`,
                host: parsedUrl?.hostname ?? "clipboard",
                reason: "Clipboard did not contain a supported ticket key"
            };
        }
        const jiraUrl = parsedUrl && matchesHostRule(parsedUrl.hostname, this.jiraHosts) ? parsedUrl : null;
        const fallbackUrl = `clipboard://ticket/${encodeURIComponent(key)}`;
        const url = payload.url ?? fallbackUrl;
        const host = jiraUrl?.hostname ?? "clipboard";
        const context = this.createTrackableContext({
            id: `ticket:${key}`,
            kind: "jira-issue",
            source: "jira",
            key,
            title: title ?? key,
            url,
            host,
            confidence: jiraUrl ? 0.9 : title && title !== key ? 0.84 : 0.78,
            detectedAt
        });
        if (jiraUrl) {
            context.permalink = `${jiraUrl.origin}/browse/${key}`;
        }
        return context;
    }
    detectJiraIssue(payload, parsedUrl, detectedAt, title) {
        if (!parsedUrl) {
            return null;
        }
        if (!matchesHostRule(parsedUrl.hostname, this.jiraHosts)) {
            return null;
        }
        const evidence = this.findJiraTicketEvidence(parsedUrl, payload.url, title);
        if (!evidence) {
            return null;
        }
        const { key } = evidence;
        return this.createTrackableContext({
            id: `ticket:${key}`,
            kind: "jira-issue",
            source: "jira",
            key,
            title: title ?? key,
            url: payload.url,
            host: parsedUrl.hostname,
            confidence: evidence.confidence,
            detectedAt,
            permalink: `${parsedUrl.origin}/browse/${key}`
        });
    }
    detectGitHubContext(payload, parsedUrl, detectedAt, title) {
        const match = parsedUrl ? parseGitHubIssueOrPullRequest(parsedUrl, this.githubHosts) : null;
        if (!match || !parsedUrl) {
            return null;
        }
        const kind = match.section === "pull" ? "github-pull-request" : "github-issue";
        const label = match.section === "pull" ? "PR" : "Issue";
        const githubKey = `${match.owner}/${match.repo}#${match.number}`;
        const ticketKey = this.findTicketKeyInEvidence([title, payload.url]);
        const key = ticketKey ?? githubKey;
        const fallbackTitle = `${githubKey} ${label}`;
        return this.createTrackableContext({
            id: ticketKey
                ? `ticket:${ticketKey}`
                : `github:${match.owner}/${match.repo}:${match.section}:${match.number}`,
            kind,
            source: "github",
            key,
            title: title ?? fallbackTitle,
            url: payload.url,
            host: parsedUrl.hostname,
            confidence: ticketKey ? 0.92 : 0.88,
            detectedAt,
            permalink: `${parsedUrl.origin}/${match.owner}/${match.repo}/${match.section}/${match.number}`
        });
    }
    detectGenericTicket(payload, parsedUrl, detectedAt, title) {
        if (!matchesHostRule(parsedUrl?.hostname, this.genericWorkDomains)) {
            return null;
        }
        const evidence = [title, decodeUrlEvidence(payload.url)].filter((value) => Boolean(value));
        const foundKey = evidence.map((value) => this.findTicketKey(value)).find(isPresent);
        const key = normalizeTicketKey(foundKey);
        if (!key) {
            return null;
        }
        return this.createTrackableContext({
            id: `ticket:${key}`,
            kind: "generic-ticket",
            source: "generic-ticket",
            key,
            title: title ?? key,
            url: payload.url,
            host: parsedUrl?.hostname ?? "unknown",
            confidence: 0.72,
            detectedAt,
            permalink: payload.url
        });
    }
    findTicketKey(value) {
        const match = new RegExp(this.ticketKeyPattern, "i").exec(value);
        const key = normalizeTicketKey(match?.[1] ?? match?.[0]);
        return key && this.matchesTicketKey(key) ? key : null;
    }
    findTicketKeyInEvidence(values) {
        return (values
            .map((value) => (value ? this.findTicketKey(decodeUrlEvidence(value)) : null))
            .find(isPresent) ?? null);
    }
    findJiraTicketEvidence(parsedUrl, rawUrl, title) {
        const browseKey = this.findWholeTicketKey(parsedUrl.pathname.match(/\/browse\/([^/?#]+)/i)?.[1]);
        if (browseKey) {
            return {
                key: browseKey,
                confidence: 0.95
            };
        }
        const selectedIssueKey = this.findSelectedIssueKey(parsedUrl);
        if (selectedIssueKey) {
            return {
                key: selectedIssueKey,
                confidence: 0.93
            };
        }
        const titleKey = title ? this.findTicketKey(title) : null;
        if (titleKey) {
            return {
                key: titleKey,
                confidence: 0.86
            };
        }
        const urlKey = this.findTicketKey(rawUrl);
        if (urlKey) {
            return {
                key: urlKey,
                confidence: 0.82
            };
        }
        return null;
    }
    findSelectedIssueKey(parsedUrl) {
        const selectedIssue = parsedUrl.searchParams.get("selectedIssue") ??
            getHashSearchParam(parsedUrl.hash, "selectedIssue");
        if (!selectedIssue) {
            return null;
        }
        return this.findWholeTicketKey(selectedIssue) ?? this.findTicketKey(selectedIssue);
    }
    findWholeTicketKey(value) {
        const key = normalizeTicketKey(value);
        return key && this.matchesTicketKey(key) ? key : null;
    }
    matchesTicketKey(value) {
        return new RegExp(`^(?:${this.ticketKeyPattern})$`, "i").test(value);
    }
    createTrackableContext(context) {
        return {
            ...context,
            trackable: true
        };
    }
}
function parseGitHubIssueOrPullRequest(url, githubHosts) {
    if (!matchesHostRule(url.hostname, githubHosts)) {
        return null;
    }
    const [owner, repo, section, number] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo || !number || (section !== "pull" && section !== "issues")) {
        return null;
    }
    if (!/^\d+$/.test(number)) {
        return null;
    }
    return {
        owner,
        repo,
        number,
        section
    };
}
function parseTabUrl(value) {
    try {
        return new URL(value);
    }
    catch {
        return null;
    }
}
function normalizeWhitespace(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized ? normalized : null;
}
function normalizeTicketKey(value) {
    if (!value) {
        return null;
    }
    const decoded = decodeUrlEvidence(value);
    const normalized = decoded.replace(/[^a-zA-Z0-9-]/g, "").toUpperCase();
    return normalized ? normalized : null;
}
function isPresent(value) {
    return Boolean(value);
}
function getHashSearchParam(hash, name) {
    const hashValue = hash.replace(/^#/, "");
    const queryStart = hashValue.indexOf("?");
    const query = queryStart === -1 ? hashValue : hashValue.slice(queryStart + 1);
    return new URLSearchParams(query).get(name);
}
function decodeUrlEvidence(value) {
    try {
        return decodeURIComponent(value);
    }
    catch {
        return value;
    }
}
