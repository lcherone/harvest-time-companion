const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
export class GatedJiraIssueResolver {
    config;
    fetchImpl;
    now;
    cacheTtlMs;
    cache = new Map();
    constructor(config, options = {}) {
        this.config = config;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.now = options.now ?? (() => new Date());
        this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    }
    async getStatus() {
        return getJiraVerificationStatus(this.config);
    }
    async enrichContext(context) {
        const status = getJiraVerificationStatus(this.config);
        if (!canAttemptJiraVerification(status, context)) {
            return context;
        }
        const verifiedAt = this.now().toISOString();
        const lookupResult = await this.lookupIssue(context.key);
        if (lookupResult.kind === "failed") {
            return {
                ...context,
                jira: {
                    ...context.jira,
                    verified: false,
                    verificationStatus: "failed",
                    verifiedAt,
                    error: lookupResult.error
                }
            };
        }
        const { issue } = lookupResult;
        const issueKey = issue.key || context.key;
        const siteUrl = normalizeJiraSiteUrl(this.config.JIRA_SITE_URL);
        const jiraUrl = issue.url ?? (siteUrl ? `${siteUrl}/browse/${issueKey}` : context.permalink);
        const jiraMetadata = {
            verified: true,
            verificationStatus: "verified",
            verifiedAt
        };
        if (issue.summary) {
            jiraMetadata.summary = issue.summary;
        }
        if (issue.status) {
            jiraMetadata.status = issue.status;
        }
        if (issue.issueType) {
            jiraMetadata.issueType = issue.issueType;
        }
        if (issue.projectKey) {
            jiraMetadata.projectKey = issue.projectKey;
        }
        if (issue.projectName) {
            jiraMetadata.projectName = issue.projectName;
        }
        if (issue.assigneeName) {
            jiraMetadata.assigneeName = issue.assigneeName;
        }
        if (jiraUrl) {
            jiraMetadata.url = jiraUrl;
        }
        return {
            ...context,
            id: `ticket:${issueKey}`,
            key: issueKey,
            title: issue.summary ?? context.title,
            confidence: Math.max(context.confidence, 0.98),
            permalink: jiraUrl ?? context.permalink,
            jira: jiraMetadata
        };
    }
    async lookupIssue(key) {
        const normalizedKey = key.trim().toUpperCase();
        const cached = this.cache.get(normalizedKey);
        const nowMs = this.now().getTime();
        if (cached && cached.expiresAtMs > nowMs) {
            return cached.result;
        }
        const result = await this.fetchIssue(normalizedKey);
        this.cache.set(normalizedKey, {
            expiresAtMs: nowMs + this.cacheTtlMs,
            result
        });
        return result;
    }
    async fetchIssue(key) {
        const siteUrl = normalizeJiraSiteUrl(this.config.JIRA_SITE_URL);
        if (!siteUrl) {
            return {
                kind: "failed",
                error: "Jira site URL is missing"
            };
        }
        if (!this.config.JIRA_EMAIL || !this.config.JIRA_API_TOKEN) {
            return {
                kind: "failed",
                error: "Jira email or API token is missing"
            };
        }
        try {
            const issueUrl = new URL(`/rest/api/3/issue/${encodeURIComponent(key)}`, `${siteUrl}/`);
            issueUrl.searchParams.set("fields", "summary,status,issuetype,project,assignee");
            issueUrl.searchParams.set("fieldsByKeys", "true");
            const response = await this.fetchImpl(issueUrl.toString(), {
                headers: {
                    accept: "application/json",
                    authorization: `Basic ${encodeBasicAuth(this.config.JIRA_EMAIL, this.config.JIRA_API_TOKEN)}`
                }
            });
            if (!response.ok) {
                return {
                    kind: "failed",
                    error: formatJiraHttpError(response)
                };
            }
            return {
                kind: "verified",
                issue: parseJiraIssue(await response.json(), key, siteUrl)
            };
        }
        catch (error) {
            return {
                kind: "failed",
                error: getErrorMessage(error)
            };
        }
    }
}
export function getJiraVerificationStatus(config) {
    if (!config.JIRA_VERIFY_ISSUES) {
        return {
            enabled: false,
            configured: false,
            authSource: "none",
            reason: "disabled"
        };
    }
    if (!config.JIRA_SITE_URL) {
        return {
            enabled: true,
            configured: false,
            authSource: "none",
            reason: "missing-site-url"
        };
    }
    if (config.JIRA_EMAIL && config.JIRA_API_TOKEN) {
        return {
            enabled: true,
            configured: true,
            authSource: "basic",
            reason: "ready"
        };
    }
    return {
        enabled: true,
        configured: false,
        authSource: "none",
        reason: "missing-auth"
    };
}
function canAttemptJiraVerification(status, context) {
    return status.configured && context.trackable && context.kind === "jira-issue";
}
function normalizeJiraSiteUrl(value) {
    const trimmed = value?.trim().replace(/\/+$/, "");
    if (!trimmed) {
        return null;
    }
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const url = new URL(withProtocol);
        url.pathname = url.pathname.replace(/\/+$/, "");
        url.search = "";
        url.hash = "";
        return url.toString().replace(/\/+$/, "");
    }
    catch {
        return null;
    }
}
function encodeBasicAuth(email, apiToken) {
    return Buffer.from(`${email}:${apiToken}`, "utf8").toString("base64");
}
function formatJiraHttpError(response) {
    const suffix = response.statusText ? ` ${response.statusText}` : "";
    return `Jira API request failed: ${response.status}${suffix}`;
}
function parseJiraIssue(payload, fallbackKey, siteUrl) {
    const root = isRecord(payload) ? payload : {};
    const fields = isRecord(root.fields) ? root.fields : {};
    const key = getString(root.key) ?? fallbackKey;
    const summary = getString(fields.summary);
    const status = getNamedField(fields.status);
    const issueType = getNamedField(fields.issuetype);
    const project = isRecord(fields.project) ? fields.project : {};
    const assignee = isRecord(fields.assignee) ? fields.assignee : {};
    const snapshot = {
        key,
        url: `${siteUrl}/browse/${key}`
    };
    if (summary) {
        snapshot.summary = summary;
    }
    if (status) {
        snapshot.status = status;
    }
    if (issueType) {
        snapshot.issueType = issueType;
    }
    const projectKey = getString(project.key);
    if (projectKey) {
        snapshot.projectKey = projectKey;
    }
    const projectName = getString(project.name);
    if (projectName) {
        snapshot.projectName = projectName;
    }
    const assigneeName = getString(assignee.displayName);
    if (assigneeName) {
        snapshot.assigneeName = assigneeName;
    }
    return snapshot;
}
function getNamedField(value) {
    return isRecord(value) ? getString(value.name) : undefined;
}
function getString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Jira API request failed";
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
