import { apiRoutes, HarvestAuthStatusResponseSchema } from "@harvest-time/shared";
import { z } from "zod";
import { HttpError } from "../http/errors.js";
const HarvestOAuthCallbackQuerySchema = z.object({
    code: z.string().min(1).optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
    scope: z.string().optional(),
    state: z.string().optional()
});
export const harvestAuthRoutes = async (app, options) => {
    app.get(apiRoutes.harvestAuth.start, async (_request, reply) => {
        const authorization = options.harvestAuthService.createAuthorizationUrl();
        return reply.redirect(authorization.url);
    });
    app.get(apiRoutes.harvestAuth.callback, async (request, reply) => {
        return handleOAuthCallback(request, reply, options.harvestAuthService);
    });
    app.get("/", async (request, reply) => {
        const query = HarvestOAuthCallbackQuerySchema.parse(request.query);
        if (query.code || query.error) {
            return handleOAuthCallback(request, reply, options.harvestAuthService);
        }
        return reply.type("text/plain").send("HarvestTime API is running");
    });
    app.get(apiRoutes.harvestAuth.status, async () => {
        return HarvestAuthStatusResponseSchema.parse(await options.harvestAuthService.getStatus());
    });
    app.post(apiRoutes.harvestAuth.disconnect, async () => {
        return HarvestAuthStatusResponseSchema.parse(await options.harvestAuthService.disconnect());
    });
};
async function handleOAuthCallback(request, reply, harvestAuthService) {
    const query = HarvestOAuthCallbackQuerySchema.parse(request.query);
    if (query.error) {
        throw new HttpError(400, "HARVEST_OAUTH_REJECTED", query.error_description ?? query.error);
    }
    if (!query.code) {
        throw new HttpError(400, "MISSING_OAUTH_CODE", "Harvest OAuth callback is missing a code");
    }
    const status = await harvestAuthService.exchangeAuthorizationCode({
        code: query.code,
        scope: query.scope,
        state: query.state
    });
    return reply.type("text/html").send(renderOAuthSuccessPage(status.accountId));
}
function renderOAuthSuccessPage(accountId) {
    const accountMessage = accountId ? `Harvest account ${escapeHtml(accountId)} is connected.` : "";
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Harvest connected</title>
    <style>
      body {
        color: #1f2933;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        margin: 3rem;
      }
      main {
        max-width: 38rem;
      }
      h1 {
        font-size: 1.5rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Harvest connected</h1>
      <p>${accountMessage}</p>
      <p>You can close this tab and return to the HarvestTime extension.</p>
    </main>
  </body>
</html>`;
}
function escapeHtml(value) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;");
}
