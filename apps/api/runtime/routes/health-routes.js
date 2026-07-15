import { apiRoutes } from "@harvest-time/shared";
export const healthRoutes = async (app, options) => {
    app.get(apiRoutes.health, async () => {
        return {
            status: "ok",
            service: "harvest-time-api",
            version: options.version,
            harvestConfigured: await options.harvestAuthService.hasApiCredentials(),
            uptimeSeconds: process.uptime()
        };
    });
};
