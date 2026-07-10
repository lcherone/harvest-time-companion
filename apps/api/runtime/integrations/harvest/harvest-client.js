import { CreateTimeEntryRequestSchema, HarvestAccountsResponseSchema, HarvestTaskMappingSchema, HarvestTaskAssignmentsResponseSchema, HarvestTimeEntrySchema, HarvestUserSchema, TimeEntriesResponseSchema } from "@harvest-time/shared";
import { z } from "zod";
import { ServiceUnavailableError } from "../../http/errors.js";
const HarvestAccountsPayloadSchema = z
    .object({
    accounts: z.array(z
        .object({
        id: z.number().int().positive(),
        name: z.string(),
        product: z.string().optional()
    })
        .passthrough())
})
    .passthrough();
const HarvestProjectAssignmentPayloadSchema = z
    .object({
    project_assignments: z
        .array(z
        .object({
        id: z.number().int().positive(),
        is_active: z.boolean(),
        client: z
            .object({
            id: z.number().int().positive(),
            name: z.string()
        })
            .passthrough()
            .nullable()
            .optional(),
        project: z
            .object({
            id: z.number().int().positive(),
            name: z.string(),
            code: z.string().nullable().optional()
        })
            .passthrough(),
        task_assignments: z
            .array(z
            .object({
            id: z.number().int().positive(),
            is_active: z.boolean(),
            task: z
                .object({
                id: z.number().int().positive(),
                name: z.string()
            })
                .passthrough()
        })
            .passthrough())
            .default([])
    })
        .passthrough())
        .default([])
})
    .passthrough();
const UpdateTimeEntryInputSchema = z.object({
    endedTime: z.string().min(1).optional(),
    mapping: HarvestTaskMappingSchema.optional(),
    notes: z.string().max(10000).optional(),
    startedTime: z.string().min(1).optional()
});
export class HarvestApiError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, message, details) {
        super(message);
        this.name = "HarvestApiError";
        this.statusCode = statusCode;
        this.code = "HARVEST_API_ERROR";
        this.details = details;
    }
}
export class HarvestClient {
    apiBaseUrl;
    authBaseUrl;
    authService;
    fetchImpl;
    userAgent;
    constructor(options) {
        this.apiBaseUrl = options.apiBaseUrl.replace(/\/$/, "");
        this.authBaseUrl = options.authBaseUrl.replace(/\/$/, "");
        this.authService = options.authService;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.userAgent = options.userAgent;
    }
    async isConfigured() {
        return Boolean(await this.getCredentials());
    }
    async listAccounts(accessToken) {
        const payload = await this.requestHarvestId("/api/v2/accounts", accessToken);
        const accounts = HarvestAccountsPayloadSchema.parse(payload)
            .accounts.filter((account) => account.product === "harvest")
            .map((account) => ({
            accountId: String(account.id),
            name: normalizeName(account.name, `Harvest account ${account.id}`),
            product: normalizeOptionalName(account.product)
        }))
            .sort((left, right) => left.name.localeCompare(right.name));
        return HarvestAccountsResponseSchema.parse({ accounts });
    }
    async getCurrentUser() {
        const payload = await this.request("/users/me");
        return HarvestUserSchema.parse(payload);
    }
    async listTaskAssignments() {
        const payload = await this.request("/users/me/project_assignments", {
            query: {
                per_page: 2000
            }
        });
        const projectAssignments = HarvestProjectAssignmentPayloadSchema.parse(payload).project_assignments;
        const taskAssignments = projectAssignments
            .flatMap((projectAssignment) => {
            if (!projectAssignment.is_active) {
                return [];
            }
            return projectAssignment.task_assignments
                .filter((taskAssignment) => taskAssignment.is_active)
                .map((taskAssignment) => ({
                active: true,
                assignmentId: taskAssignment.id,
                clientId: projectAssignment.client?.id,
                clientName: normalizeOptionalName(projectAssignment.client?.name),
                projectCode: normalizeOptionalName(projectAssignment.project.code),
                projectId: projectAssignment.project.id,
                projectName: normalizeName(projectAssignment.project.name, `Project ${projectAssignment.project.id}`),
                taskId: taskAssignment.task.id,
                taskName: normalizeName(taskAssignment.task.name, `Task ${taskAssignment.task.id}`)
            }));
        })
            .sort(compareTaskAssignments);
        return HarvestTaskAssignmentsResponseSchema.parse({ taskAssignments });
    }
    async listTimeEntries(query = {}) {
        const payload = await this.request("/time_entries", {
            query: {
                from: query.from,
                to: query.to,
                is_running: query.isRunning,
                per_page: 2000
            }
        });
        return TimeEntriesResponseSchema.parse({
            timeEntries: payload.time_entries ?? []
        });
    }
    async createTimeEntry(input) {
        const parsed = CreateTimeEntryRequestSchema.parse(input);
        const payload = await this.request("/time_entries", {
            method: "POST",
            body: {
                project_id: parsed.projectId,
                task_id: parsed.taskId,
                spent_date: parsed.spentDate,
                hours: parsed.hours,
                started_time: parsed.startedTime,
                ended_time: parsed.endedTime,
                notes: parsed.notes,
                external_reference: parsed.externalReference
            }
        });
        return HarvestTimeEntrySchema.parse(payload);
    }
    async updateTimeEntryNotes(id, notes) {
        return this.updateTimeEntry(id, { notes });
    }
    async updateTimeEntry(id, input) {
        const parsed = UpdateTimeEntryInputSchema.parse(input);
        const body = {};
        if (parsed.notes !== undefined) {
            body.notes = parsed.notes;
        }
        if (parsed.startedTime !== undefined) {
            body.started_time = parsed.startedTime;
        }
        if (parsed.endedTime !== undefined) {
            body.ended_time = parsed.endedTime;
        }
        if (parsed.mapping) {
            body.project_id = parsed.mapping.projectId;
            body.task_id = parsed.mapping.taskId;
        }
        const payload = await this.request(`/time_entries/${id}`, {
            method: "PATCH",
            body
        });
        return HarvestTimeEntrySchema.parse(payload);
    }
    async stopTimeEntry(id) {
        const payload = await this.request(`/time_entries/${id}/stop`, {
            method: "PATCH"
        });
        return HarvestTimeEntrySchema.parse(payload);
    }
    async restartTimeEntry(id) {
        const payload = await this.request(`/time_entries/${id}/restart`, {
            method: "PATCH"
        });
        return HarvestTimeEntrySchema.parse(payload);
    }
    async request(path, options = {}) {
        const credentials = await this.getCredentials();
        const url = new URL(`${this.apiBaseUrl}${path}`);
        for (const [key, value] of Object.entries(options.query ?? {})) {
            if (value !== undefined) {
                url.searchParams.set(key, String(value));
            }
        }
        const response = await this.fetchImpl(url, {
            method: options.method ?? "GET",
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${credentials.accessToken}`,
                "Content-Type": "application/json",
                "Harvest-Account-Id": credentials.accountId,
                "User-Agent": this.userAgent
            },
            body: options.body === undefined ? undefined : JSON.stringify(options.body)
        });
        const payload = await readJsonResponse(response);
        if (!response.ok) {
            throw new HarvestApiError(response.status, getHarvestErrorMessage(payload) ?? "Harvest API request failed", payload);
        }
        return payload;
    }
    async requestHarvestId(path, accessToken) {
        const token = await this.getAccessToken(accessToken);
        const url = new URL(`${this.authBaseUrl}${path}`);
        const response = await this.fetchImpl(url, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                "User-Agent": this.userAgent
            }
        });
        const payload = await readJsonResponse(response);
        if (!response.ok) {
            throw new HarvestApiError(response.status, getHarvestErrorMessage(payload) ?? "Harvest API request failed", payload);
        }
        return payload;
    }
    async getCredentials() {
        const credentials = await this.authService?.getApiCredentials?.();
        if (!credentials) {
            throw new ServiceUnavailableError("Harvest API credentials are not configured. Connect Harvest with OAuth or save a personal access token in setup.");
        }
        return credentials;
    }
    async getAccessToken(accessToken) {
        const directAccessToken = accessToken?.trim();
        if (directAccessToken) {
            return directAccessToken;
        }
        const savedAccessToken = await this.authService?.getAccessToken?.();
        if (savedAccessToken) {
            return savedAccessToken;
        }
        const credentials = await this.authService?.getApiCredentials?.();
        if (credentials?.accessToken) {
            return credentials.accessToken;
        }
        throw new ServiceUnavailableError("Harvest personal access token is not configured. Save a Harvest token before loading accounts.");
    }
}
async function readJsonResponse(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return text;
    }
}
function getHarvestErrorMessage(payload) {
    if (!isRecord(payload)) {
        return undefined;
    }
    const message = payload.message;
    return typeof message === "string" ? message : undefined;
}
function compareTaskAssignments(left, right) {
    return ((left.clientName ?? "").localeCompare(right.clientName ?? "") ||
        left.projectName.localeCompare(right.projectName) ||
        left.taskName.localeCompare(right.taskName) ||
        left.assignmentId - right.assignmentId);
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeName(value, fallback) {
    const trimmed = value.trim();
    return trimmed || fallback;
}
function normalizeOptionalName(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
