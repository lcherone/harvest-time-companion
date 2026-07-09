import { apiRoutes, HarvestAccountsResponseSchema, HarvestTaskAssignmentsResponseSchema, SaveHarvestAccountRequestSchema, SaveHarvestTokenRequestSchema, SaveMatchingRulesRequestSchema, SetupStatusResponseSchema } from "@harvest-time/shared";
import { HttpError } from "../http/errors.js";
import { HarvestApiError } from "../integrations/harvest/harvest-client.js";
export const setupRoutes = async (app, options) => {
    app.get(apiRoutes.setup.status, async () => {
        return SetupStatusResponseSchema.parse(await getSetupStatus(options));
    });
    app.post(apiRoutes.setup.harvestToken, async (request) => {
        const backendConfigService = requireBackendConfigService(options.backendConfigService);
        const body = SaveHarvestTokenRequestSchema.parse(request.body);
        const accounts = await loadAccountsForToken(options.harvestClient, body.accessToken);
        await backendConfigService.saveHarvestPersonalAccessToken(body.accessToken);
        return HarvestAccountsResponseSchema.parse(accounts);
    });
    app.get(apiRoutes.harvest.accounts, async () => {
        return HarvestAccountsResponseSchema.parse(await loadAccountsForSavedToken(options));
    });
    app.post(apiRoutes.setup.harvestAccount, async (request) => {
        const backendConfigService = requireBackendConfigService(options.backendConfigService);
        const body = SaveHarvestAccountRequestSchema.parse(request.body);
        const accounts = await loadAccountsForSavedToken(options);
        const accountExists = accounts.accounts.some((account) => account.accountId === body.accountId);
        if (!accountExists) {
            throw new HttpError(400, "HARVEST_ACCOUNT_NOT_FOUND", `Harvest account ${body.accountId} is not available for the saved token`);
        }
        await backendConfigService.saveHarvestAccount(body);
        return SetupStatusResponseSchema.parse(await getSetupStatus(options));
    });
    app.get(apiRoutes.harvest.taskAssignments, async () => {
        const setupStatus = await getSetupStatus(options);
        if (!setupStatus.harvestConfigured || !setupStatus.accountConfigured) {
            throw new HttpError(409, "HARVEST_ACCOUNT_REQUIRED", "Save a Harvest token and account before loading task assignments");
        }
        try {
            return HarvestTaskAssignmentsResponseSchema.parse(await options.harvestClient.listTaskAssignments());
        }
        catch (error) {
            if (error instanceof HarvestApiError) {
                throw new HttpError(error.statusCode, "HARVEST_TASK_ASSIGNMENTS_UNAVAILABLE", "Could not load Harvest task assignments", error.details);
            }
            throw error;
        }
    });
    app.post(apiRoutes.config.matching, async (request) => {
        const backendConfigService = requireBackendConfigService(options.backendConfigService);
        const body = SaveMatchingRulesRequestSchema.parse(request.body);
        await backendConfigService.saveMatchingRules(body);
        return SetupStatusResponseSchema.parse(await getSetupStatus(options));
    });
};
async function getSetupStatus(options) {
    const [config, accessToken, authStatus] = await Promise.all([
        options.backendConfigService?.loadConfig(),
        options.harvestAuthService.getAccessToken(),
        options.harvestAuthService.getStatus()
    ]);
    const harvestConfigured = Boolean(accessToken);
    const accountConfigured = Boolean(config?.harvest.accountId ?? authStatus.accountId);
    const missing = [];
    if (!harvestConfigured) {
        missing.push("harvest-credentials");
    }
    if (!accountConfigured) {
        missing.push("harvest-account");
    }
    const liveReady = missing.length === 0;
    const mode = liveReady ? "live" : "mock";
    return SetupStatusResponseSchema.parse({
        mode,
        ready: mode === "mock" ? true : liveReady,
        harvestConfigured,
        accountConfigured,
        missing: mode === "mock" ? [] : missing
    });
}
async function loadAccountsForSavedToken(options) {
    const accessToken = await options.harvestAuthService.getAccessToken();
    if (!accessToken) {
        throw new HttpError(409, "HARVEST_TOKEN_INVALID", "Save a valid Harvest token before loading accounts");
    }
    return loadAccountsForToken(options.harvestClient, accessToken);
}
async function loadAccountsForToken(harvestClient, accessToken) {
    try {
        const accounts = await harvestClient.listAccounts(accessToken);
        if (accounts.accounts.length === 0) {
            throw new HttpError(404, "HARVEST_ACCOUNT_NOT_FOUND", "No Harvest accounts were available for the provided token");
        }
        return accounts;
    }
    catch (error) {
        if (error instanceof HttpError) {
            throw error;
        }
        if (error instanceof HarvestApiError) {
            throw new HttpError(400, "HARVEST_TOKEN_INVALID", "Harvest rejected the provided personal access token", error.details);
        }
        throw error;
    }
}
function requireBackendConfigService(backendConfigService) {
    if (!backendConfigService) {
        throw new HttpError(503, "SETUP_STORAGE_UNAVAILABLE", "Backend setup storage is not available");
    }
    return backendConfigService;
}
