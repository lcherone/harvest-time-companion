import cors from "@fastify/cors";
import Fastify from "fastify";
import { ZodError } from "zod";
import { BackendConfigService } from "./config/backend-config-service.js";
import { loadConfig } from "./config/env.js";
import { HttpError } from "./http/errors.js";
import { HarvestAuthService } from "./integrations/harvest/harvest-auth-service.js";
import { HarvestApiError, HarvestClient } from "./integrations/harvest/harvest-client.js";
import { cockpitRoutes } from "./routes/cockpit-routes.js";
import { adminRoutes } from "./routes/admin-routes.js";
import { harvestAuthRoutes } from "./routes/harvest-auth-routes.js";
import { harvestRoutes } from "./routes/harvest-routes.js";
import { healthRoutes } from "./routes/health-routes.js";
import { jiraRoutes } from "./routes/jira-routes.js";
import { setupRoutes } from "./routes/setup-routes.js";
import { CockpitService } from "./services/cockpit-service.js";
import { ContextDetector } from "./services/context-detector.js";
import { GatedJiraIssueResolver } from "./services/jira-issue-resolver.js";
import { HarvestReferencePolicy } from "./services/harvest-reference-policy.js";
import { AdminSessionService } from "./services/admin-session-service.js";
import { resolveCompanionVersion } from "./services/companion-version.js";
import { DailyHistoryStore } from "./storage/daily-history-store.js";
import { DailyStore } from "./storage/daily-store.js";
import { HarvestReadCache } from "./storage/harvest-read-cache.js";
const LOCAL_CORS_ORIGINS = ["http://localhost:8787", "http://127.0.0.1:8787"];
const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
export async function buildApp(options = {}) {
    const now = options.now ?? (() => new Date());
    const envConfig = options.config ?? loadConfig();
    const backendConfigService = options.backendConfigService ??
        (options.config ? undefined : new BackendConfigService({ envConfig }));
    const persistedConfig = backendConfigService
        ? await backendConfigService.loadConfig()
        : undefined;
    const config = backendConfigService
        ? await backendConfigService.loadRuntimeAppConfig()
        : envConfig;
    const companionVersion = options.companionVersion ??
        (await resolveCompanionVersion({
            nodeEnv: config.NODE_ENV,
            packageUrl: new URL("../../../package.json", import.meta.url)
        }));
    const app = Fastify({
        logger: options.logger ?? {
            level: config.LOG_LEVEL
        }
    });
    const harvestReadCache = backendConfigService
        ? new HarvestReadCache({ dataDir: backendConfigService.dataDir, now })
        : undefined;
    const harvestAuthService = new HarvestAuthService({
        backendConfigService,
        config,
        fetchImpl: options.harvestAuthFetchImpl,
        onDisconnect: harvestReadCache ? () => harvestReadCache.clear() : undefined
    });
    const harvestClient = options.harvestClient ??
        new HarvestClient({
            accountId: config.HARVEST_ACCOUNT_ID,
            accountIdProvider: backendConfigService
                ? async () => (await backendConfigService.loadConfig()).harvest.accountId
                : undefined,
            apiBaseUrl: config.HARVEST_API_BASE_URL,
            authBaseUrl: config.HARVEST_AUTH_BASE_URL,
            authService: harvestAuthService,
            fetchImpl: options.harvestFetchImpl,
            readCache: harvestReadCache,
            userAgent: config.HARVEST_USER_AGENT
        });
    const jiraIssueResolver = options.jiraIssueResolver ?? new GatedJiraIssueResolver(config);
    const harvestReferencePolicy = new HarvestReferencePolicy({
        jiraSiteUrl: config.JIRA_SITE_URL,
        ticketKeyRegex: config.JIRA_KEY_REGEX
    });
    const cockpitService = options.cockpitService ??
        new CockpitService({
            backendConfigService,
            config,
            detector: persistedConfig
                ? new ContextDetector({
                    ticketKeyRegex: config.JIRA_KEY_REGEX,
                    jiraHosts: persistedConfig.matching.jiraHosts,
                    githubHosts: persistedConfig.matching.githubHosts,
                    genericWorkDomains: persistedConfig.matching.genericWorkDomains
                })
                : undefined,
            harvestClient,
            harvestAuthService,
            jiraIssueResolver,
            harvestReferencePolicy,
            now,
            store: persistedConfig
                ? new DailyStore({
                    dataDir: backendConfigService?.dataDir,
                    now,
                    timezone: persistedConfig.harvest.timezone
                })
                : undefined
        });
    await cockpitService.reconcileState();
    await app.register(cors, {
        methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
        origin: getAllowedCorsOrigins(config)
    });
    app.setErrorHandler((error, request, reply) => {
        const response = toApiError(error);
        if (reply.statusCode < 400) {
            reply.status(response.statusCode);
        }
        if (response.statusCode >= 500) {
            request.log.error({ err: error }, response.body.error.message);
        }
        else {
            request.log.info({ err: error }, response.body.error.message);
        }
        return reply.status(response.statusCode).send(response.body);
    });
    await app.register(healthRoutes, { harvestAuthService, version: companionVersion });
    if (backendConfigService) {
        await app.register(adminRoutes, {
            adminSessionService: options.adminSessionService ?? new AdminSessionService(),
            backendConfigService,
            config,
            historyStore: new DailyHistoryStore({
                dataDir: backendConfigService.dataDir,
                now,
                timezone: persistedConfig?.harvest.timezone
            }),
            harvestAuthService,
            harvestClient,
            jiraIssueResolver,
            requestRestart: options.requestRestart,
            version: companionVersion
        });
    }
    await app.register(harvestAuthRoutes, { harvestAuthService });
    await app.register(jiraRoutes, { jiraIssueResolver });
    await app.register(cockpitRoutes, { cockpitService });
    await app.register(setupRoutes, { backendConfigService, harvestAuthService, harvestClient });
    await app.register(harvestRoutes, { harvestClient, harvestReferencePolicy });
    return app;
}
function getAllowedCorsOrigins(config) {
    const explicitOrigin = config.EXTENSION_ORIGIN?.trim();
    if (explicitOrigin) {
        return [...LOCAL_CORS_ORIGINS, explicitOrigin];
    }
    return [CHROME_EXTENSION_ORIGIN, ...LOCAL_CORS_ORIGINS];
}
function toApiError(error) {
    if (error instanceof ZodError) {
        return {
            statusCode: 400,
            body: {
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Request validation failed",
                    details: error.flatten()
                }
            }
        };
    }
    if (!(error instanceof Error)) {
        return {
            statusCode: 500,
            body: {
                error: {
                    code: "INTERNAL_SERVER_ERROR",
                    message: "Unexpected server error"
                }
            }
        };
    }
    if (error instanceof HttpError || error instanceof HarvestApiError) {
        return {
            statusCode: error.statusCode,
            body: {
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details
                }
            }
        };
    }
    return {
        statusCode: 500,
        body: {
            error: {
                code: "INTERNAL_SERVER_ERROR",
                message: "Unexpected server error"
            }
        }
    };
}
