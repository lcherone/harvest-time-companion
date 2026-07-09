import { apiRoutes, BrowserHistoryPayloadSchema, ClipboardTicketEvidencePayloadSchema, CockpitStateSchema, CreateManualDailyEntryRequestSchema, ManualDailyEntryIdParamsSchema, ManualDailyEntryOptionsResponseSchema, StartTimerRequestSchema, TabEventPayloadSchema, TimelineEventIdParamsSchema, UpdateTimelineEventRequestSchema } from "@harvest-time/shared";
export const cockpitRoutes = async (app, options) => {
    app.get(apiRoutes.cockpit.state, async () => {
        return CockpitStateSchema.parse(await options.cockpitService.getState());
    });
    app.post(apiRoutes.cockpit.events.tab, async (request) => {
        const payload = TabEventPayloadSchema.parse(request.body);
        return CockpitStateSchema.parse(await options.cockpitService.recordTabEvent(payload));
    });
    app.post(apiRoutes.cockpit.events.clipboard, async (request) => {
        const payload = ClipboardTicketEvidencePayloadSchema.parse(request.body);
        return CockpitStateSchema.parse(await options.cockpitService.recordClipboardTicket(payload));
    });
    app.post(apiRoutes.cockpit.events.history, async (request) => {
        const payload = BrowserHistoryPayloadSchema.parse(request.body);
        return CockpitStateSchema.parse(await options.cockpitService.recordBrowserHistory(payload.items));
    });
    app.get(apiRoutes.cockpit.review.manualEntryOptions, async () => {
        return ManualDailyEntryOptionsResponseSchema.parse(await options.cockpitService.getManualDailyEntryOptions());
    });
    app.post(apiRoutes.cockpit.review.manualEntries, async (request) => {
        const body = CreateManualDailyEntryRequestSchema.parse(request.body);
        return CockpitStateSchema.parse(await options.cockpitService.createManualDailyEntry(body));
    });
    app.delete(apiRoutes.cockpit.review.manualEntry(), async (request) => {
        const params = ManualDailyEntryIdParamsSchema.parse(request.params);
        return CockpitStateSchema.parse(await options.cockpitService.removeManualDailyEntry(params.id));
    });
    app.patch(apiRoutes.cockpit.timeline.updateEvent(), async (request) => {
        const params = TimelineEventIdParamsSchema.parse(request.params);
        const body = UpdateTimelineEventRequestSchema.parse(request.body);
        return CockpitStateSchema.parse(await options.cockpitService.updateTimelineEvent(params.id, body));
    });
    app.post(apiRoutes.cockpit.timeline.resumeEvent(), async (request) => {
        const params = TimelineEventIdParamsSchema.parse(request.params);
        return CockpitStateSchema.parse(await options.cockpitService.resumeTimelineEvent(params.id));
    });
    app.delete(apiRoutes.cockpit.timeline.updateEvent(), async (request) => {
        const params = TimelineEventIdParamsSchema.parse(request.params);
        return CockpitStateSchema.parse(await options.cockpitService.removeTimelineEvent(params.id));
    });
    app.post(apiRoutes.cockpit.timer.start, async (request) => {
        const body = StartTimerRequestSchema.parse(request.body ?? {});
        return CockpitStateSchema.parse(await options.cockpitService.startOrSwitchDetected(body));
    });
    app.post(apiRoutes.cockpit.timer.comms, async (request) => {
        const body = StartTimerRequestSchema.parse(request.body ?? {});
        return CockpitStateSchema.parse(await options.cockpitService.startComms(body));
    });
    app.post(apiRoutes.cockpit.timer.resume, async () => {
        return CockpitStateSchema.parse(await options.cockpitService.resumePrevious());
    });
    app.post(apiRoutes.cockpit.timer.stop, async () => {
        return CockpitStateSchema.parse(await options.cockpitService.stopRunningTimer());
    });
};
