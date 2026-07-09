import { fileURLToPath } from "node:url";
import { join, resolve } from "node:path";
import { DEFAULT_GENERIC_WORK_DOMAINS, DEFAULT_GITHUB_HOSTS, DEFAULT_JIRA_HOSTS, DEFAULT_TICKET_KEY_REGEX, MatchingHostRuleListSchema, MatchingRulesSchema, SaveHarvestAccountRequestSchema, SaveMatchingRulesRequestSchema, TicketKeyRegexSchema } from "@harvest-time/shared";
import { z, ZodError } from "zod";
import { HttpError } from "../http/errors.js";
import { JsonFileError, readJsonFile, recoverInvalidJsonFile, writeJsonFileAtomically } from "../storage/json-file.js";
import { DEFAULT_APP_CONFIG_VALUES, loadConfig } from "./env.js";
export const BACKEND_CONFIG_SCHEMA_VERSION = 1;
export const BACKEND_AUTH_LOCAL_SCHEMA_VERSION = 1;
const defaultDataDir = fileURLToPath(new URL("../../data/", import.meta.url));
const LEGACY_HARVEST_ROOT_REDIRECT_URI = "http://127.0.0.1:8787";
const isoDateTimeSchema = z.string().datetime();
const trimmedOptionalStringSchema = z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((value) => value || undefined);
const optionalTimeZoneSchema = z
    .string()
    .trim()
    .min(1)
    .optional()
    .transform((value) => value || undefined)
    .superRefine((value, context) => {
    if (!value) {
        return;
    }
    try {
        new Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date(0));
    }
    catch (error) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Invalid timezone: ${getErrorMessage(error)}`
        });
    }
});
const logLevelSchema = z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]);
const BackendMatchingRulesSchema = z
    .object({
    ticketKeyRegex: TicketKeyRegexSchema.optional(),
    jiraKeyRegex: TicketKeyRegexSchema.optional(),
    jiraHosts: MatchingHostRuleListSchema.optional(),
    githubHosts: MatchingHostRuleListSchema.optional(),
    genericWorkDomains: MatchingHostRuleListSchema.optional()
})
    .transform((value) => {
    return {
        ticketKeyRegex: value.ticketKeyRegex ?? value.jiraKeyRegex ?? DEFAULT_TICKET_KEY_REGEX,
        jiraHosts: value.jiraHosts ?? [...DEFAULT_JIRA_HOSTS],
        githubHosts: value.githubHosts ?? [...DEFAULT_GITHUB_HOSTS],
        genericWorkDomains: value.genericWorkDomains ?? [...DEFAULT_GENERIC_WORK_DOMAINS]
    };
})
    .pipe(MatchingRulesSchema);
export const BackendConfigFileSchema = z.object({
    schemaVersion: z.literal(BACKEND_CONFIG_SCHEMA_VERSION),
    harvest: z.object({
        accountId: trimmedOptionalStringSchema,
        userAgent: z.string().trim().min(1),
        timezone: optionalTimeZoneSchema,
        apiBaseUrl: z.string().url(),
        authBaseUrl: z.string().url(),
        redirectUri: z.string().url(),
        oauthTokenStorePath: z.string().trim().min(1)
    }),
    matching: BackendMatchingRulesSchema,
    server: z.object({
        host: z.string().trim().min(1),
        port: z.number().int().positive(),
        logLevel: logLevelSchema,
        extensionOrigin: trimmedOptionalStringSchema
    })
});
const AuthHarvestConfigSchema = z
    .object({
    personalAccessToken: trimmedOptionalStringSchema,
    savedAt: isoDateTimeSchema.optional()
})
    .superRefine((value, context) => {
    if (value.personalAccessToken && !value.savedAt) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "savedAt is required when a Harvest personal access token is stored",
            path: ["savedAt"]
        });
    }
    if (!value.personalAccessToken && value.savedAt) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "savedAt cannot be stored without a Harvest personal access token",
            path: ["savedAt"]
        });
    }
});
export const BackendAuthLocalFileSchema = z.object({
    schemaVersion: z.literal(BACKEND_AUTH_LOCAL_SCHEMA_VERSION),
    harvest: AuthHarvestConfigSchema
});
export class BackendConfigService {
    authLocalPath;
    configPath;
    dataDir;
    exampleConfigPath;
    envConfig;
    now;
    useEnvironmentOverrides;
    constructor(options = {}) {
        this.envConfig = options.envConfig ?? loadConfig();
        const dataDir = resolve(options.dataDir ?? this.envConfig.HARVEST_TIME_DATA_DIR ?? defaultDataDir);
        this.dataDir = dataDir;
        this.authLocalPath = resolve(options.authLocalPath ?? join(dataDir, "auth.local.json"));
        this.configPath = resolve(options.configPath ?? join(dataDir, "config.json"));
        this.exampleConfigPath = resolve(options.exampleConfigPath ?? join(dataDir, "config.example.json"));
        this.now = options.now ?? (() => new Date());
        this.useEnvironmentOverrides =
            options.useEnvironmentOverrides ?? this.envConfig.NODE_ENV === "test";
    }
    async ensureFiles() {
        const config = await this.loadConfig();
        const auth = await this.loadAuth();
        const exampleConfig = await this.loadExampleConfig();
        return {
            auth,
            config,
            exampleConfig
        };
    }
    async loadRuntimeAppConfig() {
        const { config } = await this.ensureFiles();
        if (this.useEnvironmentOverrides) {
            return this.envConfig;
        }
        return {
            ...this.envConfig,
            HOST: config.server.host,
            PORT: config.server.port,
            LOG_LEVEL: config.server.logLevel,
            EXTENSION_ORIGIN: config.server.extensionOrigin,
            JIRA_KEY_REGEX: config.matching.ticketKeyRegex,
            HARVEST_API_BASE_URL: resolveEnvBackedConfigValue(this.envConfig.HARVEST_API_BASE_URL, config.harvest.apiBaseUrl, DEFAULT_APP_CONFIG_VALUES.HARVEST_API_BASE_URL),
            HARVEST_AUTH_BASE_URL: resolveEnvBackedConfigValue(this.envConfig.HARVEST_AUTH_BASE_URL, config.harvest.authBaseUrl, DEFAULT_APP_CONFIG_VALUES.HARVEST_AUTH_BASE_URL),
            HARVEST_REDIRECT_URI: resolveEnvBackedConfigValue(this.envConfig.HARVEST_REDIRECT_URI, config.harvest.redirectUri, DEFAULT_APP_CONFIG_VALUES.HARVEST_REDIRECT_URI, [LEGACY_HARVEST_ROOT_REDIRECT_URI]),
            HARVEST_TOKEN_STORE_PATH: resolveEnvBackedConfigValue(this.envConfig.HARVEST_TOKEN_STORE_PATH, config.harvest.oauthTokenStorePath, DEFAULT_APP_CONFIG_VALUES.HARVEST_TOKEN_STORE_PATH),
            HARVEST_ACCOUNT_ID: config.harvest.accountId,
            HARVEST_ACCESS_TOKEN: undefined,
            HARVEST_USER_AGENT: resolveEnvBackedConfigValue(this.envConfig.HARVEST_USER_AGENT, config.harvest.userAgent, DEFAULT_APP_CONFIG_VALUES.HARVEST_USER_AGENT)
        };
    }
    async loadConfig() {
        return this.readOrCreate({
            errorCode: "SETUP_CONFIG_INVALID",
            filePath: this.configPath,
            label: "backend setup config",
            schema: BackendConfigFileSchema,
            value: createDefaultBackendConfig(this.envConfig)
        });
    }
    async loadExampleConfig() {
        return this.readOrCreate({
            errorCode: "SETUP_CONFIG_INVALID",
            filePath: this.exampleConfigPath,
            label: "backend setup example config",
            schema: BackendConfigFileSchema,
            value: createExampleBackendConfig(this.envConfig)
        });
    }
    async loadAuth() {
        return this.readOrCreate({
            errorCode: "SETUP_AUTH_INVALID",
            filePath: this.authLocalPath,
            label: "backend setup auth config",
            privateFile: true,
            schema: BackendAuthLocalFileSchema,
            value: createDefaultBackendAuthLocal()
        });
    }
    async getHarvestPersonalAccessToken() {
        const auth = await this.loadAuth();
        return auth.harvest.personalAccessToken ?? null;
    }
    async saveHarvestPersonalAccessToken(accessToken) {
        const auth = BackendAuthLocalFileSchema.parse({
            schemaVersion: BACKEND_AUTH_LOCAL_SCHEMA_VERSION,
            harvest: {
                personalAccessToken: accessToken,
                savedAt: this.now().toISOString()
            }
        });
        await this.writeValidatedFile(this.authLocalPath, auth, "SETUP_STORAGE_UNAVAILABLE", true);
        return auth;
    }
    async saveHarvestAccount(input) {
        const parsed = SaveHarvestAccountRequestSchema.parse(input);
        const config = await this.loadConfig();
        const updatedConfig = BackendConfigFileSchema.parse({
            ...config,
            harvest: {
                ...config.harvest,
                accountId: parsed.accountId,
                userAgent: parsed.userAgent ?? config.harvest.userAgent
            }
        });
        await this.writeValidatedFile(this.configPath, updatedConfig, "SETUP_STORAGE_UNAVAILABLE");
        return updatedConfig;
    }
    async saveMatchingRules(input) {
        const parsed = SaveMatchingRulesRequestSchema.parse(input);
        const config = await this.loadConfig();
        const updatedConfig = BackendConfigFileSchema.parse({
            ...config,
            matching: parsed
        });
        await this.writeValidatedFile(this.configPath, updatedConfig, "SETUP_STORAGE_UNAVAILABLE");
        return updatedConfig;
    }
    async readOrCreate(input) {
        try {
            const existingValue = await readJsonFile(input.filePath, input.schema, {
                label: input.label
            });
            if (existingValue) {
                return existingValue;
            }
        }
        catch (error) {
            if (error instanceof JsonFileError && error.kind === "invalid-json") {
                return this.recoverCorruptFile(input, error);
            }
            throw toSetupFileError(error instanceof JsonFileError && error.kind === "storage-unavailable"
                ? "SETUP_STORAGE_UNAVAILABLE"
                : input.errorCode, input.label, input.filePath, error);
        }
        await this.writeValidatedFile(input.filePath, input.value, "SETUP_STORAGE_UNAVAILABLE", input.privateFile);
        return input.value;
    }
    async recoverCorruptFile(input, cause) {
        try {
            await recoverInvalidJsonFile(input.filePath, { now: this.now });
            await this.writeValidatedFile(input.filePath, input.value, "SETUP_STORAGE_UNAVAILABLE", input.privateFile);
            return input.value;
        }
        catch (error) {
            throw toSetupFileError("SETUP_STORAGE_UNAVAILABLE", input.label, input.filePath, {
                error,
                recoveryCause: cause
            });
        }
    }
    async writeValidatedFile(filePath, value, errorCode, privateFile = false) {
        try {
            await writeJsonFileAtomically(filePath, value, privateFile ? { mode: 0o600 } : undefined);
        }
        catch (error) {
            throw toSetupFileError(errorCode, "backend setup file", filePath, error);
        }
    }
}
export function createDefaultBackendConfig(envConfig) {
    return BackendConfigFileSchema.parse({
        schemaVersion: BACKEND_CONFIG_SCHEMA_VERSION,
        harvest: {
            accountId: nonEmptyOrUndefined(envConfig.HARVEST_ACCOUNT_ID),
            userAgent: envConfig.HARVEST_USER_AGENT,
            timezone: "UTC",
            apiBaseUrl: envConfig.HARVEST_API_BASE_URL,
            authBaseUrl: envConfig.HARVEST_AUTH_BASE_URL,
            redirectUri: envConfig.HARVEST_REDIRECT_URI,
            oauthTokenStorePath: envConfig.HARVEST_TOKEN_STORE_PATH
        },
        matching: {
            ticketKeyRegex: envConfig.JIRA_KEY_REGEX,
            jiraHosts: [...DEFAULT_JIRA_HOSTS],
            githubHosts: [...DEFAULT_GITHUB_HOSTS],
            genericWorkDomains: [...DEFAULT_GENERIC_WORK_DOMAINS]
        },
        server: {
            host: envConfig.HOST,
            port: envConfig.PORT,
            logLevel: envConfig.LOG_LEVEL,
            extensionOrigin: nonEmptyOrUndefined(envConfig.EXTENSION_ORIGIN)
        }
    });
}
export function createDefaultBackendAuthLocal() {
    return BackendAuthLocalFileSchema.parse({
        schemaVersion: BACKEND_AUTH_LOCAL_SCHEMA_VERSION,
        harvest: {}
    });
}
function createExampleBackendConfig(envConfig) {
    return BackendConfigFileSchema.parse({
        ...createDefaultBackendConfig(envConfig),
        harvest: {
            ...createDefaultBackendConfig(envConfig).harvest,
            accountId: "123456",
            timezone: "Europe/London"
        },
        matching: {
            ticketKeyRegex: envConfig.JIRA_KEY_REGEX,
            jiraHosts: [...DEFAULT_JIRA_HOSTS, "jira.example.test"],
            githubHosts: [...DEFAULT_GITHUB_HOSTS, "github.example.test"],
            genericWorkDomains: ["docs.example.test", "support.example.test"]
        }
    });
}
function resolveEnvBackedConfigValue(envValue, configValue, defaultValue, staleConfigValues = []) {
    if (envValue !== defaultValue || staleConfigValues.includes(configValue)) {
        return envValue;
    }
    return configValue;
}
function toSetupFileError(code, label, filePath, error) {
    const details = getErrorDetails(error);
    const message = code === "SETUP_STORAGE_UNAVAILABLE"
        ? `Unable to write ${label} at ${filePath}`
        : `Invalid ${label} at ${filePath}`;
    return new HttpError(500, code, message, details);
}
function getErrorDetails(error) {
    if (error instanceof JsonFileError) {
        return (error.details ?? {
            backupPath: error.backupPath,
            filePath: error.filePath,
            kind: error.kind,
            message: error.message
        });
    }
    if (error instanceof ZodError) {
        return error.flatten();
    }
    if (isRecoveryError(error)) {
        return {
            message: getErrorMessage(error.error),
            recoveryCause: getErrorMessage(error.recoveryCause)
        };
    }
    if (error instanceof Error) {
        return {
            message: error.message
        };
    }
    return error;
}
function nonEmptyOrUndefined(value) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
function isRecoveryError(error) {
    return (typeof error === "object" && error !== null && "error" in error && "recoveryCause" in error);
}
function getErrorMessage(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return "Unknown error";
}
