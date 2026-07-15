import { buildApp } from "./app.js";
import { BackendConfigService } from "./config/backend-config-service.js";
import { loadConfig } from "./config/env.js";
const envConfig = loadConfig();
const backendConfigService = new BackendConfigService({ envConfig });
const config = await backendConfigService.loadRuntimeAppConfig();
const requestRestart = process.env.HARVEST_TIME_SUPERVISED === "1" && typeof process.send === "function"
    ? () => {
        if (process.connected) {
            process.send?.({ type: "restart-companion" });
        }
    }
    : undefined;
const app = await buildApp({ backendConfigService, config, requestRestart });
const shutdown = async (signal) => {
    app.log.info({ signal }, "Shutting down");
    await app.close();
};
process.once("SIGINT", () => {
    void shutdown("SIGINT");
});
process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
});
await app.listen({
    host: config.HOST,
    port: config.PORT
});
