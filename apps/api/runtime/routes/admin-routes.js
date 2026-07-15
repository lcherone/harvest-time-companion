import { AdminHistoryResponseSchema, AdminLaunchResponseSchema, AdminSessionExchangeRequestSchema, AdminSessionExchangeResponseSchema, apiRoutes, ClearAdminHistoryRequestSchema, ClearAdminHistoryResponseSchema, HarvestAccountsResponseSchema, RestartAdminCompanionRequestSchema, RestartAdminCompanionResponseSchema, SaveHarvestAccountRequestSchema, SaveHarvestTokenRequestSchema, SaveMatchingRulesRequestSchema, SetupStatusResponseSchema } from "@harvest-time/shared";
import { HttpError } from "../http/errors.js";
import { managerJs } from "../manager/manager-client.js";
import { managerLockCss, managerLockHtml, managerLockJs } from "../manager/manager-lock-page.js";
import { managerHtml } from "../manager/manager-page.js";
import { managerCss } from "../manager/manager-styles.js";
import { getSetupStatus, loadAccountsForSavedToken, loadAccountsForToken } from "./setup-routes.js";
const ADMIN_COOKIE = "harvesttime_admin";
const ADMIN_CLIENT_HEADER = "x-harvesttime-client";
const ADMIN_CSRF_HEADER = "x-harvesttime-csrf";
const ADMIN_PAIR_HEADER = "x-harvesttime-pair";
const PRODUCTION_EXTENSION_ORIGIN = "chrome-extension://pbdiaopaeddjdblijddkkgfiheejolol";
const CHROME_EXTENSION_ORIGIN = /^chrome-extension:\/\/[a-p]{32}$/;
export const adminRoutes = async (app, options) => {
    let trustedExtensionOrigin = options.config.EXTENSION_ORIGIN?.trim();
    let restartPending = false;
    app.addHook("onSend", async (request, reply, payload) => {
        if (isAdminRequest(request.url)) {
            setSecurityHeaders(reply);
        }
        return payload;
    });
    for (const path of ["/setup", "/setup/"]) {
        app.get(path, async (request, reply) => {
            assertLoopbackHost(request);
            const session = options.adminSessionService.getSession(readCookie(request, ADMIN_COOKIE));
            return reply.type("text/html; charset=utf-8").send(session ? managerHtml : managerLockHtml);
        });
    }
    app.get("/setup/assets/lock.css", async (request, reply) => {
        assertLoopbackHost(request);
        return reply.type("text/css; charset=utf-8").send(managerLockCss);
    });
    app.get("/setup/assets/lock.js", async (request, reply) => {
        assertLoopbackHost(request);
        return reply.type("text/javascript; charset=utf-8").send(managerLockJs);
    });
    app.get("/setup/assets/manager.css", async (request, reply) => {
        requireAdminSession(request, options.adminSessionService);
        return reply.type("text/css; charset=utf-8").send(managerCss);
    });
    app.get("/setup/assets/manager.js", async (request, reply) => {
        requireAdminSession(request, options.adminSessionService);
        return reply.type("text/javascript; charset=utf-8").send(managerJs);
    });
    app.post(apiRoutes.admin.launch, async (request) => {
        assertLoopbackHost(request);
        trustedExtensionOrigin = await assertExtensionLaunchRequest(request, options, trustedExtensionOrigin);
        const launch = options.adminSessionService.createLaunchToken();
        return AdminLaunchResponseSchema.parse({
            expiresAt: launch.expiresAt.toISOString(),
            url: `${getManagerOrigin(options.config)}/setup/#${launch.token}`
        });
    });
    app.post(apiRoutes.admin.exchange, async (request, reply) => {
        assertLoopbackHost(request);
        assertManagerOrigin(request, options.config);
        const body = AdminSessionExchangeRequestSchema.parse(request.body);
        const session = options.adminSessionService.exchangeLaunchToken(body.token);
        if (!session) {
            throw new HttpError(401, "ADMIN_LAUNCH_INVALID", "This secure setup link is missing, expired, or has already been used");
        }
        reply.header("set-cookie", serializeSessionCookie(session.sessionId, 15 * 60_000));
        return AdminSessionExchangeResponseSchema.parse({
            csrfToken: session.csrfToken,
            expiresAt: session.expiresAt.toISOString()
        });
    });
    app.get(apiRoutes.admin.status, async (request) => {
        const session = requireAdminSession(request, options.adminSessionService);
        const [setup, auth, jira, config] = await Promise.all([
            getSetupStatus(options),
            options.harvestAuthService.getStatus(),
            options.jiraIssueResolver.getStatus(),
            options.backendConfigService.loadConfig()
        ]);
        return {
            csrfToken: session.csrfToken,
            sessionExpiresAt: new Date(session.expiresAt).toISOString(),
            setup: SetupStatusResponseSchema.parse(setup),
            auth,
            jira: {
                enabled: jira.enabled,
                ready: jira.configured,
                reason: jira.reason,
                siteUrl: options.config.JIRA_SITE_URL ?? null,
                managedBy: "environment"
            },
            config: {
                matching: config.matching,
                extensionOrigin: options.config.EXTENSION_ORIGIN ?? PRODUCTION_EXTENSION_ORIGIN
            },
            health: {
                dataDirectory: options.backendConfigService.dataDir,
                restartAvailable: Boolean(options.requestRestart) && !restartPending,
                status: "ok",
                service: "harvest-time-api",
                version: options.version,
                uptimeSeconds: process.uptime()
            }
        };
    });
    app.get(apiRoutes.admin.history, async (request) => {
        requireAdminSession(request, options.adminSessionService);
        return AdminHistoryResponseSchema.parse({
            days: await options.historyStore.listPreviousDays()
        });
    });
    app.delete(apiRoutes.admin.history, async (request) => {
        requireAdminMutation(request, options.adminSessionService, options.config);
        ClearAdminHistoryRequestSchema.parse(request.body);
        return ClearAdminHistoryResponseSchema.parse(await options.historyStore.clearPreviousDays());
    });
    app.post(apiRoutes.admin.restart, async (request, reply) => {
        requireAdminMutation(request, options.adminSessionService, options.config);
        RestartAdminCompanionRequestSchema.parse(request.body);
        if (!options.requestRestart) {
            throw new HttpError(409, "COMPANION_RESTART_UNAVAILABLE", "Restart from the manager is available only when the installed background supervisor is running");
        }
        if (restartPending) {
            throw new HttpError(409, "COMPANION_RESTART_PENDING", "The companion is already restarting");
        }
        restartPending = true;
        let responseSettled = false;
        reply.raw.once("finish", () => {
            if (responseSettled) {
                return;
            }
            responseSettled = true;
            options.requestRestart?.();
        });
        reply.raw.once("close", () => {
            if (responseSettled) {
                return;
            }
            responseSettled = true;
            restartPending = false;
        });
        return reply.status(202).send(RestartAdminCompanionResponseSchema.parse({
            restartScheduled: true
        }));
    });
    app.post(apiRoutes.admin.harvestToken, async (request) => {
        requireAdminMutation(request, options.adminSessionService, options.config);
        const body = SaveHarvestTokenRequestSchema.parse(request.body);
        const accounts = await loadAccountsForToken(options.harvestClient, body.accessToken);
        await options.backendConfigService.saveHarvestPersonalAccessToken(body.accessToken);
        return HarvestAccountsResponseSchema.parse(accounts);
    });
    app.post(apiRoutes.admin.harvestAccount, async (request) => {
        requireAdminMutation(request, options.adminSessionService, options.config);
        const body = SaveHarvestAccountRequestSchema.parse(request.body);
        const accounts = await loadAccountsForSavedToken(options);
        if (!accounts.accounts.some((account) => account.accountId === body.accountId)) {
            throw new HttpError(400, "HARVEST_ACCOUNT_NOT_FOUND", `Harvest account ${body.accountId} is not available for the saved token`);
        }
        await options.backendConfigService.saveHarvestAccount(body);
        return SetupStatusResponseSchema.parse(await getSetupStatus(options));
    });
    app.post(apiRoutes.admin.harvestDisconnect, async (request) => {
        requireAdminMutation(request, options.adminSessionService, options.config);
        return options.harvestAuthService.disconnect();
    });
    app.post(apiRoutes.admin.matching, async (request) => {
        requireAdminMutation(request, options.adminSessionService, options.config);
        const body = SaveMatchingRulesRequestSchema.parse(request.body);
        const config = await options.backendConfigService.saveMatchingRules(body);
        return { matching: config.matching, restartRequired: true };
    });
};
function isAdminRequest(url) {
    return url === "/setup" || url.startsWith("/setup/") || url.startsWith("/api/admin/");
}
function setSecurityHeaders(reply) {
    reply
        .header("cache-control", "no-store")
        .header("content-security-policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'")
        .header("cross-origin-opener-policy", "same-origin")
        .header("permissions-policy", "camera=(), microphone=(), geolocation=(), payment=()")
        .header("referrer-policy", "no-referrer")
        .header("x-content-type-options", "nosniff")
        .header("x-frame-options", "DENY");
}
function assertLoopbackHost(request) {
    const hostHeader = request.headers.host?.toLowerCase();
    let host;
    try {
        host = hostHeader ? new URL(`http://${hostHeader}`).hostname : undefined;
    }
    catch {
        host = undefined;
    }
    if (host !== "127.0.0.1" && host !== "localhost" && host !== "[::1]") {
        throw new HttpError(400, "ADMIN_HOST_INVALID", "The companion manager is available only on loopback");
    }
}
async function assertExtensionLaunchRequest(request, options, trustedExtensionOrigin) {
    const requestOrigin = request.headers.origin;
    const validRequest = typeof requestOrigin === "string" &&
        CHROME_EXTENSION_ORIGIN.test(requestOrigin) &&
        request.headers[ADMIN_CLIENT_HEADER] === "extension" &&
        isJsonRequest(request) &&
        matchesFetchSite(request, ["cross-site", "none"]);
    if (!validRequest) {
        throw new HttpError(403, "ADMIN_LAUNCH_FORBIDDEN", "Only the trusted HarvestTime extension can open the companion manager");
    }
    if (trustedExtensionOrigin) {
        if (requestOrigin !== trustedExtensionOrigin) {
            throw new HttpError(403, "ADMIN_LAUNCH_FORBIDDEN", "This companion is paired with a different HarvestTime extension");
        }
        return trustedExtensionOrigin;
    }
    if (requestOrigin === PRODUCTION_EXTENSION_ORIGIN || options.config.NODE_ENV !== "production") {
        return requestOrigin;
    }
    if (request.headers[ADMIN_PAIR_HEADER] !== "user-initiated") {
        throw new HttpError(403, "ADMIN_PAIRING_REQUIRED", "Open the companion manager from the HarvestTime Settings button to pair this extension");
    }
    await options.backendConfigService.saveExtensionOrigin(requestOrigin);
    return requestOrigin;
}
function assertManagerOrigin(request, config) {
    assertLoopbackHost(request);
    if (request.headers.origin !== getManagerOrigin(config) ||
        !isJsonRequest(request) ||
        !matchesFetchSite(request, ["same-origin"])) {
        throw new HttpError(403, "ADMIN_ORIGIN_FORBIDDEN", "The companion manager request origin was rejected");
    }
}
function requireAdminSession(request, service) {
    assertLoopbackHost(request);
    const session = service.getSession(readCookie(request, ADMIN_COOKIE));
    if (!session) {
        throw new HttpError(401, "ADMIN_SESSION_REQUIRED", "Open the companion manager from the HarvestTime extension");
    }
    return session;
}
function requireAdminMutation(request, service, config) {
    assertManagerOrigin(request, config);
    const session = requireAdminSession(request, service);
    const csrf = request.headers[ADMIN_CSRF_HEADER];
    if (typeof csrf !== "string" || csrf !== session.csrfToken) {
        throw new HttpError(403, "ADMIN_CSRF_INVALID", "The companion manager security token was rejected");
    }
}
function isJsonRequest(request) {
    return request.headers["content-type"]?.toLowerCase().startsWith("application/json") ?? false;
}
function matchesFetchSite(request, allowed) {
    const value = request.headers["sec-fetch-site"];
    return value === undefined || (typeof value === "string" && allowed.includes(value));
}
function readCookie(request, name) {
    const cookieHeader = request.headers.cookie;
    if (!cookieHeader) {
        return undefined;
    }
    for (const part of cookieHeader.split(";")) {
        const [key, ...valueParts] = part.trim().split("=");
        if (key === name) {
            return decodeURIComponent(valueParts.join("="));
        }
    }
    return undefined;
}
function serializeSessionCookie(value, ttlMs) {
    const maxAge = Math.max(0, Math.floor(ttlMs / 1000));
    return `${ADMIN_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}
function getManagerOrigin(config) {
    return `http://127.0.0.1:${config.PORT}`;
}
