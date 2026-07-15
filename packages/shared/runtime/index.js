import { z } from "zod";
export const DEFAULT_API_BASE_URL = "http://127.0.0.1:8787";
export const apiRoutes = {
    health: "/health",
    cockpit: {
        state: "/api/state",
        events: {
            clipboard: "/api/events/clipboard",
            tab: "/api/events/tab",
            history: "/api/events/history"
        },
        timeline: {
            updateEvent: (id = ":id") => `/api/timeline/events/${id}`,
            resumeEvent: (id = ":id") => `/api/timeline/events/${id}/resume`
        },
        review: {
            manualEntryOptions: "/api/review/manual-entry-options",
            manualEntries: "/api/review/manual-entries",
            manualEntry: (id = ":id") => `/api/review/manual-entries/${id}`,
            historyItem: "/api/review/history-items",
            dismissSuggestion: (id = ":id") => `/api/review/suggestions/${id}`
        },
        timer: {
            start: "/api/timer/start",
            comms: "/api/timer/comms",
            resume: "/api/timer/resume",
            stop: "/api/timer/stop"
        }
    },
    harvestAuth: {
        start: "/auth/harvest/start",
        callback: "/auth/harvest/callback",
        status: "/auth/harvest/status",
        disconnect: "/auth/harvest/disconnect"
    },
    harvest: {
        accounts: "/api/harvest/accounts",
        me: "/api/harvest/me",
        taskAssignments: "/api/harvest/task-assignments",
        timeEntries: "/api/harvest/time-entries",
        stopTimeEntry: (id = ":id") => `/api/harvest/time-entries/${id}/stop`,
        restartTimeEntry: (id = ":id") => `/api/harvest/time-entries/${id}/restart`
    },
    jira: {
        status: "/api/jira/status"
    },
    setup: {
        status: "/api/setup/status",
        harvestToken: "/api/setup/harvest-token",
        harvestAccount: "/api/setup/harvest-account"
    },
    config: {
        matching: "/api/config/matching"
    },
    admin: {
        launch: "/api/admin/sessions",
        exchange: "/api/admin/session/exchange",
        status: "/api/admin/status",
        history: "/api/admin/history",
        restart: "/api/admin/restart",
        harvestToken: "/api/admin/harvest-token",
        harvestAccount: "/api/admin/harvest-account",
        harvestDisconnect: "/api/admin/harvest-disconnect",
        matching: "/api/admin/matching"
    }
};
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date as YYYY-MM-DD");
const isoDateTimeSchema = z.string().datetime();
const positiveIntegerIdSchema = z.number().int().positive();
const trimmedNonEmptyStringSchema = z.string().trim().min(1);
const clockTimeSchema = z
    .string()
    .trim()
    .regex(/^(?:[01]?\d|2[0-3]):[0-5]\d$/, "Expected time as HH:mm");
const harvestNamedReferenceSchema = z
    .object({
    id: z.number(),
    name: z.string()
})
    .passthrough();
const queryBooleanSchema = z
    .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
    .optional();
export const HealthResponseSchema = z.object({
    status: z.literal("ok"),
    service: z.literal("harvest-time-api"),
    version: z.string().trim().min(1),
    harvestConfigured: z.boolean(),
    uptimeSeconds: z.number()
});
export const ApiErrorSchema = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
        details: z.unknown().optional()
    })
});
export const AdminLaunchResponseSchema = z.object({
    url: z.string().url(),
    expiresAt: isoDateTimeSchema
});
export const AdminSessionExchangeRequestSchema = z.object({
    token: z.string().trim().min(32)
});
export const AdminSessionExchangeResponseSchema = z.object({
    csrfToken: z.string().min(32),
    expiresAt: isoDateTimeSchema
});
export const HarvestAuthSourceSchema = z.enum(["none", "personal-access-token", "oauth"]);
export const HarvestAuthStatusResponseSchema = z.object({
    ready: z.boolean(),
    source: HarvestAuthSourceSchema,
    oauthClientConfigured: z.boolean(),
    disconnectAllowed: z.boolean(),
    accountId: z.string().nullable(),
    connectUrl: z.string()
});
export const DetectedContextSourceSchema = z.enum(["jira", "github", "generic-ticket", "unknown"]);
export const DEFAULT_TICKET_KEY_REGEX = "\\b[A-Z][A-Z0-9]+-\\d+\\b";
export const DEFAULT_JIRA_HOSTS = [
    "*.atlassian.net",
    "atlassian.net",
    "jira.*",
    "*.jira.*"
];
export const DEFAULT_GITHUB_HOSTS = ["github.com", "www.github.com"];
export const DEFAULT_GENERIC_WORK_DOMAINS = [];
export const TicketKeyRegexSchema = z
    .string()
    .trim()
    .min(1)
    .superRefine((value, context) => {
    try {
        new RegExp(value, "i");
        new RegExp(`^(?:${value})$`, "i");
    }
    catch (error) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid ticket key regex: ${getErrorMessage(error)}`
        });
    }
});
export const MatchingHostRuleSchema = z
    .string()
    .trim()
    .min(1)
    .transform((value) => value.toLowerCase().replace(/\.$/, ""))
    .superRefine((value, context) => {
    const message = getHostRuleValidationMessage(value);
    if (message) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message
        });
    }
});
export const MatchingHostRuleListSchema = z
    .array(MatchingHostRuleSchema)
    .transform((rules) => [...new Set(rules)]);
export const MatchingRulesSchema = z.object({
    ticketKeyRegex: TicketKeyRegexSchema,
    jiraHosts: MatchingHostRuleListSchema,
    githubHosts: MatchingHostRuleListSchema,
    genericWorkDomains: MatchingHostRuleListSchema
});
export const SaveMatchingRulesRequestSchema = MatchingRulesSchema;
export function matchesHostRule(hostname, rules) {
    const normalizedHostname = normalizeHostRuleValue(hostname);
    if (!normalizedHostname) {
        return false;
    }
    return rules.some((rule) => doesHostRuleMatch(normalizedHostname, rule));
}
export const TrackableContextKindSchema = z.enum([
    "jira-issue",
    "github-pull-request",
    "github-issue",
    "generic-ticket"
]);
export const AdminHistoryEntrySourceSchema = z.enum(["harvest", "mock", "manual"]);
export const AdminHistoryEntrySchema = z.object({
    source: AdminHistoryEntrySourceSchema,
    description: z.string().min(1),
    startedAt: isoDateTimeSchema,
    stoppedAt: isoDateTimeSchema.nullable(),
    durationMinutes: z.number().int().nonnegative().nullable(),
    ticketKey: z.string().min(1).nullable(),
    mappingName: z.string().min(1).nullable(),
    kind: TrackableContextKindSchema.nullable()
});
export const AdminHistoryDaySchema = z.object({
    date: isoDateSchema,
    updatedAt: isoDateTimeSchema,
    eventCount: z.number().int().nonnegative(),
    contextCount: z.number().int().nonnegative(),
    historyItemCount: z.number().int().nonnegative(),
    entryCount: z.number().int().nonnegative(),
    harvestEntryCount: z.number().int().nonnegative(),
    manualEntryCount: z.number().int().nonnegative(),
    trackedMinutes: z.number().int().nonnegative(),
    entries: z.array(AdminHistoryEntrySchema)
});
export const AdminHistoryResponseSchema = z.object({
    days: z.array(AdminHistoryDaySchema)
});
export const ClearAdminHistoryRequestSchema = z.object({}).strict();
export const ClearAdminHistoryResponseSchema = z.object({
    removedDayCount: z.number().int().nonnegative(),
    preservedCurrentDate: isoDateSchema
});
export const RestartAdminCompanionRequestSchema = z.object({}).strict();
export const RestartAdminCompanionResponseSchema = z.object({
    restartScheduled: z.literal(true)
});
export const JiraAuthSourceSchema = z.enum(["none", "basic", "oauth"]);
export const JiraVerificationStatusSchema = z.object({
    enabled: z.boolean(),
    configured: z.boolean(),
    authSource: JiraAuthSourceSchema,
    reason: z.enum(["disabled", "missing-site-url", "missing-auth", "ready"]).optional()
});
export const JiraContextMetadataSchema = z.object({
    verified: z.boolean(),
    verificationStatus: z.enum(["unverified", "verified", "failed", "disabled", "unconfigured"]),
    summary: z.string().min(1).optional(),
    status: z.string().min(1).optional(),
    issueType: z.string().min(1).optional(),
    projectKey: z.string().min(1).optional(),
    projectName: z.string().min(1).optional(),
    assigneeName: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
    verifiedAt: isoDateTimeSchema.optional(),
    error: z.string().min(1).optional()
});
export const TrackableDetectedContextSchema = z.object({
    id: z.string().min(1),
    trackable: z.literal(true),
    kind: TrackableContextKindSchema,
    source: DetectedContextSourceSchema.exclude(["unknown"]),
    key: z.string().min(1),
    title: z.string().min(1),
    url: z.string().min(1),
    host: z.string().min(1),
    confidence: z.number().min(0).max(1),
    detectedAt: isoDateTimeSchema,
    permalink: z.string().min(1).optional(),
    jira: JiraContextMetadataSchema.optional()
});
export const UnknownDetectedContextSchema = z.object({
    id: z.literal("unknown"),
    trackable: z.literal(false),
    kind: z.literal("unknown"),
    source: z.literal("unknown"),
    confidence: z.literal(0),
    detectedAt: isoDateTimeSchema,
    title: z.string().optional(),
    url: z.string().optional(),
    host: z.string().optional(),
    reason: z.string().optional()
});
export const DetectedContextSchema = z.discriminatedUnion("trackable", [
    TrackableDetectedContextSchema,
    UnknownDetectedContextSchema
]);
export const DailyContextEvidenceSchema = z.object({
    id: z.string().min(1),
    trackable: z.boolean(),
    kind: z.union([TrackableContextKindSchema, z.literal("unknown")]),
    key: z.string().min(1).optional(),
    seenCount: z.number().int().positive(),
    firstSeenAt: isoDateTimeSchema,
    lastSeenAt: isoDateTimeSchema,
    latestTitle: z.string().min(1).optional(),
    latestUrl: z.string().min(1).optional(),
    source: DetectedContextSourceSchema,
    host: z.string().min(1).optional(),
    confidence: z.number().min(0).max(1),
    permalink: z.string().min(1).optional(),
    jira: JiraContextMetadataSchema.optional(),
    reason: z.string().min(1).optional()
});
export const BrowserHistoryItemSchema = z.object({
    id: z.string().min(1),
    url: z.string().min(1),
    title: z.string().optional(),
    lastVisitTime: z.number().nonnegative()
});
export const BrowserHistoryPayloadSchema = z.object({
    items: z.array(BrowserHistoryItemSchema)
});
export const BrowserHistoryStateItemSchema = BrowserHistoryItemSchema.extend({
    visitedAt: isoDateTimeSchema,
    context: DetectedContextSchema,
    matchesTimerContext: z.boolean()
});
export const BrowserHistoryGroupSchema = z.object({
    anchorEventId: z.string().min(1),
    entryId: z.string().min(1).nullable(),
    label: z.string().min(1),
    startedAt: isoDateTimeSchema,
    endedAt: isoDateTimeSchema.nullable(),
    context: TrackableDetectedContextSchema.nullable(),
    items: z.array(BrowserHistoryStateItemSchema)
});
export const TimerModeSchema = z.enum(["work", "comms"]);
export const TimerCommandSchema = z.enum(["start", "comms", "resume", "stop"]);
export const TimerBackendSchema = z.enum(["mock", "harvest"]);
export const RunningTimerStateSchema = z.object({
    entryId: z.string().min(1),
    mode: TimerModeSchema,
    backend: TimerBackendSchema,
    startedAt: isoDateTimeSchema,
    description: z.string().min(1),
    context: TrackableDetectedContextSchema.nullable(),
    mappingName: trimmedNonEmptyStringSchema.optional(),
    harvestEntryId: z.number().int().positive().optional()
});
export const ResumeStackItemSchema = z.object({
    entryId: z.string().min(1),
    backend: TimerBackendSchema,
    mode: z.literal("work"),
    context: TrackableDetectedContextSchema,
    description: z.string().min(1),
    startedAt: isoDateTimeSchema,
    stoppedAt: isoDateTimeSchema,
    mappingName: trimmedNonEmptyStringSchema.optional(),
    harvestEntryId: z.number().int().positive().optional()
});
export const TimelineEventTypeSchema = z.enum([
    "tab-detected",
    "timer-started",
    "timer-switched",
    "timer-comms",
    "timer-resumed",
    "timer-stopped",
    "timer-error"
]);
export const DailyTimelineEventSchema = z.object({
    id: z.string().min(1),
    type: TimelineEventTypeSchema,
    occurredAt: isoDateTimeSchema,
    summary: z.string().min(1),
    context: DetectedContextSchema.optional(),
    timer: RunningTimerStateSchema.optional(),
    entryId: z.string().min(1).optional(),
    details: z.record(z.unknown()).optional()
});
export const TimelineEventIdParamsSchema = z.object({
    id: z.string().trim().min(1)
});
export const SetupModeSchema = z.enum(["mock", "live"]);
export const SetupMissingStepSchema = z.enum(["harvest-credentials", "harvest-account"]);
export const SetupStatusSchema = z.object({
    mode: SetupModeSchema,
    ready: z.boolean(),
    harvestConfigured: z.boolean(),
    accountConfigured: z.boolean(),
    missing: z.array(SetupMissingStepSchema)
});
export const SetupStatusResponseSchema = SetupStatusSchema;
export const SetupErrorCodeSchema = z.enum([
    "SETUP_CONFIG_INVALID",
    "SETUP_AUTH_INVALID",
    "SETUP_STORAGE_UNAVAILABLE",
    "HARVEST_TOKEN_INVALID",
    "HARVEST_ACCOUNT_REQUIRED",
    "HARVEST_ACCOUNT_NOT_FOUND",
    "HARVEST_TASK_ASSIGNMENTS_UNAVAILABLE",
    "SETUP_REQUIRED"
]);
export const SetupErrorSchema = z.object({
    code: SetupErrorCodeSchema,
    message: trimmedNonEmptyStringSchema,
    details: z.unknown().optional()
});
export const SaveHarvestTokenRequestSchema = z.object({
    accessToken: trimmedNonEmptyStringSchema
});
export const HarvestAccountSummarySchema = z.object({
    accountId: z.coerce.string().trim().min(1),
    name: trimmedNonEmptyStringSchema,
    product: trimmedNonEmptyStringSchema.optional()
});
export const HarvestAccountsResponseSchema = z.object({
    accounts: z.array(HarvestAccountSummarySchema)
});
export const SaveHarvestAccountRequestSchema = z.object({
    accountId: z.coerce.string().trim().min(1),
    userAgent: trimmedNonEmptyStringSchema.optional()
});
export const HarvestTaskAssignmentSummarySchema = z.object({
    assignmentId: positiveIntegerIdSchema,
    projectId: positiveIntegerIdSchema,
    projectName: trimmedNonEmptyStringSchema,
    taskId: positiveIntegerIdSchema,
    taskName: trimmedNonEmptyStringSchema,
    active: z.boolean(),
    clientId: positiveIntegerIdSchema.optional(),
    clientName: trimmedNonEmptyStringSchema.optional(),
    projectCode: trimmedNonEmptyStringSchema.optional()
});
export const HarvestCacheMetadataSchema = z.object({
    source: z.literal("cache"),
    cachedAt: z.string().datetime()
});
export const HarvestTaskAssignmentsResponseSchema = z.object({
    taskAssignments: z.array(HarvestTaskAssignmentSummarySchema),
    cache: HarvestCacheMetadataSchema.optional()
});
export const HarvestTaskMappingSchema = z.object({
    projectId: positiveIntegerIdSchema,
    taskId: positiveIntegerIdSchema,
    assignmentId: positiveIntegerIdSchema.optional(),
    mappingName: trimmedNonEmptyStringSchema.optional(),
    projectName: trimmedNonEmptyStringSchema.optional(),
    taskName: trimmedNonEmptyStringSchema.optional(),
    clientName: trimmedNonEmptyStringSchema.optional()
});
export const HarvestExternalReferenceSchema = z
    .object({
    id: z.string(),
    group_id: z.string().nullable().optional(),
    account_id: z.string().nullable().optional(),
    permalink: z.string().url().nullable().optional(),
    service: z.string().nullable().optional(),
    service_icon_url: z.string().url().nullable().optional()
})
    .passthrough();
export const UpdateTimelineEventRequestSchema = z.object({
    summary: trimmedNonEmptyStringSchema.max(1000),
    mapping: HarvestTaskMappingSchema.optional(),
    startedTime: clockTimeSchema.optional(),
    endedTime: clockTimeSchema.optional(),
    ticketKey: trimmedNonEmptyStringSchema.max(64).nullable().optional()
});
export const ProjectKeySchema = z
    .string()
    .trim()
    .min(1)
    .max(32)
    .regex(/^[A-Za-z][A-Za-z0-9_-]*$/, "Expected a ticket project key such as ABC or OPS")
    .transform((value) => value.toUpperCase());
export const TabEventPayloadSchema = z.object({
    title: z.string().optional(),
    url: z.string().min(1),
    tabId: z.number().int().nonnegative().optional(),
    windowId: z.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
    occurredAt: isoDateTimeSchema.optional()
});
export const ClipboardTicketEvidencePayloadSchema = z.object({
    key: trimmedNonEmptyStringSchema.max(64),
    title: trimmedNonEmptyStringSchema.max(500).optional(),
    url: trimmedNonEmptyStringSchema.max(2048).optional(),
    occurredAt: isoDateTimeSchema.optional()
});
export const CockpitModeSchema = z.enum(["setup", "offline", "stopped", "work", "comms", "error"]);
export const DailyReviewEntrySourceSchema = z.enum(["browser-history", "harvest", "manual"]);
export const ManualDailyEntrySourceSchema = DetectedContextSourceSchema.exclude(["unknown"]);
export const DailyReviewEntryReviewStatusSchema = z.enum(["work", "timesheet-update"]);
export const DailyReviewEntrySchema = z.object({
    id: z.string().min(1),
    source: DailyReviewEntrySourceSchema,
    key: z.string().min(1),
    title: z.string().min(1),
    notes: z.string().min(1),
    startedAt: isoDateTimeSchema,
    stoppedAt: isoDateTimeSchema.nullable(),
    durationMinutes: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1),
    evidenceCount: z.number().int().nonnegative(),
    historyItems: z.array(BrowserHistoryStateItemSchema).default([]),
    reviewStatus: DailyReviewEntryReviewStatusSchema.optional(),
    context: TrackableDetectedContextSchema.nullable(),
    mapping: HarvestTaskMappingSchema.optional(),
    entryId: z.string().min(1).optional(),
    harvestEntryId: z.number().int().positive().optional(),
    timelineEventId: z.string().min(1).optional(),
    externalReference: HarvestExternalReferenceSchema.optional(),
    overlapEntryIds: z.array(z.string().min(1)).default([])
});
export const ManualDailyEntryOptionsResponseSchema = z.object({
    sources: z.array(ManualDailyEntrySourceSchema),
    hosts: z.array(trimmedNonEmptyStringSchema)
});
export const CreateManualDailyEntryRequestSchema = z.object({
    key: trimmedNonEmptyStringSchema.max(64).transform((value) => value.toUpperCase()),
    title: trimmedNonEmptyStringSchema.max(500),
    source: ManualDailyEntrySourceSchema.default("jira"),
    host: trimmedNonEmptyStringSchema.max(255).transform((value) => value
        .toLowerCase()
        .replace(/^https?:\/\//i, "")
        .replace(/\/.*$/, "")),
    kind: TrackableContextKindSchema.optional()
});
export const ManualDailyReviewEntrySchema = z.object({
    id: z.string().min(1),
    key: z.string().min(1),
    title: z.string().min(1),
    notes: z.string().min(1),
    kind: TrackableContextKindSchema,
    source: ManualDailyEntrySourceSchema,
    host: z.string().min(1),
    startedAt: isoDateTimeSchema,
    stoppedAt: isoDateTimeSchema.nullable(),
    confidence: z.number().min(0).max(1),
    evidenceCount: z.number().int().positive(),
    context: TrackableDetectedContextSchema,
    createdAt: isoDateTimeSchema,
    updatedAt: isoDateTimeSchema
});
export const ManualDailyEntryIdParamsSchema = z.object({
    id: z.string().trim().min(1)
});
export const DailyReviewEntryIdParamsSchema = z.object({
    id: z.string().trim().min(1)
});
export const StartTimerRequestSchema = z
    .object({
    contextId: trimmedNonEmptyStringSchema.optional(),
    mapping: HarvestTaskMappingSchema.optional(),
    notes: z.string().trim().min(1).max(10000).optional()
})
    .default({});
export const CockpitStateSchema = z.object({
    mode: CockpitModeSchema,
    runningTimer: RunningTimerStateSchema.nullable(),
    detectedContext: DetectedContextSchema.nullable(),
    recentContexts: z.array(TrackableDetectedContextSchema).default([]),
    latestUntrackedContext: UnknownDetectedContextSchema.nullable().default(null),
    resumeTarget: ResumeStackItemSchema.nullable(),
    setup: SetupStatusSchema,
    today: z.object({
        date: isoDateSchema,
        contexts: z.array(DailyContextEvidenceSchema).default([]),
        timeline: z.array(DailyTimelineEventSchema),
        reviewEntries: z.array(DailyReviewEntrySchema).default([]),
        historyGroups: z.array(BrowserHistoryGroupSchema)
    }),
    lastError: ApiErrorSchema.shape.error.nullable()
});
export const TimerCommandResponseSchema = CockpitStateSchema;
export const HarvestUserSchema = z
    .object({
    id: z.number(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    timezone: z.string().optional()
})
    .passthrough();
export const HarvestTimeEntrySchema = z
    .object({
    id: z.number(),
    spent_date: isoDateSchema,
    hours: z.number(),
    hours_without_timer: z.number().optional(),
    rounded_hours: z.number().optional(),
    notes: z.string().nullable().optional(),
    is_running: z.boolean(),
    timer_started_at: z.string().nullable().optional(),
    started_time: z.string().nullable().optional(),
    ended_time: z.string().nullable().optional(),
    client: harvestNamedReferenceSchema.nullable().optional(),
    project: harvestNamedReferenceSchema.nullable().optional(),
    task: harvestNamedReferenceSchema.nullable().optional(),
    external_reference: HarvestExternalReferenceSchema.nullable().optional()
})
    .passthrough();
export const TimeEntriesResponseSchema = z.object({
    timeEntries: z.array(HarvestTimeEntrySchema),
    cache: HarvestCacheMetadataSchema.optional()
});
export const ListTimeEntriesQuerySchema = z.object({
    from: isoDateSchema.optional(),
    to: isoDateSchema.optional(),
    isRunning: queryBooleanSchema
});
export const CreateTimeEntryRequestSchema = z
    .object({
    projectId: z.number().int().positive(),
    taskId: z.number().int().positive(),
    spentDate: isoDateSchema,
    hours: z.number().min(0).optional(),
    startedTime: clockTimeSchema.optional(),
    endedTime: clockTimeSchema.optional(),
    notes: z.string().max(10000).optional(),
    ticketKey: trimmedNonEmptyStringSchema.max(64).optional(),
    externalReference: HarvestExternalReferenceSchema.optional()
})
    .superRefine((value, context) => {
    const usesDuration = value.hours !== undefined;
    const usesClockTimes = value.startedTime !== undefined || value.endedTime !== undefined;
    if (usesDuration && usesClockTimes) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Use either duration hours or start/end times, not both",
            path: ["hours"]
        });
    }
    if (value.endedTime !== undefined && value.startedTime === undefined) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "An end time requires a start time",
            path: ["endedTime"]
        });
    }
});
export const TimeEntryIdParamsSchema = z.object({
    id: z.coerce.number().int().positive()
});
export const ExtensionMessageSchema = z.discriminatedUnion("type", [
    z.object({ type: z.literal("PING_BACKEND") }),
    z.object({ type: z.literal("GET_PAGE_CONTEXT") }),
    z.object({ type: z.literal("GET_ACTIVE_TAB_EVIDENCE") }),
    z.object({ type: z.literal("GET_TODAY_HISTORY") }),
    z.object({
        type: z.literal("RUN_TIMER_COMMAND"),
        command: TimerCommandSchema,
        payload: StartTimerRequestSchema.optional()
    }),
    z.object({ type: z.literal("SYNC_BADGE_STATE"), state: CockpitStateSchema }),
    z.object({ type: z.literal("SYNC_BADGE_OFFLINE"), message: z.string().optional() }),
    z.object({ type: z.literal("SYNC_BADGE_ERROR"), message: z.string().optional() })
]);
function getHostRuleValidationMessage(value) {
    if (!value) {
        return "Expected a host rule such as github.com or *.atlassian.net";
    }
    if (value === "*") {
        return null;
    }
    if (/[/:?#\s]/.test(value)) {
        return "Host rules must not include a protocol, port, path, query, fragment, or spaces";
    }
    const labels = value.split(".");
    if (labels.some((label) => !label)) {
        return "Host rules must use non-empty dot-separated labels";
    }
    for (const label of labels) {
        if (label === "*") {
            continue;
        }
        if (label.includes("*")) {
            return "Wildcard host rules must use * as a complete dot-separated label";
        }
        if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) {
            return `Invalid host label "${label}"`;
        }
    }
    return null;
}
function normalizeHostRuleValue(value) {
    const normalized = value?.trim().toLowerCase().replace(/\.$/, "");
    return normalized ? normalized : null;
}
function doesHostRuleMatch(hostname, rule) {
    const normalizedRule = normalizeHostRuleValue(rule);
    if (!normalizedRule) {
        return false;
    }
    if (normalizedRule === "*") {
        return true;
    }
    if (!normalizedRule.includes("*")) {
        return hostname === normalizedRule;
    }
    if (normalizedRule.startsWith("*.") && normalizedRule.endsWith(".*")) {
        const middle = normalizedRule.slice(2, -2);
        return middle ? hostname.includes(`.${middle}.`) : false;
    }
    if (normalizedRule.startsWith("*.")) {
        const suffix = normalizedRule.slice(1);
        return hostname.endsWith(suffix) && hostname.length > suffix.length;
    }
    if (normalizedRule.endsWith(".*")) {
        const prefix = normalizedRule.slice(0, -1);
        return hostname.startsWith(prefix) && hostname.length > prefix.length;
    }
    const pattern = normalizedRule
        .split(".")
        .map((label) => (label === "*" ? "[^.]+" : escapeRegex(label)))
        .join("\\.");
    return new RegExp(`^${pattern}$`, "i").test(hostname);
}
function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function getErrorMessage(error) {
    return error instanceof Error ? error.message : "Unknown regex error";
}
