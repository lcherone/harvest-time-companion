import { rm } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { apiRoutes, HarvestAuthStatusResponseSchema } from "@harvest-time/shared";
import { hasHarvestOAuthClient } from "../../config/env.js";
import { HttpError, ServiceUnavailableError } from "../../http/errors.js";
import { JsonFileError, readJsonFile, recoverInvalidJsonFile, writeJsonFileAtomically } from "../../storage/json-file.js";
const OAuthTokenResponseSchema = z
    .object({
    access_token: z.string().min(1),
    refresh_token: z.string().min(1),
    token_type: z.string().min(1),
    expires_in: z.number().positive(),
    scope: z.string().optional()
})
    .passthrough();
const StoredHarvestOAuthTokenSchema = z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    tokenType: z.string().min(1),
    expiresAt: z.string().datetime(),
    scope: z.string().optional(),
    accountId: z.string().min(1),
    accountName: z.string().optional(),
    savedAt: z.string().datetime()
});
const HarvestAccountsResponseSchema = z
    .object({
    accounts: z.array(z
        .object({
        id: z.number(),
        name: z.string(),
        product: z.string()
    })
        .passthrough())
})
    .passthrough();
export class HarvestOAuthTokenStore {
    filePath;
    constructor(filePath) {
        this.filePath = path.resolve(filePath);
    }
    async read() {
        try {
            return await readJsonFile(this.filePath, StoredHarvestOAuthTokenSchema, {
                label: "Harvest OAuth token store"
            });
        }
        catch (error) {
            if (error instanceof JsonFileError && error.kind === "invalid-json") {
                try {
                    await recoverInvalidJsonFile(this.filePath);
                    return null;
                }
                catch (recoveryError) {
                    throw toHarvestAuthStorageError("HARVEST_AUTH_STORAGE_UNAVAILABLE", this.filePath, recoveryError);
                }
            }
            throw toHarvestAuthStorageError("HARVEST_AUTH_STORAGE_INVALID", this.filePath, error);
        }
    }
    async write(token) {
        try {
            await writeJsonFileAtomically(this.filePath, token, { mode: 0o600 });
        }
        catch (error) {
            throw toHarvestAuthStorageError("HARVEST_AUTH_STORAGE_UNAVAILABLE", this.filePath, error);
        }
    }
    async delete() {
        await rm(this.filePath, { force: true });
    }
}
export class HarvestAuthService {
    authBaseUrl;
    backendConfigService;
    config;
    fetchImpl;
    now;
    pendingStates = new Set();
    stateFactory;
    tokenStore;
    constructor(options) {
        this.authBaseUrl = options.config.HARVEST_AUTH_BASE_URL.replace(/\/$/, "");
        this.backendConfigService = options.backendConfigService;
        this.config = options.config;
        this.fetchImpl = options.fetchImpl ?? fetch;
        this.now = options.now ?? (() => new Date());
        this.stateFactory = options.stateFactory ?? randomUUID;
        this.tokenStore =
            options.tokenStore ?? new HarvestOAuthTokenStore(options.config.HARVEST_TOKEN_STORE_PATH);
    }
    createAuthorizationUrl() {
        this.assertOAuthClientConfigured();
        const state = this.stateFactory();
        this.pendingStates.add(state);
        return {
            state,
            url: this.buildAuthorizationUrl(state).toString()
        };
    }
    async exchangeAuthorizationCode(input) {
        this.assertOAuthClientConfigured();
        this.assertValidState(input.state);
        const token = await this.requestToken({
            code: input.code,
            grantType: "authorization_code"
        });
        const account = await this.resolveHarvestAccount(token.access_token, token.scope ?? input.scope);
        await this.tokenStore.write({
            accessToken: token.access_token,
            refreshToken: token.refresh_token,
            tokenType: token.token_type,
            expiresAt: this.getExpiresAt(token.expires_in).toISOString(),
            scope: token.scope ?? input.scope,
            accountId: account.id,
            accountName: account.name,
            savedAt: this.now().toISOString()
        });
        return this.getStatus();
    }
    async disconnect() {
        await this.tokenStore.delete();
        return this.getStatus();
    }
    async getApiCredentials() {
        const accessToken = this.config.HARVEST_ACCESS_TOKEN;
        const accountId = this.config.HARVEST_ACCOUNT_ID;
        if (accessToken && accountId) {
            return {
                accessToken,
                accountId,
                source: "personal-access-token"
            };
        }
        const localCredentials = await this.getLocalPersonalAccessCredentials();
        if (localCredentials) {
            return localCredentials;
        }
        const token = await this.readUsableOAuthToken();
        if (!token) {
            return null;
        }
        return {
            accessToken: token.accessToken,
            accountId: token.accountId,
            source: "oauth"
        };
    }
    async getAccessToken() {
        if (this.config.HARVEST_ACCESS_TOKEN) {
            return this.config.HARVEST_ACCESS_TOKEN;
        }
        const localAccessToken = await this.backendConfigService?.getHarvestPersonalAccessToken();
        if (localAccessToken) {
            return localAccessToken;
        }
        const token = await this.readUsableOAuthToken();
        return token?.accessToken ?? null;
    }
    async hasAccount() {
        const credentials = await this.getApiCredentials();
        return Boolean(credentials?.accountId);
    }
    async hasApiCredentials() {
        return Boolean(await this.getApiCredentials());
    }
    async getStatus() {
        const credentials = await this.getApiCredentials();
        const response = {
            ready: Boolean(credentials),
            source: credentials?.source ?? "none",
            oauthClientConfigured: hasHarvestOAuthClient(this.config),
            accountId: credentials?.accountId ?? null,
            connectUrl: apiRoutes.harvestAuth.start
        };
        return HarvestAuthStatusResponseSchema.parse(response);
    }
    async readUsableOAuthToken() {
        const token = await this.tokenStore.read();
        if (!token) {
            return null;
        }
        if (this.isTokenExpiring(token)) {
            return this.refreshOAuthToken(token);
        }
        return token;
    }
    async getLocalPersonalAccessCredentials() {
        if (!this.backendConfigService) {
            return null;
        }
        const [backendConfig, accessToken] = await Promise.all([
            this.backendConfigService.loadConfig(),
            this.backendConfigService.getHarvestPersonalAccessToken()
        ]);
        const accountId = backendConfig.harvest.accountId;
        if (!accessToken || !accountId) {
            return null;
        }
        return {
            accessToken,
            accountId,
            source: "personal-access-token"
        };
    }
    async refreshOAuthToken(token) {
        this.assertOAuthClientConfigured();
        const refreshedToken = await this.requestToken({
            grantType: "refresh_token",
            refreshToken: token.refreshToken
        });
        const storedToken = {
            ...token,
            accessToken: refreshedToken.access_token,
            refreshToken: refreshedToken.refresh_token,
            tokenType: refreshedToken.token_type,
            expiresAt: this.getExpiresAt(refreshedToken.expires_in).toISOString(),
            scope: refreshedToken.scope ?? token.scope,
            savedAt: this.now().toISOString()
        };
        await this.tokenStore.write(storedToken);
        return storedToken;
    }
    async requestToken(input) {
        const body = new URLSearchParams({
            client_id: this.config.HARVEST_CLIENT_ID ?? "",
            client_secret: this.config.HARVEST_CLIENT_SECRET ?? "",
            grant_type: input.grantType
        });
        if (input.grantType === "authorization_code") {
            body.set("code", input.code ?? "");
        }
        else {
            body.set("refresh_token", input.refreshToken ?? "");
        }
        const response = await this.fetchImpl(`${this.authBaseUrl}/api/v2/oauth2/token`, {
            method: "POST",
            headers: {
                Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
                "User-Agent": this.config.HARVEST_USER_AGENT
            },
            body
        });
        const payload = await readJsonResponse(response);
        if (!response.ok) {
            throw new HttpError(response.status, "HARVEST_OAUTH_ERROR", getHarvestErrorMessage(payload) ?? "Harvest OAuth token exchange failed", payload);
        }
        return OAuthTokenResponseSchema.parse(payload);
    }
    async resolveHarvestAccount(accessToken, scope) {
        if (this.config.HARVEST_ACCOUNT_ID) {
            return { id: this.config.HARVEST_ACCOUNT_ID };
        }
        const scopedAccountId = getHarvestAccountIdFromScope(scope);
        if (scopedAccountId) {
            return { id: scopedAccountId };
        }
        const response = await this.fetchImpl(`${this.authBaseUrl}/api/v2/accounts`, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${accessToken}`,
                "User-Agent": this.config.HARVEST_USER_AGENT
            }
        });
        const payload = await readJsonResponse(response);
        if (!response.ok) {
            throw new HttpError(response.status, "HARVEST_ACCOUNTS_ERROR", getHarvestErrorMessage(payload) ?? "Could not load Harvest accounts", payload);
        }
        const accounts = HarvestAccountsResponseSchema.parse(payload).accounts;
        const harvestAccount = accounts.find((account) => account.product === "harvest");
        if (!harvestAccount) {
            throw new ServiceUnavailableError("No Harvest account was returned by OAuth");
        }
        return {
            id: String(harvestAccount.id),
            name: harvestAccount.name
        };
    }
    buildAuthorizationUrl(state) {
        const url = new URL(`${this.authBaseUrl}/oauth2/authorize`);
        url.searchParams.set("client_id", this.config.HARVEST_CLIENT_ID ?? "");
        url.searchParams.set("response_type", "code");
        url.searchParams.set("redirect_uri", this.config.HARVEST_REDIRECT_URI);
        url.searchParams.set("state", state);
        return url;
    }
    assertOAuthClientConfigured() {
        if (!hasHarvestOAuthClient(this.config)) {
            throw new ServiceUnavailableError("Harvest OAuth client credentials are not configured");
        }
    }
    assertValidState(state) {
        if (!state || !this.pendingStates.has(state)) {
            throw new HttpError(400, "INVALID_OAUTH_STATE", "Harvest OAuth state is invalid or expired");
        }
        this.pendingStates.delete(state);
    }
    getExpiresAt(expiresInSeconds) {
        return new Date(this.now().getTime() + expiresInSeconds * 1000);
    }
    isTokenExpiring(token) {
        const expiresAt = new Date(token.expiresAt).getTime();
        const refreshWindowMs = 60_000;
        return expiresAt - this.now().getTime() <= refreshWindowMs;
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
function getHarvestAccountIdFromScope(scope) {
    if (!scope) {
        return null;
    }
    for (const item of scope.split(/\s+/)) {
        const match = /^harvest:(\d+)$/.exec(item);
        if (match?.[1]) {
            return match[1];
        }
    }
    return null;
}
function getHarvestErrorMessage(payload) {
    if (!isRecord(payload)) {
        return undefined;
    }
    const message = payload.message ?? payload.error_description ?? payload.error;
    return typeof message === "string" ? message : undefined;
}
function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toHarvestAuthStorageError(code, filePath, error) {
    const action = code === "HARVEST_AUTH_STORAGE_UNAVAILABLE" ? "write" : "load";
    return new HttpError(500, code, `Unable to ${action} Harvest auth file at ${filePath}`, {
        message: getErrorMessage(error)
    });
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}
