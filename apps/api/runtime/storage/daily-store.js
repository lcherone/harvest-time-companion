import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ApiErrorSchema, BrowserHistoryItemSchema, DailyTimelineEventSchema, DailyContextEvidenceSchema, DetectedContextSchema, ManualDailyReviewEntrySchema, ResumeStackItemSchema, RunningTimerStateSchema, TimerBackendSchema, TimerModeSchema, TrackableDetectedContextSchema } from "@harvest-time/shared";
import { z } from "zod";
import { HttpError } from "../http/errors.js";
import { JsonFileError, readJsonFile, recoverInvalidJsonFile, writeJsonFileAtomically } from "./json-file.js";
export const DAILY_STORE_SCHEMA_VERSION = 1;
export const MOCK_HARVEST_ENTRY_START_ID = 1001;
const defaultDataDir = fileURLToPath(new URL("../../data/", import.meta.url));
const storeDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date as YYYY-MM-DD");
const isoDateTimeSchema = z.string().datetime();
export const MockHarvestTimeEntrySchema = z.object({
    id: z.number().int().positive(),
    entryId: z.string().min(1),
    backend: TimerBackendSchema.optional(),
    mode: TimerModeSchema,
    description: z.string().min(1),
    context: TrackableDetectedContextSchema.nullable(),
    mappingName: z.string().min(1).optional(),
    startedAt: isoDateTimeSchema,
    stoppedAt: isoDateTimeSchema.optional(),
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
});
export const DailyStoreStateSchema = z.object({
    runningTimer: RunningTimerStateSchema.nullable(),
    lastDetectedContext: DetectedContextSchema.nullable(),
    resumeStack: z.array(ResumeStackItemSchema),
    lastError: ApiErrorSchema.shape.error.nullable(),
    nextMockHarvestEntryId: z.number().int().positive()
});
const DailyContextEvidenceInputSchema = z
    .union([DailyContextEvidenceSchema, DetectedContextSchema])
    .transform((context) => isDailyContextEvidence(context) ? context : createDailyContextEvidence(context));
const DailyContextEvidenceListSchema = z
    .array(DailyContextEvidenceInputSchema)
    .transform((contexts) => mergeDailyContextEvidenceList(contexts));
const DailyStoreTimelineEventSchema = DailyTimelineEventSchema.transform((event) => {
    if (event.type !== "tab-detected" || !event.details || !("active" in event.details)) {
        return event;
    }
    const details = { ...event.details };
    delete details.active;
    return {
        ...event,
        details
    };
});
export const DailyStoreFileSchema = z.object({
    schemaVersion: z.literal(DAILY_STORE_SCHEMA_VERSION),
    date: storeDateSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema,
    state: DailyStoreStateSchema,
    contexts: DailyContextEvidenceListSchema,
    harvestEntries: z.array(MockHarvestTimeEntrySchema),
    manualEntries: z.array(ManualDailyReviewEntrySchema).default([]),
    dismissedReviewEntryIds: z.array(z.string().min(1)).default([]),
    dismissedHistoryItemKeys: z.array(z.string().min(1)).default([]),
    historyItems: z.array(BrowserHistoryItemSchema).optional(),
    events: z.array(DailyStoreTimelineEventSchema)
});
export class DailyStore {
    dataDir;
    now;
    timezone;
    constructor(options = {}) {
        this.dataDir = options.dataDir ?? defaultDataDir;
        this.now = options.now ?? (() => new Date());
        this.timezone = normalizeOptionalTimezone(options.timezone);
    }
    getFilePath(date) {
        const parsedDate = storeDateSchema.parse(date ?? this.getCurrentDate());
        return join(this.dataDir, `${parsedDate}.json`);
    }
    async load(date) {
        const storeDate = storeDateSchema.parse(date ?? this.getCurrentDate());
        const filePath = this.getFilePath(storeDate);
        try {
            const existingStore = await readJsonFile(filePath, DailyStoreFileSchema, {
                label: "daily store"
            });
            if (existingStore) {
                return existingStore;
            }
        }
        catch (error) {
            if (error instanceof JsonFileError && error.kind === "invalid-json") {
                return this.recoverDailyStore(filePath, storeDate, error);
            }
            throw toDailyStoreError("DAILY_STORE_INVALID", filePath, error);
        }
        return this.createAndWriteInitialStore(filePath, storeDate);
    }
    async save(store) {
        const updatedStore = DailyStoreFileSchema.parse({
            ...store,
            updatedAt: this.now().toISOString()
        });
        const filePath = this.getFilePath(updatedStore.date);
        try {
            await writeJsonFileAtomically(filePath, updatedStore);
        }
        catch (error) {
            throw toDailyStoreError("DAILY_STORAGE_UNAVAILABLE", filePath, error);
        }
        return updatedStore;
    }
    getCurrentDate() {
        return toTimeZoneIsoDate(this.now(), this.timezone);
    }
    async createAndWriteInitialStore(filePath, date) {
        const initialStore = createInitialDailyStore(date, this.now());
        try {
            await writeJsonFileAtomically(filePath, initialStore);
        }
        catch (error) {
            throw toDailyStoreError("DAILY_STORAGE_UNAVAILABLE", filePath, error);
        }
        return initialStore;
    }
    async recoverDailyStore(filePath, date, cause) {
        try {
            await recoverInvalidJsonFile(filePath, { now: this.now });
            return this.createAndWriteInitialStore(filePath, date);
        }
        catch (error) {
            throw toDailyStoreError("DAILY_STORE_INVALID", filePath, error, cause);
        }
    }
}
export function createInitialDailyStore(date, now = new Date()) {
    const parsedDate = storeDateSchema.parse(date);
    const timestamp = now.toISOString();
    return {
        schemaVersion: DAILY_STORE_SCHEMA_VERSION,
        date: parsedDate,
        createdAt: timestamp,
        updatedAt: timestamp,
        state: {
            runningTimer: null,
            lastDetectedContext: null,
            resumeStack: [],
            lastError: null,
            nextMockHarvestEntryId: MOCK_HARVEST_ENTRY_START_ID
        },
        contexts: [],
        harvestEntries: [],
        manualEntries: [],
        dismissedReviewEntryIds: [],
        dismissedHistoryItemKeys: [],
        historyItems: [],
        events: []
    };
}
export function createDailyContextEvidence(context) {
    const firstSeenAt = context.detectedAt;
    const baseEvidence = {
        id: context.id,
        trackable: context.trackable,
        kind: context.kind,
        seenCount: 1,
        firstSeenAt,
        lastSeenAt: firstSeenAt,
        latestTitle: context.title,
        latestUrl: context.url,
        source: context.source,
        host: context.host,
        confidence: context.confidence
    };
    if (context.trackable) {
        return {
            ...baseEvidence,
            key: context.key,
            permalink: context.permalink,
            jira: context.jira
        };
    }
    return {
        ...baseEvidence,
        reason: context.reason
    };
}
export function upsertDailyContextEvidence(contexts, context) {
    const incomingContext = createDailyContextEvidence(context);
    const existingContext = contexts.find((candidate) => candidate.id === incomingContext.id);
    if (!existingContext) {
        contexts.push(incomingContext);
        return incomingContext;
    }
    mergeDailyContextEvidence(existingContext, incomingContext);
    return existingContext;
}
export function toLocalIsoDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
export function toTimeZoneIsoDate(date = new Date(), timezone) {
    if (!timezone) {
        return toLocalIsoDate(date);
    }
    const formatter = new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        timeZone: timezone,
        year: "numeric"
    });
    const parts = formatter.formatToParts(date);
    const year = getDatePart(parts, "year");
    const month = getDatePart(parts, "month");
    const day = getDatePart(parts, "day");
    return `${year}-${month}-${day}`;
}
function isDailyContextEvidence(context) {
    return "seenCount" in context;
}
function mergeDailyContextEvidenceList(contexts) {
    const mergedContexts = [];
    for (const context of contexts) {
        const existingContext = mergedContexts.find((candidate) => candidate.id === context.id);
        if (existingContext) {
            mergeDailyContextEvidence(existingContext, context);
            continue;
        }
        mergedContexts.push(context);
    }
    return mergedContexts;
}
function mergeDailyContextEvidence(existingContext, incomingContext) {
    const incomingIsNewer = Date.parse(incomingContext.lastSeenAt) >= Date.parse(existingContext.lastSeenAt);
    existingContext.seenCount += incomingContext.seenCount;
    if (Date.parse(incomingContext.firstSeenAt) < Date.parse(existingContext.firstSeenAt)) {
        existingContext.firstSeenAt = incomingContext.firstSeenAt;
    }
    if (!incomingIsNewer) {
        return;
    }
    existingContext.trackable = incomingContext.trackable;
    existingContext.kind = incomingContext.kind;
    existingContext.key = incomingContext.key;
    existingContext.lastSeenAt = incomingContext.lastSeenAt;
    existingContext.latestTitle = incomingContext.latestTitle;
    existingContext.latestUrl = incomingContext.latestUrl;
    existingContext.source = incomingContext.source;
    existingContext.host = incomingContext.host;
    existingContext.confidence = incomingContext.confidence;
    existingContext.permalink = incomingContext.permalink;
    existingContext.jira = incomingContext.jira;
    existingContext.reason = incomingContext.reason;
}
function getDatePart(parts, type) {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) {
        throw new Error(`Could not format ${type} for daily store date`);
    }
    return value;
}
function normalizeOptionalTimezone(timezone) {
    const trimmedTimezone = timezone?.trim();
    if (!trimmedTimezone) {
        return undefined;
    }
    new Intl.DateTimeFormat("en-US", { timeZone: trimmedTimezone }).format(new Date(0));
    return trimmedTimezone;
}
function toDailyStoreError(code, filePath, error, cause) {
    const action = code === "DAILY_STORAGE_UNAVAILABLE" ? "write" : "load";
    const message = `Unable to ${action} daily store at ${filePath}`;
    return new HttpError(500, code, message, getDailyStoreErrorDetails(error, cause));
}
function getDailyStoreErrorDetails(error, cause) {
    if (error instanceof JsonFileError) {
        return {
            backupPath: error.backupPath,
            details: error.details,
            filePath: error.filePath,
            kind: error.kind,
            message: error.message,
            recoveryCause: cause?.message
        };
    }
    if (error instanceof Error) {
        return {
            message: error.message,
            recoveryCause: cause?.message
        };
    }
    return error;
}
