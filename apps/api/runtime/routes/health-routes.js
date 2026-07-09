import { apiRoutes } from "@harvest-time/shared";
const version = process.env.npm_package_version ?? "0.1.0";
export const healthRoutes = async (app, options) => {
    app.get(apiRoutes.health, async () => {
        return {
            status: "ok",
            service: "harvest-time-api",
            version,
            harvestConfigured: await options.harvestAuthService.hasApiCredentials(),
            uptimeSeconds: process.uptime()
        };
    });
};
