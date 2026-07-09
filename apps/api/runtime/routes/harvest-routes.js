import { apiRoutes, CreateTimeEntryRequestSchema, ListTimeEntriesQuerySchema, TimeEntryIdParamsSchema } from "@harvest-time/shared";
export const harvestRoutes = async (app, options) => {
    app.get(apiRoutes.harvest.me, async () => {
        return options.harvestClient.getCurrentUser();
    });
    app.get(apiRoutes.harvest.timeEntries, async (request) => {
        const query = ListTimeEntriesQuerySchema.parse(request.query);
        return options.harvestClient.listTimeEntries(query);
    });
    app.post(apiRoutes.harvest.timeEntries, async (request, reply) => {
        const body = CreateTimeEntryRequestSchema.parse(request.body);
        const timeEntry = await options.harvestClient.createTimeEntry(body);
        return reply.status(201).send(timeEntry);
    });
    app.patch(apiRoutes.harvest.stopTimeEntry(), async (request) => {
        const params = TimeEntryIdParamsSchema.parse(request.params);
        return options.harvestClient.stopTimeEntry(params.id);
    });
    app.patch(apiRoutes.harvest.restartTimeEntry(), async (request) => {
        const params = TimeEntryIdParamsSchema.parse(request.params);
        return options.harvestClient.restartTimeEntry(params.id);
    });
};
