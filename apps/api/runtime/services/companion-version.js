import { readFile } from "node:fs/promises";
export async function resolveCompanionVersion(options = {}) {
    const env = options.env ?? process.env;
    const configuredVersion = normalizeVersion(env.HARVEST_TIME_COMPANION_VERSION);
    if (configuredVersion) {
        return configuredVersion;
    }
    try {
        const packageUrl = options.packageUrl ?? new URL("../../../../package.json", import.meta.url);
        const packageJson = JSON.parse(await readFile(packageUrl, "utf8"));
        const packageVersion = normalizeVersion(packageJson.version);
        if (packageVersion) {
            return packageVersion;
        }
    }
    catch {
        // Development and partial test builds may not have a companion root package.
    }
    return (options.nodeEnv ?? env.NODE_ENV) === "production" ? "Unknown" : "Development build";
}
function normalizeVersion(value) {
    if (typeof value !== "string") {
        return null;
    }
    const version = value.trim();
    return version || null;
}
