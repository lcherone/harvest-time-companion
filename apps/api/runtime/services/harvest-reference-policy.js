/**
 * Owns the only external-reference policy used at the Harvest boundary.
 * Harvest links are either a canonical Jira browse URL or are omitted.
 */
export class HarvestReferencePolicy {
    jiraSite;
    ticketKeyRegex;
    constructor(options) {
        this.jiraSite = parseHttpUrl(options.jiraSiteUrl);
        this.ticketKeyRegex = new RegExp(options.ticketKeyRegex, "i");
    }
    fromContext(context) {
        if (!context || context.source !== "jira" || context.jira?.verified === false) {
            return undefined;
        }
        const key = this.findTicketKey(context.key);
        const candidateUrl = context.jira?.url ?? context.permalink ?? context.url;
        const candidate = parseHttpUrl(candidateUrl);
        if (!key || !candidate || !this.isAllowedJiraUrl(candidate, key)) {
            return undefined;
        }
        return this.buildReference(key, candidate.origin);
    }
    fromTicketKey(value) {
        const key = this.findTicketKey(value);
        if (!key || !this.jiraSite) {
            return undefined;
        }
        return this.buildReference(key, this.jiraSite.origin);
    }
    fromText(value) {
        return this.fromTicketKey(this.getTicketKey(value));
    }
    getTicketKey(value) {
        return this.findTicketKey(value);
    }
    sanitize(reference) {
        const key = this.findTicketKey(reference?.id);
        const permalink = parseHttpUrl(reference?.permalink ?? undefined);
        if (!key || !permalink || !this.isAllowedJiraUrl(permalink, key)) {
            return undefined;
        }
        return this.buildReference(key, permalink.origin);
    }
    findTicketKey(value) {
        if (!value) {
            return null;
        }
        this.ticketKeyRegex.lastIndex = 0;
        return this.ticketKeyRegex.exec(value)?.[0]?.toUpperCase() ?? null;
    }
    isAllowedJiraUrl(url, key) {
        if (this.jiraSite && url.hostname !== this.jiraSite.hostname) {
            return false;
        }
        const browseKey = /^\/browse\/([^/?#]+)/i.exec(url.pathname)?.[1]?.toUpperCase();
        return browseKey === key;
    }
    buildReference(key, origin) {
        return {
            id: key,
            permalink: `${origin}/browse/${encodeURIComponent(key)}`,
            service: "jira"
        };
    }
}
function parseHttpUrl(value) {
    if (!value) {
        return null;
    }
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    }
    catch {
        return null;
    }
}
