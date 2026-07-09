import { buildApp } from "./app.js";
import { BackendConfigService } from "./config/backend-config-service.js";
import { loadConfig } from "./config/env.js";
const envConfig = loadConfig();
const backendConfigService = new BackendConfigService({ envConfig });
const config = await backendConfigService.loadRuntimeAppConfig();
const app = await buildApp({ backendConfigService, config });
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
