import { HttpError } from "../http/errors.js";
import { toLocalIsoDate } from "../storage/daily-store.js";
export class MockTimerAdapter {
    backend = "mock";
    async getStatus() {
        return {
            backend: this.backend,
            ready: true
        };
    }
    async createRunningEntry(store, input) {
        const harvestEntryId = store.state.nextMockHarvestEntryId;
        store.state.nextMockHarvestEntryId += 1;
        const entryId = `mock-${harvestEntryId}`;
        const timer = {
            entryId,
            mode: input.mode,
            backend: this.backend,
            startedAt: input.timestamp,
            description: input.description,
            context: input.context,
            mappingName: input.mapping.mappingName,
            harvestEntryId
        };
        store.harvestEntries.push({
            id: harvestEntryId,
            entryId,
            backend: this.backend,
            mode: input.mode,
            description: input.description,
            context: input.context,
            mappingName: input.mapping.mappingName,
            startedAt: input.timestamp,
            createdAt: input.timestamp,
            updatedAt: input.timestamp
        });
        store.state.runningTimer = timer;
        return timer;
    }
    async stopEntry(store, timer, timestamp) {
        const harvestEntry = store.harvestEntries.find((entry) => entry.entryId === timer.entryId);
        if (harvestEntry) {
            harvestEntry.stoppedAt = timestamp;
            harvestEntry.updatedAt = timestamp;
        }
        if (store.state.runningTimer?.entryId === timer.entryId) {
            store.state.runningTimer = null;
        }
        return timer;
    }
    async restartEntry(store, target, timestamp) {
        const existingEntry = store.harvestEntries.find((entry) => entry.entryId === target.entryId);
        const harvestEntry = existingEntry ?? this.createMissingHarvestEntry(store, target, timestamp);
        harvestEntry.mode = "work";
        harvestEntry.description = target.description;
        harvestEntry.context = target.context;
        harvestEntry.mappingName = target.mappingName;
        harvestEntry.updatedAt = timestamp;
        delete harvestEntry.stoppedAt;
        const timer = {
            entryId: target.entryId,
            mode: "work",
            backend: this.backend,
            startedAt: timestamp,
            description: target.description,
            context: target.context,
            mappingName: target.mappingName,
            harvestEntryId: harvestEntry.id
        };
        store.state.runningTimer = timer;
        return timer;
    }
    async listRunningEntries(store) {
        return store.harvestEntries
            .filter((entry) => (entry.backend ?? this.backend) === this.backend && !entry.stoppedAt)
            .map((entry) => ({
            backend: this.backend,
            entryId: entry.entryId,
            harvestEntryId: entry.id,
            description: entry.description,
            isRunning: true,
            timerStartedAt: entry.startedAt
        }));
    }
    createMissingHarvestEntry(store, target, timestamp) {
        const harvestEntryId = target.harvestEntryId ?? store.state.nextMockHarvestEntryId;
        if (harvestEntryId >= store.state.nextMockHarvestEntryId) {
            store.state.nextMockHarvestEntryId = harvestEntryId + 1;
        }
        const entry = {
            id: harvestEntryId,
            entryId: target.entryId,
            backend: this.backend,
            mode: "work",
            description: target.description,
            context: target.context,
            mappingName: target.mappingName,
            startedAt: target.startedAt,
            createdAt: target.startedAt,
            updatedAt: timestamp
        };
        store.harvestEntries.push(entry);
        return entry;
    }
}
export class HarvestTimerAdapter {
    backend = "harvest";
    harvestClient;
    constructor(options) {
        this.harvestClient = options.harvestClient;
    }
    async getStatus() {
        if (!this.harvestClient.isConfigured) {
            return {
                backend: this.backend,
                ready: true
            };
        }
        try {
            return {
                backend: this.backend,
                ready: await this.harvestClient.isConfigured()
            };
        }
        catch {
            return {
                backend: this.backend,
                ready: false
            };
        }
    }
    async createRunningEntry(store, input) {
        const timeEntry = await this.harvestClient.createTimeEntry(buildHarvestCreateTimeEntryRequest(input));
        const timer = this.toRunningTimer(timeEntry, input);
        this.upsertLocalEntry(store, timer, input.timestamp);
        store.state.runningTimer = timer;
        return timer;
    }
    async stopEntry(store, timer, timestamp) {
        const harvestEntryId = getRequiredHarvestEntryId(timer);
        await this.harvestClient.stopTimeEntry(harvestEntryId);
        const harvestEntry = store.harvestEntries.find((entry) => entry.entryId === timer.entryId);
        if (harvestEntry) {
            harvestEntry.stoppedAt = timestamp;
            harvestEntry.updatedAt = timestamp;
        }
        if (store.state.runningTimer?.entryId === timer.entryId) {
            store.state.runningTimer = null;
        }
        return timer;
    }
    async restartEntry(store, target, timestamp) {
        const harvestEntryId = getRequiredHarvestEntryId(target);
        const timeEntry = await this.harvestClient.restartTimeEntry(harvestEntryId);
        const timer = this.toRunningTimer(timeEntry, {
            context: target.context,
            description: target.description,
            mapping: {
                mappingName: target.mappingName
            },
            mode: "work",
            timestamp
        });
        this.upsertLocalEntry(store, timer, timestamp);
        store.state.runningTimer = timer;
        return timer;
    }
    async listRunningEntries(store) {
        void store;
        const response = await this.harvestClient.listTimeEntries({
            isRunning: true
        });
        return response.timeEntries.map((entry) => ({
            backend: this.backend,
            entryId: `harvest-${entry.id}`,
            harvestEntryId: entry.id,
            description: normalizeDescription(entry.notes, `Harvest entry ${entry.id}`),
            isRunning: entry.is_running,
            spentDate: entry.spent_date,
            timerStartedAt: entry.timer_started_at ?? undefined
        }));
    }
    toRunningTimer(timeEntry, input) {
        return {
            entryId: `harvest-${timeEntry.id}`,
            mode: input.mode,
            backend: this.backend,
            startedAt: toValidIsoTimestamp(timeEntry.timer_started_at, input.timestamp),
            description: input.description,
            context: input.context,
            mappingName: input.mapping.mappingName,
            harvestEntryId: timeEntry.id
        };
    }
    upsertLocalEntry(store, timer, timestamp) {
        const existingEntry = store.harvestEntries.find((entry) => entry.entryId === timer.entryId);
        const entry = {
            id: timer.harvestEntryId ?? getRequiredHarvestEntryId(timer),
            entryId: timer.entryId,
            backend: this.backend,
            mode: timer.mode,
            description: timer.description,
            context: timer.context,
            mappingName: timer.mappingName,
            startedAt: timer.startedAt,
            createdAt: existingEntry?.createdAt ?? timestamp,
            updatedAt: timestamp
        };
        if (existingEntry) {
            Object.assign(existingEntry, entry);
            delete existingEntry.stoppedAt;
            return;
        }
        store.harvestEntries.push(entry);
    }
}
export function isTimerAdapterHarvestClient(value) {
    return (isRecord(value) &&
        typeof value.createTimeEntry === "function" &&
        typeof value.stopTimeEntry === "function" &&
        typeof value.restartTimeEntry === "function" &&
        typeof value.listTimeEntries === "function");
}
export function buildHarvestCreateTimeEntryRequest(input) {
    const mapping = requireHarvestMapping(input.mapping);
    const request = {
        projectId: mapping.projectId,
        taskId: mapping.taskId,
        spentDate: input.spentDate ?? toLocalIsoDate(new Date(input.timestamp)),
        notes: input.notes ?? buildHarvestNotes(input)
    };
    const externalReference = input.externalReference ?? buildHarvestExternalReference(input.context);
    if (externalReference) {
        request.externalReference = externalReference;
    }
    return request;
}
export function formatWorkTimerDescription(context, fallback = "Work") {
    if (!context) {
        return normalizeDescription(fallback, "Work");
    }
    const title = normalizeTicketTitle(context.title, context.key);
    return `${context.key}: ${title}`;
}
function requireHarvestMapping(mapping) {
    if (isCompleteHarvestMapping(mapping)) {
        return mapping;
    }
    throw new HttpError(409, "MAPPING_REQUIRED", "Select a Harvest project and task before using live timers", {
        missing: "entry-mapping"
    });
}
export function isCompleteHarvestMapping(mapping) {
    return (Number.isInteger(mapping.projectId) &&
        Number(mapping.projectId) > 0 &&
        Number.isInteger(mapping.taskId) &&
        Number(mapping.taskId) > 0);
}
function getRequiredHarvestEntryId(input) {
    const id = input.harvestEntryId ?? getHarvestEntryIdFromEntryId(input.entryId);
    if (id) {
        return id;
    }
    throw new HttpError(409, "HARVEST_ENTRY_ID_MISSING", "Harvest entry ID is required");
}
function getHarvestEntryIdFromEntryId(entryId) {
    const [, rawId] = entryId.split("-", 2);
    const id = Number(rawId);
    return Number.isInteger(id) && id > 0 ? id : null;
}
function toValidIsoTimestamp(value, fallback) {
    if (!value) {
        return fallback;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}
function normalizeDescription(value, fallback) {
    const trimmed = value?.trim();
    return trimmed || fallback;
}
function buildHarvestNotes(input) {
    if (input.mode === "comms") {
        return [
            input.description,
            "Mode: Comms",
            "Source: Communications",
            `Mapping: ${input.mapping.mappingName ?? "Comms"}`
        ].join("\n");
    }
    const context = input.context;
    if (!context) {
        return normalizeDescription(input.description, "Work");
    }
    return formatWorkTimerDescription(context, input.description);
}
function buildHarvestExternalReference(context) {
    if (!context?.permalink || (context.source !== "jira" && context.source !== "github")) {
        return undefined;
    }
    const reference = {
        id: context.key,
        permalink: context.permalink,
        service: context.source
    };
    const githubMetadata = getGitHubContextMetadata(context);
    if (githubMetadata) {
        reference.group_id = githubMetadata.repository;
    }
    return reference;
}
function getGitHubContextMetadata(context) {
    if (context.source !== "github") {
        return null;
    }
    const idMatch = /^github:([^:]+):(pull|issues):(\d+)$/.exec(context.id);
    const permalinkMatch = /^\/([^/]+\/[^/]+)\/(pull|issues)\/(\d+)$/.exec(getUrlPathname(context.permalink ?? context.url));
    const repository = idMatch?.[1] ?? permalinkMatch?.[1];
    const section = idMatch?.[2] ?? permalinkMatch?.[2];
    const number = idMatch?.[3] ?? permalinkMatch?.[3];
    if (!repository || !section || !number) {
        return null;
    }
    return {
        repository,
        type: section === "pull" ? "Pull Request" : "Issue",
        number
    };
}
function normalizeTicketTitle(rawTitle, key) {
    const escapedKey = escapeRegExp(key);
    let title = normalizeWhitespace(rawTitle) ?? key;
    title = title
        .replace(/\s*(?:[-–—|·]\s*)JIRA\s*$/i, "")
        .replace(/\s*(?:[-–—|·]\s*)Atlassian\s*$/i, "")
        .replace(new RegExp(`^\\[${escapedKey}\\]\\s*`, "i"), "")
        .replace(new RegExp(`^${escapedKey}\\s*(?::|[-–—|])?\\s*`, "i"), "")
        .replace(new RegExp(`\\[${escapedKey}\\]\\s*`, "gi"), "");
    return normalizeWhitespace(title) ?? key;
}
function normalizeWhitespace(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized ? normalized : null;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getUrlPathname(value) {
    try {
        return new URL(value).pathname;
    }
    catch {
        return "";
    }
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
