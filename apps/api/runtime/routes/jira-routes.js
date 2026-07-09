import { apiRoutes, JiraVerificationStatusSchema } from "@harvest-time/shared";
export const jiraRoutes = async (app, options) => {
    app.get(apiRoutes.jira.status, async () => {
        return JiraVerificationStatusSchema.parse(await options.jiraIssueResolver.getStatus());
    });
};
