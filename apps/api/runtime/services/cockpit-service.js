import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ProjectKeySchema } from "@harvest-time/shared";
import { hasHarvestCredentials } from "../config/env.js";
import { HttpError } from "../http/errors.js";
import { HarvestApiError } from "../integrations/harvest/harvest-client.js";
import { DailyStore, DailyStoreFileSchema, upsertDailyContextEvidence } from "../storage/daily-store.js";
import { ContextDetector } from "./context-detector.js";
import { formatWorkTimerDescription, HarvestTimerAdapter, isCompleteHarvestMapping, isTimerAdapterHarvestClient, MockTimerAdapter } from "./timer-adapters.js";
import { ZodError } from "zod";
const RECENT_CONTEXT_LIMIT = 5;
const MILLISECONDS_PER_HOUR = 60 * 60 * 1000;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const HISTORY_REVIEW_MIN_VISIBLE_MS = 2 * 1000;
const MIN_REVIEW_DURATION_MINUTES = 1;
const COMPLETE_TIMESHEET_MINUTES = 8 * 60;
const DEFAULT_DAILY_REVIEW_START_HOUR = 8;
export class CockpitService {
    backendConfigService;
    config;
    detector;
    harvestClient;
    harvestAuthService;
    harvestTimerAdapter;
    jiraIssueResolver;
    mockTimerAdapter;
    now;
    store;
    constructor(options) {
        this.backendConfigService = options.backendConfigService;
        this.config = options.config;
        this.harvestClient = options.harvestClient;
        this.harvestAuthService = options.harvestAuthService;
        this.jiraIssueResolver = options.jiraIssueResolver;
        this.mockTimerAdapter = new MockTimerAdapter();
        this.harvestTimerAdapter = isTimerAdapterHarvestClient(options.harvestClient)
            ? new HarvestTimerAdapter({
                harvestClient: options.harvestClient
            })
            : undefined;
        this.now = options.now ?? (() => new Date());
        this.store = options.store ?? new DailyStore({ now: this.now });
        this.detector =
            options.detector ??
                new ContextDetector({
                    ticketKeyRegex: options.config.JIRA_KEY_REGEX,
                    now: this.now
                });
    }
    async getState() {
        const store = await this.store.load();
        const reconciledStore = await this.reconcileLiveRunningState(store);
        const syncedStore = await this.syncHarvestTimeEntriesForToday(reconciledStore);
        return this.toCockpitState(syncedStore);
    }
    async reconcileState() {
        const store = await this.store.load();
        const reconciledStore = await this.reconcileLiveRunningState(store);
        const syncedStore = await this.syncHarvestTimeEntriesForToday(reconciledStore);
        return this.toCockpitState(syncedStore);
    }
    async recordTabEvent(payload) {
        const store = await this.store.load();
        const context = await this.enrichDetectedContext(this.detector.detect(payload));
        const contextEvidence = upsertDailyContextEvidence(store.contexts, context);
        const shouldAppendTimelineEvent = shouldAppendContextTimelineEvent(store, contextEvidence);
        store.state.lastDetectedContext = context;
        store.state.lastError = null;
        if (shouldAppendTimelineEvent) {
            this.appendEvent(store, {
                type: "tab-detected",
                occurredAt: context.detectedAt,
                summary: getContextDetectedSummary(context),
                context,
                details: getTabDetectedDetails(payload, contextEvidence)
            });
        }
        return this.saveAndReturnState(store);
    }
    async recordClipboardTicket(payload) {
        const store = await this.store.load();
        const context = await this.enrichDetectedContext(this.detector.detectClipboardTicket(payload));
        const contextEvidence = upsertDailyContextEvidence(store.contexts, context);
        const shouldAppendTimelineEvent = shouldAppendContextTimelineEvent(store, contextEvidence);
        store.state.lastDetectedContext = context;
        store.state.lastError = null;
        if (shouldAppendTimelineEvent) {
            this.appendEvent(store, {
                type: "tab-detected",
                occurredAt: context.detectedAt,
                summary: getContextDetectedSummary(context),
                context,
                details: getClipboardDetectedDetails(payload, contextEvidence)
            });
        }
        return this.saveAndReturnState(store);
    }
    async recordBrowserHistory(items) {
        const store = await this.store.load();
        const uniqueItems = new Map();
        for (const item of items) {
            uniqueItems.set(getHistoryItemKey(item), item);
        }
        store.historyItems = [...uniqueItems.values()].sort((firstItem, secondItem) => firstItem.lastVisitTime - secondItem.lastVisitTime);
        return this.saveAndReturnState(store);
    }
    async getManualDailyEntryOptions() {
        const stores = await this.loadExistingDailyStores();
        const sources = new Set([
            "jira",
            "github",
            "generic-ticket"
        ]);
        const hosts = new Set();
        for (const store of stores) {
            for (const context of store.contexts) {
                if (context.trackable && context.source !== "unknown") {
                    sources.add(context.source);
                }
                addNormalizedHost(hosts, context.host);
                addNormalizedHost(hosts, getUrlHost(context.latestUrl ?? ""));
            }
            for (const entry of store.manualEntries) {
                sources.add(entry.source);
                addNormalizedHost(hosts, entry.host);
                addNormalizedHost(hosts, entry.context.host);
            }
        }
        return {
            sources: [...sources].sort(),
            hosts: [...hosts].sort()
        };
    }
    async createManualDailyEntry(input) {
        const store = await this.store.load();
        const timestamp = this.now().toISOString();
        const key = input.key.trim().toUpperCase();
        const source = input.source;
        const kind = input.kind ?? getManualEntryKindForSource(source);
        const host = normalizeManualEntryHost(input.host);
        const title = normalizeDailyReviewTitle(input.title, key);
        const permalink = getManualEntryPermalink({ host, key, kind, source });
        const url = permalink ?? `https://${host}/`;
        const context = {
            id: `ticket:${key}`,
            trackable: true,
            kind,
            source,
            key,
            title,
            url,
            host,
            confidence: 0.9,
            detectedAt: timestamp
        };
        if (permalink) {
            context.permalink = permalink;
        }
        const entry = {
            id: createManualDailyEntryId(key, timestamp, store.manualEntries.length + 1),
            key,
            title,
            notes: formatDailyReviewNotes(key, title),
            kind,
            source,
            host,
            startedAt: timestamp,
            stoppedAt: null,
            confidence: 0.9,
            evidenceCount: 1,
            context,
            createdAt: timestamp,
            updatedAt: timestamp
        };
        store.manualEntries.push(entry);
        upsertDailyContextEvidence(store.contexts, context);
        store.state.lastError = null;
        return this.saveAndReturnState(store);
    }
    async removeManualDailyEntry(entryId) {
        const store = await this.store.load();
        const initialLength = store.manualEntries.length;
        store.manualEntries = store.manualEntries.filter((entry) => entry.id !== entryId);
        if (store.manualEntries.length === initialLength) {
            throw new HttpError(404, "MANUAL_ENTRY_NOT_FOUND", "Manual Daily entry was not found");
        }
        store.state.lastError = null;
        return this.saveAndReturnState(store);
    }
    async dismissDailyReviewSuggestion(entryId) {
        const store = await this.store.load();
        if (store.dismissedReviewEntryIds.includes(entryId)) {
            return this.toCockpitState(store);
        }
        const suggestion = this.getHistoryReviewEntries(store).find((entry) => entry.id === entryId);
        if (suggestion) {
            store.dismissedReviewEntryIds.push(entryId);
            store.state.lastError = null;
            return this.saveAndReturnState(store);
        }
        if (this.getHarvestReviewEntries(store).some((entry) => entry.id === entryId)) {
            throw new HttpError(409, "HARVEST_ENTRY_CANNOT_BE_DISMISSED", "Entries submitted to Harvest cannot be removed from Daily entries");
        }
        if (this.getManualReviewEntries(store).some((entry) => entry.id === entryId)) {
            throw new HttpError(409, "MANUAL_ENTRY_REMOVE_ROUTE_REQUIRED", "Manual Daily entries must be removed through the manual entry action");
        }
        throw new HttpError(404, "REVIEW_SUGGESTION_NOT_FOUND", "Daily entry suggestion was not found");
    }
    async startOrSwitchDetected(input = {}) {
        const store = await this.store.load();
        const context = await this.getTrackableStartContext(store, input.contextId);
        const timestamp = this.now().toISOString();
        const currentTimer = store.state.runningTimer;
        if (isSameWorkContext(currentTimer, context) && !input.mapping) {
            store.state.lastError = null;
            this.appendEvent(store, {
                type: "timer-started",
                summary: `Already tracking ${context.key}`,
                context,
                timer: currentTimer,
                entryId: currentTimer.entryId,
                details: {
                    unchanged: true
                }
            });
            return this.saveAndReturnState(store);
        }
        if (!input.mapping && (await this.shouldRequireEntryMapping())) {
            return this.rejectCommand(store, 409, "MAPPING_REQUIRED", "Select a Harvest project and task before starting this timer", {
                contextKey: context.key,
                projectKey: getTicketProjectKey(context.key) ?? undefined
            });
        }
        const mappingResolution = input.mapping
            ? createOverrideMappingResolution(input.mapping, context)
            : this.resolveWorkMapping(context);
        return this.runRecoverableTimerOperation(store, "start", async () => {
            const stoppedTimer = await this.stopCurrentTimer(store, timestamp);
            if (stoppedTimer?.mode === "work" && stoppedTimer.context) {
                this.pushResumeStackItem(store, toResumeStackItem(stoppedTimer, timestamp));
            }
            this.removeResumeItemsForContext(store, context.id);
            const timerAdapter = await this.selectTimerAdapter(mappingResolution);
            const description = formatWorkTimerDescription(context);
            const timer = await timerAdapter.createRunningEntry(store, {
                mode: "work",
                context,
                description,
                mapping: mappingResolution.mapping,
                timestamp
            });
            store.state.lastError = null;
            this.appendEvent(store, {
                type: stoppedTimer ? "timer-switched" : "timer-started",
                summary: stoppedTimer ? `Switched to ${context.key}` : `Started ${context.key}`,
                context,
                timer,
                entryId: timer.entryId,
                details: stoppedTimer
                    ? {
                        previousEntryId: stoppedTimer.entryId,
                        previousMode: stoppedTimer.mode,
                        mappingName: mappingResolution.mapping.mappingName,
                        projectKey: mappingResolution.projectKey
                    }
                    : getMappingEventDetails(mappingResolution)
            });
            return this.saveAndReturnState(store);
        });
    }
    async startComms(input = {}) {
        const store = await this.store.load();
        const timestamp = this.now().toISOString();
        const currentTimer = store.state.runningTimer;
        if (currentTimer?.mode === "comms") {
            store.state.lastError = null;
            this.appendEvent(store, {
                type: "timer-comms",
                summary: "Already tracking comms",
                timer: currentTimer,
                entryId: currentTimer.entryId,
                details: {
                    unchanged: true
                }
            });
            return this.saveAndReturnState(store);
        }
        if (!input.mapping && (await this.shouldRequireEntryMapping())) {
            return this.rejectCommand(store, 409, "MAPPING_REQUIRED", "Select a Harvest project and task before starting a comms timer");
        }
        const mappingResolution = input.mapping
            ? createCommsOverrideMappingResolution(input.mapping)
            : this.resolveCommsMapping();
        return this.runRecoverableTimerOperation(store, "comms", async () => {
            const stoppedTimer = await this.stopCurrentTimer(store, timestamp);
            if (stoppedTimer?.mode === "work" && stoppedTimer.context) {
                this.pushResumeStackItem(store, toResumeStackItem(stoppedTimer, timestamp));
            }
            const timerAdapter = await this.selectTimerAdapter(mappingResolution);
            const timer = await timerAdapter.createRunningEntry(store, {
                mode: "comms",
                context: null,
                description: "Comms",
                mapping: mappingResolution.mapping,
                timestamp
            });
            store.state.lastError = null;
            this.appendEvent(store, {
                type: "timer-comms",
                summary: "Started comms",
                timer,
                entryId: timer.entryId,
                details: stoppedTimer
                    ? {
                        previousEntryId: stoppedTimer.entryId,
                        previousMode: stoppedTimer.mode,
                        mappingName: mappingResolution.mapping.mappingName
                    }
                    : getMappingEventDetails(mappingResolution)
            });
            return this.saveAndReturnState(store);
        });
    }
    async resumePrevious() {
        const store = await this.store.load();
        const target = store.state.resumeStack[0];
        if (!target) {
            return this.rejectCommand(store, 409, "NO_RESUME_TARGET", "No previous work timer is available");
        }
        const timestamp = this.now().toISOString();
        return this.runRecoverableTimerOperation(store, "resume", async () => {
            store.state.resumeStack = store.state.resumeStack.slice(1);
            const stoppedTimer = await this.stopCurrentTimer(store, timestamp);
            if (stoppedTimer?.mode === "work" &&
                stoppedTimer.context &&
                stoppedTimer.entryId !== target.entryId) {
                this.pushResumeStackItem(store, toResumeStackItem(stoppedTimer, timestamp));
            }
            const resumeResult = await this.resumeTimer(store, target, timestamp);
            const timer = resumeResult.timer;
            store.state.lastError = null;
            this.appendEvent(store, {
                type: "timer-resumed",
                summary: `Resumed ${target.context.key}`,
                context: target.context,
                timer,
                entryId: timer.entryId,
                details: getResumeEventDetails(stoppedTimer, resumeResult)
            });
            return this.saveAndReturnState(store);
        });
    }
    async stopRunningTimer() {
        const store = await this.store.load();
        const timestamp = this.now().toISOString();
        return this.runRecoverableTimerOperation(store, "stop", async () => {
            const stoppedTimer = await this.stopCurrentTimer(store, timestamp);
            if (!stoppedTimer) {
                return this.rejectCommand(store, 409, "NO_RUNNING_TIMER", "No timer is currently running");
            }
            store.state.lastError = null;
            this.appendEvent(store, {
                type: "timer-stopped",
                summary: `Stopped ${stoppedTimer.description}`,
                context: stoppedTimer.context ?? undefined,
                entryId: stoppedTimer.entryId,
                details: {
                    mode: stoppedTimer.mode,
                    harvestEntryId: stoppedTimer.harvestEntryId,
                    ...getTimelineTimingDetails({
                        startedAt: stoppedTimer.startedAt,
                        startedTime: formatIsoTimestampAsClockTime(stoppedTimer.startedAt),
                        stoppedAt: timestamp,
                        endedTime: formatIsoTimestampAsClockTime(timestamp)
                    })
                }
            });
            return this.saveAndReturnState(store);
        });
    }
    async updateTimelineEvent(eventId, input) {
        const store = await this.store.load();
        const event = store.events.find((candidate) => candidate.id === eventId);
        if (!event) {
            throw new HttpError(404, "TIMELINE_EVENT_NOT_FOUND", "Timeline event was not found");
        }
        const summary = input.summary.trim();
        const linkedEntryId = event.entryId ?? event.timer?.entryId;
        const timingUpdate = getTimelineTimingUpdate(store, event, input);
        const harvestTarget = linkedEntryId
            ? getLinkedHarvestUpdateTarget(store, linkedEntryId, event)
            : null;
        if (harvestTarget) {
            if (!this.harvestClient) {
                throw new HttpError(503, "HARVEST_UPDATE_UNAVAILABLE", "Harvest update is unavailable for this timeline entry");
            }
            if (input.mapping || timingUpdate) {
                if (!this.harvestClient.updateTimeEntry) {
                    throw new HttpError(503, "HARVEST_UPDATE_UNAVAILABLE", "Harvest time entry update is unavailable for this timeline entry");
                }
                await this.harvestClient.updateTimeEntry(harvestTarget.harvestEntryId, {
                    endedTime: timingUpdate?.endedTime,
                    mapping: input.mapping,
                    notes: summary,
                    startedTime: timingUpdate?.startedTime
                });
            }
            else {
                await this.harvestClient.updateTimeEntryNotes(harvestTarget.harvestEntryId, summary);
            }
        }
        event.summary = summary;
        if (linkedEntryId) {
            updateLinkedLocalEntryDescriptions(store, linkedEntryId, summary);
            if (input.mapping) {
                updateLinkedLocalEntryMapping(store, linkedEntryId, input.mapping);
                event.details = {
                    ...event.details,
                    ...getMappingDetails(input.mapping)
                };
            }
            if (timingUpdate) {
                updateLinkedLocalEntryTiming(store, linkedEntryId, timingUpdate);
            }
        }
        store.state.lastError = null;
        return this.saveAndReturnState(store);
    }
    async resumeTimelineEvent(eventId) {
        const store = await this.store.load();
        const target = getTimelineResumeTarget(store, eventId);
        if (!target) {
            throw new HttpError(404, "TIMELINE_RESUME_TARGET_NOT_FOUND", "Timeline entry cannot be resumed");
        }
        if (store.state.runningTimer?.entryId === target.entryId) {
            store.state.lastError = null;
            return this.saveAndReturnState(store);
        }
        const timestamp = this.now().toISOString();
        return this.runRecoverableTimerOperation(store, "timeline-resume", async () => {
            store.state.resumeStack = store.state.resumeStack.filter((item) => item.entryId !== target.entryId);
            const stoppedTimer = await this.stopCurrentTimer(store, timestamp);
            if (stoppedTimer?.mode === "work" &&
                stoppedTimer.context &&
                stoppedTimer.entryId !== target.entryId) {
                this.pushResumeStackItem(store, toResumeStackItem(stoppedTimer, timestamp));
            }
            const resumeResult = await this.resumeTimer(store, target, timestamp);
            const timer = resumeResult.timer;
            store.state.lastError = null;
            this.appendEvent(store, {
                type: "timer-resumed",
                summary: `Resumed ${target.context.key}`,
                context: target.context,
                timer,
                entryId: timer.entryId,
                details: {
                    ...getResumeEventDetails(stoppedTimer, resumeResult),
                    sourceEventId: eventId
                }
            });
            return this.saveAndReturnState(store);
        });
    }
    async removeTimelineEvent(eventId) {
        const store = await this.store.load();
        const event = store.events.find((candidate) => candidate.id === eventId);
        if (!event) {
            throw new HttpError(404, "TIMELINE_EVENT_NOT_FOUND", "Timeline event was not found");
        }
        const linkedEntryId = event.entryId ?? event.timer?.entryId;
        if (!linkedEntryId) {
            store.events = store.events.filter((candidate) => candidate.id !== eventId);
            store.state.lastError = null;
            return this.saveAndReturnState(store);
        }
        store.events = store.events.filter((candidate) => !isTimelineEventLinkedToEntry(candidate, linkedEntryId));
        store.harvestEntries = store.harvestEntries.filter((entry) => entry.entryId !== linkedEntryId);
        store.state.resumeStack = store.state.resumeStack.filter((item) => item.entryId !== linkedEntryId);
        if (store.state.runningTimer?.entryId === linkedEntryId) {
            store.state.runningTimer = null;
        }
        store.state.lastError = null;
        return this.saveAndReturnState(store);
    }
    async loadExistingDailyStores() {
        let files;
        try {
            files = await readdir(this.store.dataDir);
        }
        catch {
            return [];
        }
        const stores = [];
        for (const file of files) {
            if (!/^\d{4}-\d{2}-\d{2}\.json$/.test(file)) {
                continue;
            }
            try {
                const rawStore = JSON.parse(await readFile(join(this.store.dataDir, file), "utf8"));
                const parsedStore = DailyStoreFileSchema.safeParse(rawStore);
                if (parsedStore.success) {
                    stores.push(parsedStore.data);
                }
            }
            catch {
                continue;
            }
        }
        return stores;
    }
    async getTrackableDetectedContext(store) {
        const context = store.state.lastDetectedContext;
        if (!context) {
            return this.rejectCommand(store, 409, "NO_DETECTED_CONTEXT", "No browser context has been detected yet");
        }
        if (!context.trackable) {
            return this.rejectCommand(store, 409, "UNTRACKABLE_CONTEXT", "Detected context cannot be tracked", {
                reason: context.reason
            });
        }
        return context;
    }
    async getTrackableStartContext(store, contextId) {
        if (!contextId) {
            return this.getTrackableDetectedContext(store);
        }
        const context = this.getRecentTrackableContexts(store).find((candidate) => candidate.id === contextId) ??
            null;
        if (!context) {
            return this.rejectCommand(store, 409, "SELECTED_CONTEXT_UNAVAILABLE", "Selected recent context cannot be tracked", {
                contextId
            });
        }
        return context;
    }
    async rejectCommand(store, statusCode, code, message, details) {
        const error = {
            code,
            message,
            details
        };
        store.state.lastError = error;
        this.appendEvent(store, {
            type: "timer-error",
            summary: message,
            context: store.state.lastDetectedContext ?? undefined,
            details: {
                code,
                details
            }
        });
        await this.store.save(store);
        throw new HttpError(statusCode, code, message, details);
    }
    async runRecoverableTimerOperation(store, action, operation) {
        const failureStore = cloneDailyStore(store);
        try {
            return await operation();
        }
        catch (error) {
            const operationError = toTimerOperationError(error, action);
            this.recordTimerOperationError(failureStore, operationError, {
                action,
                entryId: failureStore.state.runningTimer?.entryId,
                timer: failureStore.state.runningTimer ?? undefined
            });
            await this.store.save(failureStore);
            throw new HttpError(operationError.statusCode, operationError.error.code, operationError.error.message, operationError.error.details);
        }
    }
    recordTimerOperationError(store, operationError, options) {
        const existingLastEvent = store.events.at(-1);
        const shouldAppendEvent = !options.dedupe ||
            !existingLastEvent ||
            existingLastEvent.type !== "timer-error" ||
            existingLastEvent.entryId !== options.entryId ||
            existingLastEvent.details?.code !== operationError.error.code ||
            existingLastEvent.details?.action !== options.action;
        store.state.lastError = operationError.error;
        if (!shouldAppendEvent) {
            return;
        }
        this.appendEvent(store, {
            type: "timer-error",
            summary: operationError.error.message,
            context: options.timer?.context ?? store.state.lastDetectedContext ?? undefined,
            timer: options.timer,
            entryId: options.entryId,
            details: {
                action: options.action,
                code: operationError.error.code,
                details: operationError.error.details
            }
        });
    }
    async reconcileLiveRunningState(store) {
        const currentTimer = store.state.runningTimer;
        if (currentTimer?.backend !== "harvest" || !this.harvestTimerAdapter) {
            return store;
        }
        const setupStatus = await this.getSetupStatus();
        if (!setupStatus.ready || !(await this.harvestTimerAdapter.getStatus()).ready) {
            return store;
        }
        try {
            const runningEntries = await this.harvestTimerAdapter.listRunningEntries(store);
            if (runningEntries.some((entry) => isSameHarvestRunningEntry(entry, currentTimer))) {
                return store;
            }
            const timestamp = this.now().toISOString();
            const localEntry = store.harvestEntries.find((entry) => entry.entryId === currentTimer.entryId);
            if (localEntry) {
                localEntry.stoppedAt = timestamp;
                localEntry.updatedAt = timestamp;
            }
            store.state.runningTimer = null;
            this.recordTimerOperationError(store, {
                statusCode: 409,
                error: {
                    code: "HARVEST_TIMER_RECONCILED",
                    message: "Local Harvest timer state was stale and has been cleared",
                    details: {
                        entryId: currentTimer.entryId,
                        harvestEntryId: currentTimer.harvestEntryId
                    }
                }
            }, {
                action: "reconcile",
                entryId: currentTimer.entryId,
                timer: currentTimer,
                dedupe: true
            });
            return this.store.save(store);
        }
        catch (error) {
            const operationError = toTimerOperationError(error, "reconcile");
            this.recordTimerOperationError(store, operationError, {
                action: "reconcile",
                entryId: currentTimer.entryId,
                timer: currentTimer,
                dedupe: true
            });
            return this.store.save(store);
        }
    }
    async syncHarvestTimeEntriesForToday(store) {
        if (!this.harvestClient?.listTimeEntries) {
            return store;
        }
        const setupStatus = await this.getSetupStatus();
        if (!setupStatus.harvestConfigured || !setupStatus.accountConfigured) {
            return store;
        }
        let response;
        try {
            response = await this.harvestClient.listTimeEntries({
                from: store.date,
                to: store.date
            });
        }
        catch {
            return store;
        }
        const remoteEntries = response.timeEntries.filter((entry) => entry.spent_date === store.date && Number.isInteger(entry.id) && entry.id > 0);
        let changed = false;
        for (const entry of remoteEntries) {
            changed = this.upsertImportedHarvestTimeEntry(store, entry) || changed;
        }
        changed = reconcileHarvestSnapshot(store, remoteEntries) || changed;
        return changed ? this.store.save(store) : store;
    }
    upsertImportedHarvestTimeEntry(store, entry) {
        if (!Number.isInteger(entry.id) || entry.id <= 0) {
            return false;
        }
        const timestamp = this.now().toISOString();
        const timing = getHarvestTimeEntryTiming(entry);
        const context = this.getImportedHarvestContext(entry, timing.startedAt);
        const mode = context ? "work" : getHarvestTimeEntryMode(entry);
        const mappingName = getHarvestTimeEntryMappingName(entry);
        const description = context
            ? formatWorkTimerDescription(context, getHarvestTimeEntryDescription(entry, mappingName))
            : getHarvestTimeEntryDescription(entry, mappingName);
        const entryId = `harvest-${entry.id}`;
        const timer = {
            entryId,
            mode,
            backend: "harvest",
            startedAt: timing.startedAt,
            description,
            context: mode === "work" ? context : null,
            mappingName,
            harvestEntryId: entry.id
        };
        const localEntry = {
            id: entry.id,
            entryId,
            backend: "harvest",
            mode,
            description,
            context: mode === "work" ? context : null,
            mappingName,
            startedAt: timing.startedAt,
            stoppedAt: timing.stoppedAt
        };
        const details = {
            ...getHarvestTimeEntryTimelineDetails(entry, mappingName),
            ...getTimelineTimingDetails({
                startedAt: timing.startedAt,
                startedTime: formatIsoTimestampAsClockTime(timing.startedAt),
                stoppedAt: timing.stoppedAt,
                endedTime: timing.stoppedAt ? formatIsoTimestampAsClockTime(timing.stoppedAt) : undefined
            })
        };
        const startType = mode === "comms" ? "timer-comms" : "timer-started";
        const startSummary = context ? `Started ${context.key}` : `Started ${description}`;
        let changed = false;
        if (context && !store.contexts.some((candidate) => candidate.id === context.id)) {
            upsertDailyContextEvidence(store.contexts, context);
            changed = true;
        }
        changed = upsertImportedHarvestLocalEntry(store, localEntry, timestamp) || changed;
        changed =
            upsertImportedHarvestTimelineEvent(store, {
                id: getImportedHarvestTimelineEventId(entry.id, "start"),
                type: startType,
                occurredAt: timing.startedAt,
                summary: startSummary,
                context: context ?? undefined,
                timer,
                entryId,
                details: {
                    ...details,
                    importEvent: "start"
                }
            }) || changed;
        if (timing.stoppedAt) {
            changed =
                upsertImportedHarvestTimelineEvent(store, {
                    id: getImportedHarvestTimelineEventId(entry.id, "stop"),
                    type: "timer-stopped",
                    occurredAt: timing.stoppedAt,
                    summary: `Stopped ${description}`,
                    context: context ?? undefined,
                    timer,
                    entryId,
                    details: {
                        ...details,
                        importEvent: "stop"
                    }
                }) || changed;
        }
        else {
            changed = removeImportedHarvestStopEvents(store, entryId) || changed;
        }
        if (entry.is_running && shouldUseImportedRunningTimer(store.state.runningTimer, timer)) {
            if (!areRecordsEqual(store.state.runningTimer, timer)) {
                store.state.runningTimer = timer;
                changed = true;
            }
        }
        return changed;
    }
    getImportedHarvestContext(entry, occurredAt) {
        const detectionTitle = getHarvestTimeEntryDetectionTitle(entry);
        const permalink = entry.external_reference?.permalink ?? undefined;
        if (permalink) {
            const detectedContext = this.detector.detect({
                title: detectionTitle,
                url: permalink,
                occurredAt
            });
            if (detectedContext.trackable) {
                return detectedContext;
            }
        }
        const referenceId = entry.external_reference?.id?.trim();
        if (referenceId) {
            const detectedContext = this.detector.detectClipboardTicket({
                key: referenceId,
                title: detectionTitle,
                url: permalink,
                occurredAt
            });
            if (detectedContext.trackable) {
                return detectedContext;
            }
        }
        const noteEvidence = getHarvestTimeEntryPrimaryNote(entry.notes);
        if (!noteEvidence) {
            return null;
        }
        const detectedContext = this.detector.detectClipboardTicket({
            key: noteEvidence.slice(0, 64),
            title: noteEvidence,
            occurredAt
        });
        return detectedContext.trackable ? detectedContext : null;
    }
    async stopCurrentTimer(store, timestamp) {
        const currentTimer = store.state.runningTimer;
        if (!currentTimer) {
            return null;
        }
        const stoppedTimer = await this.getTimerAdapterForBackend(currentTimer.backend).stopEntry(store, currentTimer, timestamp);
        if (stoppedTimer) {
            updateLinkedLocalEntryTiming(store, stoppedTimer.entryId, {
                stoppedAt: timestamp,
                endedTime: formatIsoTimestampAsClockTime(timestamp)
            });
        }
        return stoppedTimer;
    }
    async resumeTimer(store, target, timestamp) {
        const timerAdapter = this.getTimerAdapterForBackend(target.backend);
        try {
            return {
                timer: await timerAdapter.restartEntry(store, target, timestamp),
                operation: "restart"
            };
        }
        catch (restartError) {
            if (target.backend !== "harvest") {
                throw restartError;
            }
            const mappingResolution = this.resolveWorkMapping(target.context);
            const fallbackAdapter = await this.selectTimerAdapter(mappingResolution);
            if (fallbackAdapter.backend !== "harvest") {
                throw restartError;
            }
            return {
                timer: await fallbackAdapter.createRunningEntry(store, {
                    mode: "work",
                    context: target.context,
                    description: target.description,
                    mapping: getResumeFallbackMapping(mappingResolution, target),
                    timestamp
                }),
                operation: "create",
                originalEntryId: target.entryId
            };
        }
    }
    async selectTimerAdapter(mappingResolution) {
        const setupStatus = await this.getSetupStatus();
        if (this.harvestTimerAdapter &&
            isCompleteHarvestMapping(mappingResolution.mapping) &&
            setupStatus.harvestConfigured &&
            setupStatus.accountConfigured &&
            (await this.harvestTimerAdapter.getStatus()).ready) {
            return this.harvestTimerAdapter;
        }
        return this.mockTimerAdapter;
    }
    async shouldRequireEntryMapping() {
        const setupStatus = await this.getSetupStatus();
        return setupStatus.harvestConfigured && setupStatus.accountConfigured;
    }
    getTimerAdapterForBackend(backend) {
        if (backend === "mock") {
            return this.mockTimerAdapter;
        }
        if (this.harvestTimerAdapter) {
            return this.harvestTimerAdapter;
        }
        throw new HttpError(503, "HARVEST_TIMER_UNAVAILABLE", "Harvest timer operations are unavailable");
    }
    pushResumeStackItem(store, item) {
        store.state.resumeStack = [
            item,
            ...store.state.resumeStack.filter((existingItem) => existingItem.entryId !== item.entryId)
        ];
    }
    removeResumeItemsForContext(store, contextId) {
        store.state.resumeStack = store.state.resumeStack.filter((item) => item.context.id !== contextId);
    }
    appendEvent(store, event) {
        const { occurredAt = this.now().toISOString(), ...eventInput } = event;
        store.events.push({
            id: `event-${store.events.length + 1}`,
            occurredAt,
            ...eventInput
        });
    }
    async saveAndReturnState(store) {
        const savedStore = await this.store.save(store);
        return this.toCockpitState(savedStore);
    }
    async toCockpitState(store) {
        return {
            mode: getCockpitMode(store),
            runningTimer: store.state.runningTimer,
            detectedContext: store.state.lastDetectedContext,
            recentContexts: this.getRecentTrackableContexts(store),
            latestUntrackedContext: this.getLatestUntrackedContext(store),
            resumeTarget: store.state.resumeStack[0] ?? null,
            setup: await this.getSetupStatus(),
            today: {
                date: store.date,
                contexts: store.contexts,
                timeline: store.events,
                reviewEntries: this.getDailyReviewEntries(store),
                historyGroups: this.getHistoryGroups(store)
            },
            lastError: store.state.lastError
        };
    }
    getRecentTrackableContexts(store) {
        return store.contexts
            .map(toTrackableContextFromEvidence)
            .filter(isPresent)
            .sort((firstContext, secondContext) => Date.parse(secondContext.detectedAt) - Date.parse(firstContext.detectedAt))
            .slice(0, RECENT_CONTEXT_LIMIT);
    }
    async enrichDetectedContext(context) {
        if (!this.jiraIssueResolver) {
            return context;
        }
        try {
            return await this.jiraIssueResolver.enrichContext(context);
        }
        catch {
            return context;
        }
    }
    getLatestUntrackedContext(store) {
        return (store.contexts
            .map(toUnknownContextFromEvidence)
            .filter(isPresent)
            .sort((firstContext, secondContext) => Date.parse(secondContext.detectedAt) - Date.parse(firstContext.detectedAt))[0] ?? null);
    }
    resolveWorkMapping(context) {
        const projectKey = getTicketProjectKey(context.key);
        return {
            mapping: {
                mappingName: projectKey ? `Mock ${projectKey}` : "Mock work"
            },
            projectKey: projectKey ?? undefined
        };
    }
    resolveCommsMapping() {
        return {
            mapping: {
                mappingName: "Mock comms"
            }
        };
    }
    async getSetupStatus() {
        const config = await this.backendConfigService?.loadConfig();
        const harvestConfigured = this.harvestAuthService
            ? Boolean(await this.harvestAuthService.getAccessToken())
            : hasHarvestCredentials(this.config);
        const accountConfigured = Boolean(config?.harvest.accountId ?? this.config.HARVEST_ACCOUNT_ID) ||
            ((await this.harvestAuthService?.hasAccount()) ?? false);
        const missing = [];
        if (!harvestConfigured) {
            missing.push("harvest-credentials");
        }
        if (!accountConfigured) {
            missing.push("harvest-account");
        }
        const liveReady = missing.length === 0;
        const mode = liveReady ? "live" : "mock";
        return {
            mode,
            ready: mode === "mock" ? true : liveReady,
            harvestConfigured,
            accountConfigured,
            missing: mode === "mock" ? [] : missing
        };
    }
    getDailyReviewEntries(store) {
        const harvestEntries = this.getHarvestReviewEntries(store);
        const manualEntries = this.getManualReviewEntries(store).filter((entry) => !harvestEntries.some((harvestEntry) => areDailyReviewEntriesSameWork(entry, harvestEntry) &&
            doDailyReviewEntriesOverlap(entry, harvestEntry)));
        const timesheetUpdateStartMs = getTimesheetUpdateStartMs(harvestEntries);
        const historyEntries = this.getHistoryReviewEntries(store)
            .filter((entry) => !store.dismissedReviewEntryIds.includes(entry.id))
            .map((entry) => isTimesheetUpdateReviewEntry(entry, timesheetUpdateStartMs)
            ? {
                ...entry,
                reviewStatus: "timesheet-update"
            }
            : entry)
            .filter((entry) => !harvestEntries.some((harvestEntry) => areDailyReviewEntriesSameWork(entry, harvestEntry) &&
            doDailyReviewEntriesOverlap(entry, harvestEntry)));
        return [...harvestEntries, ...manualEntries, ...historyEntries].sort((firstEntry, secondEntry) => Date.parse(firstEntry.startedAt) - Date.parse(secondEntry.startedAt));
    }
    getManualReviewEntries(store) {
        return store.manualEntries.map((entry) => {
            const stoppedAt = entry.stoppedAt;
            const durationMinutes = stoppedAt
                ? Math.max(0, Math.round((Date.parse(stoppedAt) - Date.parse(entry.startedAt)) / 60_000))
                : 0;
            return {
                id: entry.id,
                source: "manual",
                key: entry.key,
                title: entry.title,
                notes: entry.notes,
                startedAt: entry.startedAt,
                stoppedAt,
                durationMinutes,
                confidence: entry.confidence,
                evidenceCount: entry.evidenceCount,
                historyItems: [],
                context: entry.context,
                externalReference: getDailyReviewExternalReferenceFromContext(entry.context)
            };
        });
    }
    getHarvestReviewEntries(store) {
        return store.harvestEntries
            .filter((entry) => entry.backend === "harvest")
            .map((entry) => {
            const events = store.events
                .filter((event) => isTimelineEventLinkedToEntry(event, entry.entryId))
                .sort((firstEvent, secondEvent) => Date.parse(firstEvent.occurredAt) - Date.parse(secondEvent.occurredAt));
            const editableEvent = [...events].reverse().find((event) => event.type === "timer-stopped") ??
                events.find(isTimerSegmentStartEvent);
            const context = entry.context ?? (editableEvent ? getTrackableContextFromEvent(editableEvent) : null);
            const startedAt = entry.startedAt;
            const stoppedAt = entry.stoppedAt ?? null;
            const durationMinutes = stoppedAt
                ? Math.max(0, Math.round((Date.parse(stoppedAt) - Date.parse(startedAt)) / 60_000))
                : 0;
            const key = context?.key ?? `Harvest #${entry.id}`;
            const title = normalizeDailyReviewTitle(entry.description, key);
            return {
                id: `harvest:${entry.id}`,
                source: "harvest",
                key,
                title,
                notes: formatDailyReviewNotes(key, title),
                startedAt,
                stoppedAt,
                durationMinutes,
                confidence: context?.confidence ?? 1,
                evidenceCount: Math.max(1, events.length),
                historyItems: [],
                context,
                mapping: getDailyReviewMappingFromEvents(events),
                entryId: entry.entryId,
                harvestEntryId: entry.id,
                timelineEventId: editableEvent?.id,
                externalReference: getDailyReviewExternalReferenceFromEvents(events) ??
                    (context ? getDailyReviewExternalReferenceFromContext(context) : undefined)
            };
        });
    }
    getHistoryReviewEntries(store) {
        const entries = [];
        let activeSegment = null;
        let pendingSegmentStartMs = null;
        const reviewStartMs = getDailyReviewStartMs(store.date);
        const evidenceItems = filterBriefHistoryEvidence((store.historyItems ?? [])
            .map((item) => this.getHistoryReviewEvidence(item))
            .filter(isPresent)
            .filter((evidence) => !isExcludedReviewEvidence(evidence))
            .filter((evidence) => evidence.visitedAtMs >= reviewStartMs)
            .sort((firstEvidence, secondEvidence) => firstEvidence.visitedAtMs - secondEvidence.visitedAtMs));
        const closeActiveSegment = (closedAtMs) => {
            if (!activeSegment) {
                return;
            }
            const entry = toDailyReviewEntryFromHistorySegment(activeSegment, closedAtMs);
            if (entry) {
                entries.push(entry);
            }
            activeSegment = null;
        };
        for (const evidence of evidenceItems) {
            const context = evidence.context.trackable ? evidence.context : null;
            const isStartingContext = context !== null && isTicketLikeContext(context);
            if (!activeSegment) {
                if (isStartingContext) {
                    activeSegment = createHistoryReviewSegment(context, evidence, {
                        startedAtMs: pendingSegmentStartMs ?? evidence.visitedAtMs
                    });
                    pendingSegmentStartMs = null;
                }
                else if (pendingSegmentStartMs === null) {
                    pendingSegmentStartMs = evidence.visitedAtMs;
                }
                continue;
            }
            if (context && areContextsSameReviewWork(activeSegment.context, context)) {
                extendHistoryReviewSegment(activeSegment, evidence);
                continue;
            }
            if (isStartingContext) {
                closeActiveSegment(evidence.visitedAtMs);
                activeSegment = createHistoryReviewSegment(context, evidence);
                continue;
            }
            extendHistoryReviewSegment(activeSegment, evidence);
        }
        if (activeSegment) {
            closeActiveSegment(activeSegment.lastActivityAtMs);
        }
        return entries;
    }
    getHistoryReviewEvidence(item) {
        const visitedAtMs = item.lastVisitTime;
        if (!Number.isFinite(visitedAtMs)) {
            return null;
        }
        const visitedAt = new Date(visitedAtMs).toISOString();
        const context = this.detector.detect({
            title: item.title,
            url: item.url,
            occurredAt: visitedAt
        });
        return {
            context,
            host: getUrlHost(item.url),
            item,
            title: item.title?.trim() ?? "",
            url: item.url,
            visitedAt,
            visitedAtMs
        };
    }
    getHistoryGroups(store) {
        const segments = getTimerHistorySegments(store.events);
        const historyItems = store.historyItems ?? [];
        for (const item of historyItems) {
            const segment = getSegmentForHistoryItem(segments, item);
            if (!segment) {
                continue;
            }
            const context = this.detector.detect({
                title: item.title,
                url: item.url,
                occurredAt: new Date(item.lastVisitTime).toISOString()
            });
            const historyItem = {
                ...item,
                visitedAt: new Date(item.lastVisitTime).toISOString(),
                context,
                matchesTimerContext: doesHistoryItemMatchTimerContext(context, segment.context)
            };
            segment.items.push(historyItem);
        }
        return segments;
    }
}
function areDailyReviewEntriesSameWork(firstEntry, secondEntry) {
    return firstEntry.key.toLowerCase() === secondEntry.key.toLowerCase();
}
function doDailyReviewEntriesOverlap(firstEntry, secondEntry) {
    const firstStart = Date.parse(firstEntry.startedAt);
    const firstEnd = Date.parse(firstEntry.stoppedAt ?? firstEntry.startedAt);
    const secondStart = Date.parse(secondEntry.startedAt);
    const secondEnd = Date.parse(secondEntry.stoppedAt ?? secondEntry.startedAt);
    if (!Number.isFinite(firstStart) ||
        !Number.isFinite(firstEnd) ||
        !Number.isFinite(secondStart) ||
        !Number.isFinite(secondEnd)) {
        return false;
    }
    return Math.max(firstStart, secondStart) <= Math.min(firstEnd, secondEnd);
}
function getTimesheetUpdateStartMs(harvestEntries) {
    const harvestCoverage = getHarvestReviewCoverage(harvestEntries);
    if (harvestCoverage.totalMinutes < COMPLETE_TIMESHEET_MINUTES ||
        harvestCoverage.latestStoppedAtMs === null) {
        return null;
    }
    return harvestCoverage.latestStoppedAtMs;
}
function getHarvestReviewCoverage(entries) {
    let latestStoppedAtMs = null;
    let totalMinutes = 0;
    for (const entry of entries) {
        if (entry.source !== "harvest" || !entry.stoppedAt) {
            continue;
        }
        const startedAtMs = Date.parse(entry.startedAt);
        const stoppedAtMs = Date.parse(entry.stoppedAt);
        if (!Number.isFinite(startedAtMs) || !Number.isFinite(stoppedAtMs)) {
            continue;
        }
        totalMinutes += Math.max(0, Math.round((stoppedAtMs - startedAtMs) / 60_000));
        latestStoppedAtMs =
            latestStoppedAtMs === null ? stoppedAtMs : Math.max(latestStoppedAtMs, stoppedAtMs);
    }
    return {
        latestStoppedAtMs,
        totalMinutes
    };
}
function isTimesheetUpdateReviewEntry(entry, timesheetUpdateStartMs) {
    if (timesheetUpdateStartMs === null || entry.source !== "browser-history") {
        return false;
    }
    const startedAtMs = Date.parse(entry.startedAt);
    return Number.isFinite(startedAtMs) && startedAtMs >= timesheetUpdateStartMs;
}
function getDailyReviewMappingFromEvents(events) {
    for (const event of [...events].reverse()) {
        const projectId = getDetailsPositiveInteger(event.details, "projectId");
        const taskId = getDetailsPositiveInteger(event.details, "taskId");
        if (!projectId || !taskId) {
            continue;
        }
        const mapping = {
            projectId,
            taskId
        };
        const assignmentId = getDetailsPositiveInteger(event.details, "assignmentId");
        const mappingName = getDetailsString(event.details, "mappingName");
        const projectName = getDetailsString(event.details, "projectName");
        const taskName = getDetailsString(event.details, "taskName");
        const clientName = getDetailsString(event.details, "clientName");
        if (assignmentId) {
            mapping.assignmentId = assignmentId;
        }
        if (mappingName) {
            mapping.mappingName = mappingName;
        }
        else {
            mapping.mappingName = getMappingDisplayName({
                clientName,
                projectId,
                projectName,
                taskId,
                taskName
            });
        }
        if (projectName) {
            mapping.projectName = projectName;
        }
        if (taskName) {
            mapping.taskName = taskName;
        }
        if (clientName) {
            mapping.clientName = clientName;
        }
        return mapping;
    }
    return undefined;
}
function getDailyReviewExternalReferenceFromEvents(events) {
    for (const event of [...events].reverse()) {
        const value = event.details?.externalReference;
        if (isHarvestExternalReference(value)) {
            return value;
        }
    }
    return undefined;
}
function isHarvestExternalReference(value) {
    if (!value || typeof value !== "object") {
        return false;
    }
    const reference = value;
    return typeof reference.id === "string" && reference.id.trim().length > 0;
}
function getDailyReviewExternalReferenceFromContext(context) {
    if (context.source !== "jira" && context.source !== "github") {
        return undefined;
    }
    const permalink = context.permalink ?? context.url;
    if (!isHttpUrl(permalink)) {
        return undefined;
    }
    const reference = {
        id: context.key,
        permalink,
        service: context.source
    };
    const githubRepository = context.source === "github" ? getGitHubRepositoryFromUrl(permalink) : null;
    if (githubRepository) {
        reference.group_id = githubRepository;
    }
    return reference;
}
function createHistoryReviewSegment(context, evidence, options = {}) {
    const title = normalizeDailyReviewTitle(getHistoryEvidenceTitle(evidence, context.key), context.key);
    const supportHosts = new Set();
    if (evidence.host) {
        supportHosts.add(evidence.host);
    }
    return {
        confidenceTotal: context.confidence,
        context,
        evidenceCount: 1,
        firstUrl: evidence.url,
        historyItems: [toReviewHistoryItem(evidence, context)],
        lastActivityAtMs: evidence.visitedAtMs,
        startedAtMs: options.startedAtMs ?? evidence.visitedAtMs,
        supportHosts,
        title
    };
}
function extendHistoryReviewSegment(segment, evidence) {
    segment.lastActivityAtMs = Math.max(segment.lastActivityAtMs, evidence.visitedAtMs);
    segment.evidenceCount += 1;
    segment.confidenceTotal += getHistoryReviewEvidenceConfidence(segment, evidence);
    segment.historyItems.push(toReviewHistoryItem(evidence, segment.context));
    if (evidence.host) {
        segment.supportHosts.add(evidence.host);
    }
    if (evidence.context.trackable &&
        areContextsSameReviewWork(segment.context, evidence.context) &&
        (segment.title === segment.context.key || evidence.context.source === "jira")) {
        segment.title = normalizeDailyReviewTitle(getHistoryEvidenceTitle(evidence, segment.context.key), segment.context.key);
    }
}
function toDailyReviewEntryFromHistorySegment(segment, closedAtMs) {
    const stoppedAtMs = Math.max(segment.lastActivityAtMs, closedAtMs);
    const durationMinutes = Math.max(0, Math.round((stoppedAtMs - segment.startedAtMs) / 60_000));
    if (durationMinutes < MIN_REVIEW_DURATION_MINUTES) {
        return null;
    }
    const startedAt = new Date(segment.startedAtMs).toISOString();
    const stoppedAt = new Date(stoppedAtMs).toISOString();
    const confidence = Math.min(1, Math.max(0, segment.confidenceTotal / Math.max(1, segment.evidenceCount)));
    return {
        id: `history:${segment.context.key}:${startedAt}`,
        source: "browser-history",
        key: segment.context.key,
        title: segment.title,
        notes: formatDailyReviewNotes(segment.context.key, segment.title),
        startedAt,
        stoppedAt,
        durationMinutes,
        confidence,
        evidenceCount: segment.evidenceCount,
        historyItems: segment.historyItems,
        context: {
            ...segment.context,
            detectedAt: startedAt
        },
        externalReference: getDailyReviewExternalReferenceFromContext(segment.context)
    };
}
function toReviewHistoryItem(evidence, segmentContext) {
    return {
        ...evidence.item,
        visitedAt: evidence.visitedAt,
        context: evidence.context,
        matchesTimerContext: evidence.context.trackable && areContextsSameReviewWork(segmentContext, evidence.context)
    };
}
function filterBriefHistoryEvidence(items) {
    return items.filter((item, index) => {
        const nextItem = items[index + 1];
        if (!nextItem) {
            return true;
        }
        return nextItem.visitedAtMs - item.visitedAtMs >= HISTORY_REVIEW_MIN_VISIBLE_MS;
    });
}
function getDailyReviewStartMs(date) {
    const [year, month, day] = parseIsoDateParts(date);
    return new Date(year, month - 1, day, DEFAULT_DAILY_REVIEW_START_HOUR, 0, 0, 0).getTime();
}
function isExcludedReviewEvidence(evidence) {
    const host = evidence.host?.toLowerCase() ?? "";
    return (!host ||
        host === "127.0.0.1" ||
        host === "localhost" ||
        host.endsWith(".localhost") ||
        host.endsWith("harvestapp.com") ||
        host.endsWith("getharvest.com") ||
        evidence.url.startsWith("chrome:") ||
        evidence.url.startsWith("chrome-extension:"));
}
function isSupportiveReviewHost(host) {
    if (!host) {
        return false;
    }
    const normalizedHost = host.toLowerCase();
    return (normalizedHost.endsWith(".local") ||
        normalizedHost.startsWith("dev.") ||
        normalizedHost.startsWith("staging.") ||
        normalizedHost.startsWith("uat.") ||
        normalizedHost.includes("soho") ||
        normalizedHost.includes("d3r") ||
        normalizedHost === "mail.google.com" ||
        normalizedHost.endsWith(".google.com") ||
        normalizedHost === "github.com" ||
        normalizedHost.endsWith(".github.com") ||
        normalizedHost.endsWith(".atlassian.net"));
}
function historyEvidenceContainsContextKey(evidence, key) {
    const haystack = `${evidence.title}\n${evidence.url}`.toLowerCase();
    const normalizedKey = key.toLowerCase();
    const spacedKey = normalizedKey.replace(/-/g, " ");
    return haystack.includes(normalizedKey) || haystack.includes(spacedKey);
}
function isTicketLikeContext(context) {
    return /^[A-Z][A-Z0-9]+-\d+$/i.test(context.key);
}
function areContextsSameReviewWork(firstContext, secondContext) {
    if (firstContext.key.toLowerCase() === secondContext.key.toLowerCase()) {
        return true;
    }
    const haystack = `${secondContext.title}\n${secondContext.url}\n${secondContext.permalink ?? ""}`.toLowerCase();
    const key = firstContext.key.toLowerCase();
    return haystack.includes(key);
}
function getHistoryReviewEvidenceConfidence(segment, evidence) {
    if (evidence.context.trackable && areContextsSameReviewWork(segment.context, evidence.context)) {
        return evidence.context.confidence;
    }
    if (historyEvidenceContainsContextKey(evidence, segment.context.key)) {
        return 0.7;
    }
    if (isSupportiveReviewHost(evidence.host)) {
        return 0.45;
    }
    return 0.25;
}
function getHistoryEvidenceTitle(evidence, fallbackKey) {
    if (evidence.context.trackable) {
        return evidence.context.title;
    }
    return evidence.title || fallbackKey;
}
function formatDailyReviewNotes(key, title) {
    return `${key}: ${normalizeDailyReviewTitle(title, key)}`;
}
function normalizeDailyReviewTitle(value, key) {
    const fallback = key;
    const escapedKey = escapeRegex(key);
    const normalized = normalizeWhitespace(value)
        ?.replace(/^(detected|started|stopped)\s+/i, "")
        .replace(/\s+by\s+.+?\s+·\s+Pull Request\s+#\d+\s+·\s+.+$/i, "")
        .replace(/\s+·\s+Pull Request\s+#\d+\s+·\s+.+$/i, "")
        .replace(/\s+·\s+Issue\s+#\d+\s+·\s+.+$/i, "")
        .replace(/\s+-\s+JIRA$/i, "")
        .replace(new RegExp(`^revert\\s+["']?\\[${escapedKey}\\]\\s*`, "i"), "")
        .replace(/^["']+|["']+$/g, "")
        .replace(new RegExp(`^\\[${escapedKey}\\]\\s*`, "i"), "")
        .replace(new RegExp(`^${escapedKey}\\s*[:\\-]\\s*`, "i"), "")
        .replace(new RegExp(`^${escapedKey}\\s+`, "i"), "")
        .trim();
    return normalized || fallback;
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getUrlHost(value) {
    try {
        return new URL(value).hostname.toLowerCase();
    }
    catch {
        return null;
    }
}
function addNormalizedHost(hosts, value) {
    const host = normalizeManualEntryHost(value);
    if (host) {
        hosts.add(host);
    }
}
function normalizeManualEntryHost(value) {
    return (value
        ?.trim()
        .toLowerCase()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")
        .replace(/\.$/, "") ?? "");
}
function getManualEntryKindForSource(source) {
    if (source === "github") {
        return "github-issue";
    }
    return source === "generic-ticket" ? "generic-ticket" : "jira-issue";
}
function getManualEntryPermalink(input) {
    if (!input.host) {
        return undefined;
    }
    if (input.source === "jira" || input.kind === "jira-issue") {
        return `https://${input.host}/browse/${encodeURIComponent(input.key)}`;
    }
    return `https://${input.host}/`;
}
function createManualDailyEntryId(key, timestamp, index) {
    const safeKey = key.toLowerCase().replace(/[^a-z0-9_-]+/gi, "-");
    const safeTimestamp = timestamp.replace(/[^0-9a-z]+/gi, "-").replace(/^-+|-+$/g, "");
    return `manual-${safeKey}-${safeTimestamp}-${index}`;
}
function getGitHubRepositoryFromUrl(value) {
    try {
        const url = new URL(value);
        const [owner, repo] = url.pathname.split("/").filter(Boolean);
        return owner && repo ? `${owner}/${repo}` : null;
    }
    catch {
        return null;
    }
}
function isHttpUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
    }
    catch {
        return false;
    }
}
function getDetailsPositiveInteger(details, key) {
    const value = details?.[key];
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}
function toTrackableContextFromEvidence(context) {
    if (!context.trackable ||
        context.kind === "unknown" ||
        !isTrackableContextSource(context.source) ||
        !context.key ||
        !context.latestTitle ||
        !context.latestUrl ||
        !context.host) {
        return null;
    }
    const detectedContext = {
        id: context.id,
        trackable: true,
        kind: context.kind,
        source: context.source,
        key: context.key,
        title: context.latestTitle,
        url: context.latestUrl,
        host: context.host,
        confidence: context.confidence,
        detectedAt: context.lastSeenAt
    };
    if (context.permalink) {
        detectedContext.permalink = context.permalink;
    }
    if (context.jira) {
        detectedContext.jira = context.jira;
    }
    return detectedContext;
}
function toUnknownContextFromEvidence(context) {
    if (context.trackable) {
        return null;
    }
    return {
        id: "unknown",
        trackable: false,
        kind: "unknown",
        source: "unknown",
        confidence: 0,
        detectedAt: context.lastSeenAt,
        title: context.latestTitle,
        url: context.latestUrl,
        host: context.host,
        reason: context.reason
    };
}
function isTrackableContextSource(source) {
    return source !== "unknown";
}
function isPresent(value) {
    return value !== null && value !== undefined;
}
function getHarvestTimeEntryTiming(entry) {
    const timerStartedAt = toValidIsoTimestampOrNull(entry.timer_started_at);
    const startedFromClock = parseHarvestClockTimestamp(entry.spent_date, entry.started_time);
    const endedFromClock = parseHarvestClockTimestamp(entry.spent_date, entry.ended_time);
    const durationMilliseconds = Number.isFinite(entry.hours) && entry.hours > 0
        ? Math.round(entry.hours * MILLISECONDS_PER_HOUR)
        : null;
    const startedAt = timerStartedAt ??
        startedFromClock ??
        (endedFromClock && durationMilliseconds
            ? new Date(Date.parse(endedFromClock) - durationMilliseconds).toISOString()
            : getLocalDateStartIso(entry.spent_date));
    if (entry.is_running) {
        return { startedAt };
    }
    let stoppedAt = endedFromClock ??
        (durationMilliseconds
            ? new Date(Date.parse(startedAt) + durationMilliseconds).toISOString()
            : undefined);
    if (stoppedAt && Date.parse(stoppedAt) < Date.parse(startedAt)) {
        stoppedAt = new Date(Date.parse(stoppedAt) + MILLISECONDS_PER_DAY).toISOString();
    }
    return stoppedAt ? { startedAt, stoppedAt } : { startedAt };
}
function getHarvestTimeEntryMode(entry) {
    const notes = entry.notes ?? "";
    const primaryNote = getHarvestTimeEntryPrimaryNote(notes);
    if (/^mode:\s*comms\b/im.test(notes) || /^comms$/i.test(primaryNote ?? "")) {
        return "comms";
    }
    return "work";
}
function getHarvestTimeEntryMappingName(entry) {
    return getMappingDisplayName({
        clientName: entry.client?.name,
        projectId: entry.project?.id,
        projectName: entry.project?.name,
        taskId: entry.task?.id,
        taskName: entry.task?.name
    });
}
function getHarvestTimeEntryDescription(entry, mappingName) {
    return normalizeDescription(getHarvestTimeEntryPrimaryNote(entry.notes), mappingName ?? `Harvest entry ${entry.id}`);
}
function getHarvestTimeEntryDetectionTitle(entry) {
    return (getHarvestTimeEntryPrimaryNote(entry.notes) ??
        entry.external_reference?.id?.trim() ??
        getHarvestTimeEntryMappingName(entry));
}
function getHarvestTimeEntryPrimaryNote(value) {
    const lines = value
        ?.split(/\r?\n/)
        .map(normalizeWhitespace)
        .filter((line) => Boolean(line));
    if (!lines || lines.length === 0) {
        return null;
    }
    for (const line of lines) {
        const titleMatch = /^title:\s*(.+)$/i.exec(line);
        if (titleMatch?.[1]) {
            return titleMatch[1].trim();
        }
        if (/^(mapping|mode|source|ticket key|url):/i.test(line)) {
            continue;
        }
        return line;
    }
    return null;
}
function getHarvestTimeEntryTimelineDetails(entry, mappingName) {
    const details = {
        source: "harvest",
        harvestEntryId: entry.id,
        spentDate: entry.spent_date,
        hours: entry.hours,
        isRunning: entry.is_running
    };
    if (mappingName) {
        details.mappingName = mappingName;
    }
    if (entry.client) {
        details.clientId = entry.client.id;
        details.clientName = entry.client.name;
    }
    if (entry.project) {
        details.projectId = entry.project.id;
        details.projectName = entry.project.name;
    }
    if (entry.task) {
        details.taskId = entry.task.id;
        details.taskName = entry.task.name;
    }
    if (entry.external_reference) {
        details.externalReference = entry.external_reference;
    }
    return details;
}
function upsertImportedHarvestLocalEntry(store, localEntry, timestamp) {
    const existingEntry = store.harvestEntries.find((entry) => entry.entryId === localEntry.entryId);
    if (!existingEntry) {
        store.harvestEntries.push({
            ...localEntry,
            createdAt: timestamp,
            updatedAt: timestamp
        });
        return true;
    }
    if (areRecordsEqual(getComparableLocalEntry(existingEntry), localEntry)) {
        return false;
    }
    Object.assign(existingEntry, {
        ...localEntry,
        createdAt: existingEntry.createdAt,
        updatedAt: timestamp
    });
    if (!localEntry.mappingName) {
        delete existingEntry.mappingName;
    }
    if (!localEntry.stoppedAt) {
        delete existingEntry.stoppedAt;
    }
    return true;
}
function upsertImportedHarvestTimelineEvent(store, importedEvent) {
    const importEventRole = getImportEventRole(importedEvent);
    const existingEvent = store.events.find((event) => event.id === importedEvent.id) ??
        store.events.find((event) => Boolean(importedEvent.entryId) &&
            isTimelineEventLinkedToEntry(event, importedEvent.entryId) &&
            isTimelineEventMatchingImportRole(event, importEventRole));
    const nextEvent = existingEvent
        ? {
            ...importedEvent,
            id: existingEvent.id
        }
        : importedEvent;
    if (!existingEvent) {
        store.events.push(nextEvent);
        return true;
    }
    if (areRecordsEqual(existingEvent, nextEvent)) {
        return false;
    }
    Object.assign(existingEvent, nextEvent);
    return true;
}
function removeImportedHarvestStopEvents(store, entryId) {
    const nextEvents = store.events.filter((event) => !(event.type === "timer-stopped" && isTimelineEventLinkedToEntry(event, entryId)));
    if (nextEvents.length === store.events.length) {
        return false;
    }
    store.events = nextEvents;
    return true;
}
function reconcileHarvestSnapshot(store, remoteEntries) {
    const remoteEntryIds = new Set(remoteEntries.map((entry) => `harvest-${entry.id}`));
    const staleEntryIds = new Set(store.harvestEntries
        .filter((entry) => entry.backend === "harvest" && !remoteEntryIds.has(entry.entryId))
        .map((entry) => entry.entryId));
    if (staleEntryIds.size === 0) {
        return false;
    }
    store.harvestEntries = store.harvestEntries.filter((entry) => !staleEntryIds.has(entry.entryId));
    store.events = store.events.filter((event) => {
        const linkedEntryId = event.entryId ?? event.timer?.entryId;
        return !linkedEntryId || !staleEntryIds.has(linkedEntryId) || event.type === "timer-error";
    });
    store.state.resumeStack = store.state.resumeStack.filter((entry) => !staleEntryIds.has(entry.entryId));
    if (store.state.runningTimer && staleEntryIds.has(store.state.runningTimer.entryId)) {
        store.state.runningTimer = null;
    }
    return true;
}
function shouldUseImportedRunningTimer(currentTimer, importedTimer) {
    return (!currentTimer ||
        currentTimer.entryId === importedTimer.entryId ||
        currentTimer.backend === "harvest");
}
function getImportedHarvestTimelineEventId(id, role) {
    return `harvest-${id}-${role}`;
}
function getImportEventRole(event) {
    return event.type === "timer-stopped" ? "stop" : "start";
}
function isTimelineEventMatchingImportRole(event, role) {
    if (role === "stop") {
        return event.type === "timer-stopped";
    }
    return isTimerSegmentStartEvent(event);
}
function getComparableLocalEntry(entry) {
    return {
        id: entry.id,
        entryId: entry.entryId,
        backend: entry.backend,
        mode: entry.mode,
        description: entry.description,
        context: entry.context,
        mappingName: entry.mappingName,
        startedAt: entry.startedAt,
        stoppedAt: entry.stoppedAt
    };
}
function toValidIsoTimestampOrNull(value) {
    if (!value) {
        return null;
    }
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
function parseHarvestClockTimestamp(date, value) {
    const trimmedValue = value?.trim().toLowerCase().replace(/\s+/g, "");
    if (!trimmedValue) {
        return null;
    }
    const match = /^(\d{1,2})(?::(\d{2}))?(?::(\d{2}))?(am|pm)?$/.exec(trimmedValue);
    if (!match) {
        return toValidIsoTimestampOrNull(value);
    }
    const [, rawHour, rawMinute = "0", rawSecond = "0", meridiem] = match;
    let hour = Number(rawHour);
    const minute = Number(rawMinute);
    const second = Number(rawSecond);
    if (!Number.isInteger(hour) || !Number.isInteger(minute) || !Number.isInteger(second)) {
        return null;
    }
    if (meridiem === "am" && hour === 12) {
        hour = 0;
    }
    else if (meridiem === "pm" && hour < 12) {
        hour += 12;
    }
    if (hour > 23 || minute > 59 || second > 59) {
        return null;
    }
    const [year, month, day] = parseIsoDateParts(date);
    const timestamp = new Date(year, month - 1, day, hour, minute, second, 0);
    return Number.isFinite(timestamp.getTime()) ? timestamp.toISOString() : null;
}
function parseRequiredClockTimeToIso(date, value) {
    const timestamp = parseHarvestClockTimestamp(date, value);
    if (!timestamp) {
        throw new HttpError(400, "TIMELINE_TIME_INVALID", "Timeline time must be formatted as HH:mm");
    }
    return timestamp;
}
function normalizeClockTime(value) {
    const [rawHour, rawMinute] = value.trim().split(":", 2);
    const hour = Number(rawHour);
    const minute = Number(rawMinute);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
        return value.trim();
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
function formatIsoTimestampAsClockTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) {
        return "";
    }
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
function getLocalDateStartIso(date) {
    const [year, month, day] = parseIsoDateParts(date);
    return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}
function parseIsoDateParts(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
    if (!match?.[1] || !match[2] || !match[3]) {
        throw new Error(`Invalid ISO date: ${date}`);
    }
    return [Number(match[1]), Number(match[2]), Number(match[3])];
}
function normalizeDescription(value, fallback) {
    const normalized = normalizeWhitespace(value);
    return normalized ?? fallback;
}
function normalizeWhitespace(value) {
    const normalized = value?.replace(/\s+/g, " ").trim();
    return normalized ? normalized : null;
}
function areRecordsEqual(firstValue, secondValue) {
    return JSON.stringify(firstValue) === JSON.stringify(secondValue);
}
function getDetailsString(details, key) {
    const value = details?.[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
}
function getTimerHistorySegments(events) {
    const segments = [];
    let currentSegment = null;
    for (const event of [...events].sort((firstEvent, secondEvent) => Date.parse(firstEvent.occurredAt) - Date.parse(secondEvent.occurredAt))) {
        if (isTimerSegmentStartEvent(event)) {
            if (currentSegment && !currentSegment.endedAt) {
                currentSegment.endedAt = event.occurredAt;
            }
            currentSegment = {
                anchorEventId: event.id,
                entryId: event.entryId ?? event.timer?.entryId ?? null,
                label: event.timer?.description ?? event.summary,
                startedAt: event.occurredAt,
                endedAt: null,
                context: getTrackableContextFromEvent(event),
                items: []
            };
            segments.push(currentSegment);
            continue;
        }
        if (event.type === "timer-stopped" && currentSegment) {
            if (!event.entryId || currentSegment.entryId === event.entryId) {
                currentSegment.endedAt = event.occurredAt;
                currentSegment = null;
            }
        }
    }
    return segments;
}
function isTimerSegmentStartEvent(event) {
    return (event.type === "timer-started" ||
        event.type === "timer-switched" ||
        event.type === "timer-comms" ||
        event.type === "timer-resumed");
}
function getTrackableContextFromEvent(event) {
    if (event.context?.trackable) {
        return event.context;
    }
    return event.timer?.context ?? null;
}
function getSegmentForHistoryItem(segments, item) {
    return (segments.find((segment) => {
        const startedAt = Date.parse(segment.startedAt);
        const endedAt = segment.endedAt ? Date.parse(segment.endedAt) : Number.POSITIVE_INFINITY;
        return item.lastVisitTime >= startedAt && item.lastVisitTime < endedAt;
    }) ?? null);
}
function doesHistoryItemMatchTimerContext(historyContext, timerContext) {
    if (!historyContext.trackable || !timerContext) {
        return false;
    }
    return historyContext.id === timerContext.id || historyContext.key === timerContext.key;
}
function getHistoryItemKey(item) {
    return `${item.id}:${item.url}:${item.lastVisitTime}`;
}
function shouldAppendContextTimelineEvent(store, contextEvidence) {
    const lastContextEvent = [...store.events]
        .reverse()
        .find((event) => event.type === "tab-detected");
    if (!lastContextEvent) {
        return true;
    }
    return getTimelineContextEvidenceId(lastContextEvent) !== contextEvidence.id;
}
function getTimelineContextEvidenceId(event) {
    const contextEvidenceId = event.details?.contextEvidenceId;
    if (typeof contextEvidenceId === "string" && contextEvidenceId.length > 0) {
        return contextEvidenceId;
    }
    return event.context?.id ?? null;
}
function getTabDetectedDetails(payload, contextEvidence) {
    return {
        tabId: payload.tabId,
        windowId: payload.windowId,
        contextEvidenceId: contextEvidence.id,
        seenCount: contextEvidence.seenCount,
        firstSeenAt: contextEvidence.firstSeenAt,
        lastSeenAt: contextEvidence.lastSeenAt
    };
}
function getClipboardDetectedDetails(payload, contextEvidence) {
    return {
        source: "clipboard",
        clipboardKey: payload.key,
        clipboardUrl: payload.url,
        contextEvidenceId: contextEvidence.id,
        seenCount: contextEvidence.seenCount,
        firstSeenAt: contextEvidence.firstSeenAt,
        lastSeenAt: contextEvidence.lastSeenAt
    };
}
function getCockpitMode(store) {
    const runningTimer = store.state.runningTimer;
    if (runningTimer) {
        return runningTimer.mode;
    }
    if (store.state.lastError?.code === "SETUP_REQUIRED") {
        return "setup";
    }
    return store.state.lastError ? "error" : "stopped";
}
function cloneDailyStore(store) {
    return structuredClone(store);
}
function toTimerOperationError(error, action) {
    if (error instanceof HarvestApiError) {
        return normalizeHarvestApiError(error);
    }
    if (error instanceof HttpError) {
        return {
            statusCode: error.statusCode,
            error: {
                code: error.code,
                message: error.message,
                details: error.details
            }
        };
    }
    if (error instanceof ZodError) {
        return {
            statusCode: 502,
            error: {
                code: "HARVEST_RESPONSE_INVALID",
                message: "Harvest returned an unexpected response. Please try again or reconnect Harvest.",
                details: error.flatten()
            }
        };
    }
    return {
        statusCode: 502,
        error: {
            code: "HARVEST_TIMER_OPERATION_FAILED",
            message: `Harvest timer ${action} failed. Please try again.`,
            details: {
                cause: getUnknownErrorMessage(error)
            }
        }
    };
}
function normalizeHarvestApiError(error) {
    if (error.statusCode === 401 || error.statusCode === 403) {
        return {
            statusCode: error.statusCode,
            error: {
                code: "HARVEST_AUTH_FAILED",
                message: "Harvest authentication failed. Reconnect Harvest or update your token.",
                details: getHarvestErrorDetails(error)
            }
        };
    }
    if (error.statusCode === 400 || error.statusCode === 422) {
        return {
            statusCode: error.statusCode,
            error: {
                code: "HARVEST_VALIDATION_FAILED",
                message: `Harvest rejected the timer request: ${error.message}`,
                details: getHarvestErrorDetails(error)
            }
        };
    }
    return {
        statusCode: error.statusCode >= 500 ? 502 : error.statusCode,
        error: {
            code: "HARVEST_API_ERROR",
            message: `Harvest API request failed: ${error.message}`,
            details: getHarvestErrorDetails(error)
        }
    };
}
function getHarvestErrorDetails(error) {
    return {
        harvestStatusCode: error.statusCode,
        harvestMessage: error.message,
        harvestDetails: error.details
    };
}
function getUnknownErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}
function isSameHarvestRunningEntry(entry, timer) {
    if (!entry.isRunning) {
        return false;
    }
    if (timer.harvestEntryId && entry.harvestEntryId === timer.harvestEntryId) {
        return true;
    }
    return entry.entryId === timer.entryId;
}
function isSameWorkContext(timer, context) {
    return timer?.mode === "work" && timer.context?.id === context.id;
}
function toResumeStackItem(timer, stoppedAt) {
    if (timer.mode !== "work" || !timer.context) {
        throw new Error("Only work timers can be resumed");
    }
    return {
        entryId: timer.entryId,
        backend: timer.backend,
        mode: "work",
        context: timer.context,
        description: timer.description,
        startedAt: timer.startedAt,
        stoppedAt,
        mappingName: timer.mappingName,
        harvestEntryId: timer.harvestEntryId
    };
}
function getTicketProjectKey(contextKey) {
    const [rawPrefix] = contextKey.split("-", 1);
    const parsed = ProjectKeySchema.safeParse(rawPrefix);
    return parsed.success ? parsed.data : null;
}
function getMappingEventDetails(mappingResolution) {
    const details = getMappingDetails(mappingResolution.mapping);
    if (mappingResolution.projectKey) {
        details.projectKey = mappingResolution.projectKey;
    }
    return Object.keys(details).length > 0 ? details : undefined;
}
function createOverrideMappingResolution(mapping, context) {
    return {
        mapping,
        projectKey: getTicketProjectKey(context.key) ?? undefined
    };
}
function createCommsOverrideMappingResolution(mapping) {
    return {
        mapping
    };
}
function getMappingDetails(mapping) {
    const details = {};
    const mappingName = getMappingDisplayName(mapping);
    if (mappingName) {
        details.mappingName = mappingName;
    }
    if (mapping.projectId) {
        details.projectId = mapping.projectId;
    }
    if (mapping.taskId) {
        details.taskId = mapping.taskId;
    }
    if (mapping.assignmentId) {
        details.assignmentId = mapping.assignmentId;
    }
    return details;
}
function getResumeEventDetails(stoppedTimer, resumeResult) {
    const details = {
        resumeOperation: resumeResult.operation
    };
    if (stoppedTimer) {
        details.previousEntryId = stoppedTimer.entryId;
        details.previousMode = stoppedTimer.mode;
    }
    if (resumeResult.originalEntryId) {
        details.originalEntryId = resumeResult.originalEntryId;
    }
    return Object.keys(details).length > 0 ? details : undefined;
}
function getResumeFallbackMapping(mappingResolution, target) {
    return {
        ...mappingResolution.mapping,
        mappingName: mappingResolution.mapping.mappingName ?? target.mappingName
    };
}
function updateLinkedLocalEntryDescriptions(store, entryId, description) {
    for (const entry of store.harvestEntries) {
        if (entry.entryId === entryId) {
            entry.description = description;
        }
    }
    if (store.state.runningTimer?.entryId === entryId) {
        store.state.runningTimer.description = description;
    }
    for (const resumeItem of store.state.resumeStack) {
        if (resumeItem.entryId === entryId) {
            resumeItem.description = description;
        }
    }
    for (const timelineEvent of store.events) {
        if (timelineEvent.timer?.entryId === entryId) {
            timelineEvent.timer.description = description;
        }
    }
}
function updateLinkedLocalEntryMapping(store, entryId, mapping) {
    const mappingName = getMappingDisplayName(mapping);
    for (const entry of store.harvestEntries) {
        if (entry.entryId === entryId) {
            entry.mappingName = mappingName;
        }
    }
    if (store.state.runningTimer?.entryId === entryId) {
        store.state.runningTimer.mappingName = mappingName;
    }
    for (const resumeItem of store.state.resumeStack) {
        if (resumeItem.entryId === entryId) {
            resumeItem.mappingName = mappingName;
        }
    }
    for (const timelineEvent of store.events) {
        if (timelineEvent.timer?.entryId === entryId) {
            timelineEvent.timer.mappingName = mappingName;
        }
    }
}
function updateLinkedLocalEntryTiming(store, entryId, timing) {
    const details = getTimelineTimingDetails(timing);
    for (const entry of store.harvestEntries) {
        if (entry.entryId !== entryId) {
            continue;
        }
        if (timing.startedAt) {
            entry.startedAt = timing.startedAt;
        }
        if (timing.stoppedAt) {
            entry.stoppedAt = timing.stoppedAt;
        }
    }
    if (store.state.runningTimer?.entryId === entryId) {
        if (timing.stoppedAt) {
            store.state.runningTimer = null;
        }
        else if (timing.startedAt) {
            store.state.runningTimer.startedAt = timing.startedAt;
        }
    }
    for (const resumeItem of store.state.resumeStack) {
        if (resumeItem.entryId !== entryId) {
            continue;
        }
        if (timing.startedAt) {
            resumeItem.startedAt = timing.startedAt;
        }
        if (timing.stoppedAt) {
            resumeItem.stoppedAt = timing.stoppedAt;
        }
    }
    for (const timelineEvent of store.events) {
        if (!isTimelineEventLinkedToEntry(timelineEvent, entryId)) {
            continue;
        }
        if (timelineEvent.timer && timing.startedAt) {
            timelineEvent.timer.startedAt = timing.startedAt;
        }
        if (timing.startedAt && isTimerSegmentStartEvent(timelineEvent)) {
            timelineEvent.occurredAt = timing.startedAt;
        }
        if (timing.stoppedAt && timelineEvent.type === "timer-stopped") {
            timelineEvent.occurredAt = timing.stoppedAt;
        }
        timelineEvent.details = {
            ...timelineEvent.details,
            ...details
        };
    }
}
function getTimelineTimingUpdate(store, event, input) {
    const startedTime = input.startedTime ? normalizeClockTime(input.startedTime) : undefined;
    const endedTime = input.endedTime ? normalizeClockTime(input.endedTime) : undefined;
    if (!startedTime && !endedTime) {
        return null;
    }
    const existingTiming = getTimelineEventTiming(event);
    const startedAt = startedTime
        ? parseRequiredClockTimeToIso(store.date, startedTime)
        : existingTiming.startedAt;
    let stoppedAt = endedTime
        ? parseRequiredClockTimeToIso(store.date, endedTime)
        : existingTiming.stoppedAt;
    if (startedAt && stoppedAt && Date.parse(stoppedAt) < Date.parse(startedAt)) {
        stoppedAt = new Date(Date.parse(stoppedAt) + MILLISECONDS_PER_DAY).toISOString();
    }
    return {
        startedTime,
        endedTime,
        startedAt: startedTime ? startedAt : undefined,
        stoppedAt: endedTime ? stoppedAt : undefined
    };
}
function getTimelineEventTiming(event) {
    return {
        startedAt: getDetailsString(event.details, "startedAt") ??
            event.timer?.startedAt ??
            (isTimerSegmentStartEvent(event) ? event.occurredAt : undefined),
        stoppedAt: getDetailsString(event.details, "stoppedAt") ??
            (event.type === "timer-stopped" ? event.occurredAt : undefined)
    };
}
function getTimelineTimingDetails(timing) {
    const details = {};
    const startedAt = timing.startedAt;
    const stoppedAt = timing.stoppedAt;
    if (startedAt) {
        details.startedAt = startedAt;
        details.startedTime = timing.startedTime ?? formatIsoTimestampAsClockTime(startedAt);
    }
    if (stoppedAt) {
        details.stoppedAt = stoppedAt;
        details.endedTime = timing.endedTime ?? formatIsoTimestampAsClockTime(stoppedAt);
    }
    if (startedAt && stoppedAt) {
        details.durationMinutes = Math.max(0, Math.round((Date.parse(stoppedAt) - Date.parse(startedAt)) / 60_000));
    }
    return details;
}
function getMappingDisplayName(mapping) {
    const explicitName = mapping.mappingName?.trim();
    if (explicitName) {
        return explicitName;
    }
    const parts = [mapping.clientName, mapping.projectName, mapping.taskName]
        .map((part) => part?.trim())
        .filter((part) => Boolean(part));
    return parts.length > 0 ? parts.join(" - ") : undefined;
}
function getTimelineResumeTarget(store, eventId) {
    const event = store.events.find((candidate) => candidate.id === eventId);
    if (!event) {
        return null;
    }
    const linkedEntryId = event.entryId ?? event.timer?.entryId;
    if (!linkedEntryId) {
        return null;
    }
    const stackItem = store.state.resumeStack.find((item) => item.entryId === linkedEntryId);
    if (stackItem) {
        return {
            ...stackItem,
            eventSummary: event.summary
        };
    }
    if (event.timer?.mode === "work" && event.timer.context) {
        return {
            entryId: event.timer.entryId,
            backend: event.timer.backend,
            mode: "work",
            context: event.timer.context,
            description: event.timer.description,
            startedAt: event.timer.startedAt,
            stoppedAt: event.occurredAt,
            mappingName: event.timer.mappingName,
            harvestEntryId: event.timer.harvestEntryId,
            eventSummary: event.summary
        };
    }
    const storedEntry = store.harvestEntries.find((entry) => entry.entryId === linkedEntryId);
    if (storedEntry?.mode === "work" && storedEntry.context) {
        return {
            entryId: storedEntry.entryId,
            backend: storedEntry.backend ?? "mock",
            mode: "work",
            context: storedEntry.context,
            description: storedEntry.description,
            startedAt: storedEntry.startedAt,
            stoppedAt: storedEntry.stoppedAt ?? event.occurredAt,
            mappingName: storedEntry.mappingName,
            harvestEntryId: storedEntry.id,
            eventSummary: event.summary
        };
    }
    return null;
}
function isTimelineEventLinkedToEntry(event, entryId) {
    return event.entryId === entryId || event.timer?.entryId === entryId;
}
function getLinkedHarvestUpdateTarget(store, entryId, event) {
    const eventTimer = event.timer;
    if (eventTimer?.backend === "harvest" && eventTimer.harvestEntryId) {
        return {
            harvestEntryId: eventTimer.harvestEntryId
        };
    }
    const runningTimer = store.state.runningTimer;
    if (runningTimer?.entryId === entryId &&
        runningTimer.backend === "harvest" &&
        runningTimer.harvestEntryId) {
        return {
            harvestEntryId: runningTimer.harvestEntryId
        };
    }
    const resumeItem = store.state.resumeStack.find((item) => item.entryId === entryId);
    if (resumeItem?.backend === "harvest" && resumeItem.harvestEntryId) {
        return {
            harvestEntryId: resumeItem.harvestEntryId
        };
    }
    const storedEntry = store.harvestEntries.find((entry) => entry.entryId === entryId);
    if (storedEntry?.backend === "harvest") {
        return {
            harvestEntryId: storedEntry.id
        };
    }
    const detailsHarvestEntryId = getDetailsHarvestEntryId(event.details);
    if (detailsHarvestEntryId && !entryId.startsWith("mock-")) {
        return {
            harvestEntryId: detailsHarvestEntryId
        };
    }
    return null;
}
function getDetailsHarvestEntryId(details) {
    const value = details?.harvestEntryId;
    return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}
function getContextDetectedSummary(context) {
    if (context.trackable) {
        return `Detected ${context.key}`;
    }
    return "Detected an untrackable browser tab";
}
