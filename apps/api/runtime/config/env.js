import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { DEFAULT_TICKET_KEY_REGEX, TicketKeyRegexSchema } from "@harvest-time/shared";
export function getDotenvPaths(options = {}) {
    const cwd = options.cwd ?? process.cwd();
    const initCwd = options.initCwd ?? process.env.INIT_CWD;
    const moduleUrl = options.moduleUrl ?? import.meta.url;
    const moduleDirectory = dirname(fileURLToPath(moduleUrl));
    const paths = [];
    const explicitPath = options.dotenvPath ?? process.env.HARVEST_TIME_ENV_FILE;
    if (explicitPath) {
        addUniquePath(paths, resolve(cwd, explicitPath));
        return paths;
    }
    addUniquePath(paths, resolve(cwd, ".env"));
    if (initCwd) {
        addUniquePath(paths, resolve(initCwd, ".env"));
    }
    addUniquePath(paths, resolve(moduleDirectory, "../../../..", ".env"));
    return paths;
}
function loadDotenvFiles() {
    for (const path of getDotenvPaths()) {
        if (existsSync(path)) {
            dotenv.config({ path });
        }
    }
}
function addUniquePath(paths, path) {
    if (!paths.includes(path)) {
        paths.push(path);
    }
}
loadDotenvFiles();
export const DEFAULT_APP_CONFIG_VALUES = {
    NODE_ENV: "development",
    HOST: "127.0.0.1",
    PORT: 8787,
    LOG_LEVEL: "info",
    JIRA_KEY_REGEX: DEFAULT_TICKET_KEY_REGEX,
    JIRA_VERIFY_ISSUES: false,
    HARVEST_API_BASE_URL: "https://api.harvestapp.com/v2",
    HARVEST_AUTH_BASE_URL: "https://id.getharvest.com",
    HARVEST_REDIRECT_URI: "http://127.0.0.1:8787/auth/harvest/callback",
    HARVEST_TOKEN_STORE_PATH: ".harvest-time/oauth-token.json",
    HARVEST_USER_AGENT: "HarvestTime Backend (dev@example.com)"
};
const EnvSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default(DEFAULT_APP_CONFIG_VALUES.NODE_ENV),
    HOST: z.string().default(DEFAULT_APP_CONFIG_VALUES.HOST),
    PORT: z.coerce.number().int().positive().default(DEFAULT_APP_CONFIG_VALUES.PORT),
    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default(DEFAULT_APP_CONFIG_VALUES.LOG_LEVEL),
    HARVEST_TIME_DATA_DIR: z.string().trim().min(1).optional(),
    EXTENSION_ORIGIN: z.string().optional(),
    JIRA_KEY_REGEX: TicketKeyRegexSchema.default(DEFAULT_APP_CONFIG_VALUES.JIRA_KEY_REGEX),
    JIRA_VERIFY_ISSUES: z
        .union([z.boolean(), z.enum(["true", "false"]).transform((value) => value === "true")])
        .default(DEFAULT_APP_CONFIG_VALUES.JIRA_VERIFY_ISSUES),
    JIRA_SITE_URL: z.string().url().optional(),
    JIRA_EMAIL: z.string().optional(),
    JIRA_API_TOKEN: z.string().optional(),
    HARVEST_API_BASE_URL: z.string().url().default(DEFAULT_APP_CONFIG_VALUES.HARVEST_API_BASE_URL),
    HARVEST_AUTH_BASE_URL: z.string().url().default(DEFAULT_APP_CONFIG_VALUES.HARVEST_AUTH_BASE_URL),
    HARVEST_CLIENT_ID: z.string().optional(),
    HARVEST_CLIENT_SECRET: z.string().optional(),
    HARVEST_REDIRECT_URI: z.string().url().default(DEFAULT_APP_CONFIG_VALUES.HARVEST_REDIRECT_URI),
    HARVEST_TOKEN_STORE_PATH: z
        .string()
        .min(1)
        .default(DEFAULT_APP_CONFIG_VALUES.HARVEST_TOKEN_STORE_PATH),
    HARVEST_ACCOUNT_ID: z.string().optional(),
    HARVEST_ACCESS_TOKEN: z.string().optional(),
    HARVEST_USER_AGENT: z.string().min(1).default(DEFAULT_APP_CONFIG_VALUES.HARVEST_USER_AGENT)
});
export function loadConfig(source = process.env) {
    const parsed = EnvSchema.safeParse(source);
    if (!parsed.success) {
        throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
    }
    return parsed.data;
}
export function hasHarvestCredentials(config) {
    return Boolean(config.HARVEST_ACCOUNT_ID && config.HARVEST_ACCESS_TOKEN);
}
export function hasHarvestOAuthClient(config) {
    return Boolean(config.HARVEST_CLIENT_ID && config.HARVEST_CLIENT_SECRET);
}
