import { rm } from "node:fs/promises";
import { join } from "node:path";
import { HarvestTaskAssignmentsResponseSchema, TimeEntriesResponseSchema } from "@harvest-time/shared";
import { z } from "zod";
import { JsonFileError, readJsonFile, recoverInvalidJsonFile, writeJsonFileAtomically } from "./json-file.js";
export const HARVEST_READ_CACHE_SCHEMA_VERSION = 1;
const MAX_TIME_ENTRY_SNAPSHOTS = 30;
const isoDateTimeSchema = z.string().datetime();
const CachedTaskAssignmentsSchema = z.object({
    accountId: z.string().min(1),
    cachedAt: isoDateTimeSchema,
    response: HarvestTaskAssignmentsResponseSchema.omit({ cache: true })
});
const CachedTimeEntriesSchema = z.object({
    accountId: z.string().min(1),
    cachedAt: isoDateTimeSchema,
    queryKey: z.string(),
    response: TimeEntriesResponseSchema.omit({ cache: true })
});
export const HarvestReadCacheFileSchema = z.object({
    schemaVersion: z.literal(HARVEST_READ_CACHE_SCHEMA_VERSION),
    taskAssignments: z.array(CachedTaskAssignmentsSchema),
    timeEntries: z.array(CachedTimeEntriesSchema)
});
export class HarvestReadCache {
    filePath;
    now;
    writeQueue = Promise.resolve();
    constructor(options) {
        this.filePath = options.filePath ?? join(options.dataDir, "harvest-read-cache.json");
        this.now = options.now ?? (() => new Date());
    }
    async getTaskAssignments(accountId) {
        await this.writeQueue;
        const cache = await this.load();
        const snapshot = cache.taskAssignments.find((item) => item.accountId === accountId);
        if (!snapshot) {
            return null;
        }
        return HarvestTaskAssignmentsResponseSchema.parse({
            ...snapshot.response,
            cache: { source: "cache", cachedAt: snapshot.cachedAt }
        });
    }
    async saveTaskAssignments(accountId, response) {
        return this.enqueueWrite(async () => {
            const cache = await this.load();
            const snapshot = CachedTaskAssignmentsSchema.parse({
                accountId,
                cachedAt: this.now().toISOString(),
                response: { taskAssignments: response.taskAssignments }
            });
            await this.save({
                ...cache,
                taskAssignments: [
                    ...cache.taskAssignments.filter((item) => item.accountId !== accountId),
                    snapshot
                ]
            });
        });
    }
    async getTimeEntries(accountId, query) {
        await this.writeQueue;
        const cache = await this.load();
        const queryKey = createTimeEntriesQueryKey(query);
        const snapshot = cache.timeEntries.find((item) => item.accountId === accountId && item.queryKey === queryKey);
        if (!snapshot) {
            return null;
        }
        return TimeEntriesResponseSchema.parse({
            ...snapshot.response,
            cache: { source: "cache", cachedAt: snapshot.cachedAt }
        });
    }
    async saveTimeEntries(accountId, query, response) {
        return this.enqueueWrite(async () => {
            const cache = await this.load();
            const queryKey = createTimeEntriesQueryKey(query);
            const snapshot = CachedTimeEntriesSchema.parse({
                accountId,
                cachedAt: this.now().toISOString(),
                queryKey,
                response: { timeEntries: response.timeEntries }
            });
            const otherSnapshots = cache.timeEntries.filter((item) => !(item.accountId === accountId && item.queryKey === queryKey));
            await this.save({
                ...cache,
                timeEntries: [...otherSnapshots, snapshot]
                    .sort((left, right) => right.cachedAt.localeCompare(left.cachedAt))
                    .slice(0, MAX_TIME_ENTRY_SNAPSHOTS)
            });
        });
    }
    async clear() {
        await this.writeQueue;
        await rm(this.filePath, { force: true });
    }
    enqueueWrite(write) {
        const queuedWrite = this.writeQueue.then(write, write);
        this.writeQueue = queuedWrite.catch(() => undefined);
        return queuedWrite;
    }
    async load() {
        try {
            return ((await readJsonFile(this.filePath, HarvestReadCacheFileSchema, {
                label: "Harvest read cache"
            })) ?? createEmptyCache());
        }
        catch (error) {
            if (error instanceof JsonFileError &&
                (error.kind === "invalid-json" || error.kind === "invalid-schema")) {
                await recoverInvalidJsonFile(this.filePath, { now: this.now });
                return createEmptyCache();
            }
            throw error;
        }
    }
    async save(cache) {
        const parsed = HarvestReadCacheFileSchema.parse(cache);
        await writeJsonFileAtomically(this.filePath, parsed, { mode: 0o600 });
    }
}
function createEmptyCache() {
    return {
        schemaVersion: HARVEST_READ_CACHE_SCHEMA_VERSION,
        taskAssignments: [],
        timeEntries: []
    };
}
function createTimeEntriesQueryKey(query) {
    return [query.from ?? "", query.to ?? "", query.isRunning?.toString() ?? ""].join("|");
}
