import { readFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { AdminHistoryDaySchema } from "@harvest-time/shared";
import { DailyStoreFileSchema, toTimeZoneIsoDate } from "./daily-store.js";
const DAILY_FILE_NAME = /^\d{4}-\d{2}-\d{2}\.json$/;
export class DailyHistoryStore {
    dataDir;
    now;
    timezone;
    constructor(options) {
        this.dataDir = options.dataDir;
        this.now = options.now ?? (() => new Date());
        this.timezone = options.timezone;
    }
    async listPreviousDays() {
        const records = await this.loadPreviousDayRecords(this.getCurrentDate());
        return records
            .map(({ store }) => toAdminHistoryDay(store))
            .sort((first, second) => second.date.localeCompare(first.date));
    }
    async clearPreviousDays() {
        const preservedCurrentDate = this.getCurrentDate();
        const records = await this.loadPreviousDayRecords(preservedCurrentDate);
        let removedDayCount = 0;
        for (const record of records) {
            try {
                await unlink(join(this.dataDir, record.fileName));
                removedDayCount += 1;
            }
            catch (error) {
                if (!isNodeError(error, "ENOENT")) {
                    throw error;
                }
            }
        }
        return { removedDayCount, preservedCurrentDate };
    }
    getCurrentDate() {
        return toTimeZoneIsoDate(this.now(), this.timezone);
    }
    async loadPreviousDayRecords(currentDate) {
        let directoryEntries;
        try {
            directoryEntries = await readdir(this.dataDir, { withFileTypes: true });
        }
        catch (error) {
            if (isNodeError(error, "ENOENT")) {
                return [];
            }
            throw error;
        }
        const records = [];
        for (const directoryEntry of directoryEntries) {
            const fileName = directoryEntry.name;
            if (!directoryEntry.isFile() || !DAILY_FILE_NAME.test(fileName)) {
                continue;
            }
            let raw;
            try {
                raw = await readFile(join(this.dataDir, fileName), "utf8");
            }
            catch (error) {
                if (isNodeError(error, "ENOENT")) {
                    continue;
                }
                throw error;
            }
            let value;
            try {
                value = JSON.parse(raw);
            }
            catch {
                continue;
            }
            const parsed = DailyStoreFileSchema.safeParse(value);
            if (!parsed.success) {
                continue;
            }
            const store = parsed.data;
            if (fileName !== `${store.date}.json` || store.date >= currentDate) {
                continue;
            }
            records.push({ fileName, store });
        }
        return records;
    }
}
function toAdminHistoryDay(store) {
    const entries = [
        ...store.harvestEntries.map((entry) => {
            const stoppedAt = entry.stoppedAt ?? null;
            return {
                source: entry.backend === "harvest" ? "harvest" : "mock",
                description: entry.description,
                startedAt: entry.startedAt,
                stoppedAt,
                durationMinutes: getDurationMinutes(entry.startedAt, stoppedAt),
                ticketKey: entry.context?.key ?? null,
                mappingName: entry.mappingName ?? null,
                kind: entry.context?.kind ?? null
            };
        }),
        ...store.manualEntries.map((entry) => ({
            source: "manual",
            description: entry.notes,
            startedAt: entry.startedAt,
            stoppedAt: entry.stoppedAt,
            durationMinutes: getDurationMinutes(entry.startedAt, entry.stoppedAt),
            ticketKey: entry.key,
            mappingName: null,
            kind: entry.kind
        }))
    ].sort((first, second) => Date.parse(first.startedAt) - Date.parse(second.startedAt));
    return AdminHistoryDaySchema.parse({
        date: store.date,
        updatedAt: store.updatedAt,
        eventCount: store.events.length,
        contextCount: store.contexts.length,
        historyItemCount: store.historyItems?.length ?? 0,
        entryCount: entries.length,
        harvestEntryCount: store.harvestEntries.filter((entry) => entry.backend === "harvest").length,
        manualEntryCount: store.manualEntries.length,
        trackedMinutes: entries.reduce((total, entry) => total + (entry.durationMinutes ?? 0), 0),
        entries
    });
}
function getDurationMinutes(startedAt, stoppedAt) {
    if (!stoppedAt) {
        return null;
    }
    return Math.max(0, Math.round((Date.parse(stoppedAt) - Date.parse(startedAt)) / 60_000));
}
function isNodeError(error, code) {
    return error instanceof Error && "code" in error && error.code === code;
}
