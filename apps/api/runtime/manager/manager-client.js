export const managerJs = `(() => {
  "use strict";

  const pages = new Set(["setup", "connections", "review", "history", "settings", "health"]);
  const manager = document.querySelector("#manager");
  const notice = document.querySelector("#notice");
  let csrfToken = "";
  let historyDays = [];
  let historyFilter = "all";
  let historyHasLoaded = false;
  let historyClearOpener = null;
  let restartOpener = null;
  let restartRequested = false;
  const openHistoryDates = new Set();
  let status = null;

  function query(selector) {
    const element = document.querySelector(selector);
    if (!element) throw new Error("Missing manager element: " + selector);
    return element;
  }

  function showNotice(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle("is-error", error);
    notice.classList.remove("is-hidden");
    window.setTimeout(() => notice.classList.add("is-hidden"), 5500);
  }

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has("content-type")) headers.set("content-type", "application/json");
    if (options.method && options.method !== "GET" && csrfToken) headers.set("x-harvesttime-csrf", csrfToken);
    const response = await fetch(path, { ...options, credentials: "same-origin", headers });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload && payload.error && payload.error.message ? payload.error.message : "The companion request failed.";
      const error = new Error(message);
      error.status = response.status;
      throw error;
    }
    return payload;
  }

  async function loadStatus() {
    status = await request("/api/admin/status");
    csrfToken = status.csrfToken;
    renderStatus(status);
  }

  function setBadge(selector, label, state = "ok") {
    const badge = query(selector);
    badge.textContent = label;
    badge.classList.toggle("is-error", state === "error");
    badge.classList.toggle("subtle", state === "subtle");
  }

  function renderStatus(value) {
    const connected = value.setup.harvestConfigured && value.setup.accountConfigured;
    setBadge("#setup-harvest-badge", connected ? "Connected" : value.setup.harvestConfigured ? "Choose account" : "Not connected", connected ? "ok" : "error");
    query("#setup-form-area").classList.toggle("is-hidden", connected);
    query("#token-form").classList.toggle("is-hidden", value.setup.harvestConfigured);
    query("#harvest-connected-summary").classList.toggle("is-hidden", !connected);
    if (!connected && !value.setup.harvestConfigured) {
      setSetupPrimaryAction("token-form", "Validate and continue");
    }
    if (connected) {
      query("#account-form").classList.add("is-hidden");
    }
    query("#harvest-connected-detail").textContent = value.auth.accountId ? "Account " + value.auth.accountId + " is selected." : "Your credentials are ready.";
    setBadge("#setup-jira-badge", value.jira.enabled ? (value.jira.ready ? "Ready" : "Needs attention") : "Optional", value.jira.ready ? "ok" : "subtle");

    query("#connection-harvest").textContent = connected
      ? "Connected using " + authSourceLabel(value.auth.source) + "."
      : value.setup.harvestConfigured ? "Credentials saved; choose an account to finish setup." : "Not connected.";
    setBadge("#connection-harvest-badge", connected ? "Connected" : "Setup needed", connected ? "ok" : "error");
    query("#connection-jira").textContent = value.jira.ready
      ? "Verification is ready for " + (value.jira.siteUrl || "the configured Jira site") + "."
      : value.jira.enabled ? "Verification is enabled but not ready." : "Optional verification is disabled.";
    setBadge("#connection-jira-badge", value.jira.ready ? "Ready" : value.jira.enabled ? "Check setup" : "Optional", value.jira.ready ? "ok" : "subtle");
    query("#disconnect-harvest").classList.toggle("is-hidden", !value.auth.disconnectAllowed);
    setOverviewStatus(
      "harvest",
      connected ? "Connected" : value.setup.harvestConfigured ? "Choose account" : "Not connected",
      connected ? "ready" : "attention"
    );
    setOverviewStatus(
      "jira",
      value.jira.ready ? "Connected" : value.jira.enabled ? "Needs attention" : "Optional",
      value.jira.ready ? "ready" : value.jira.enabled ? "attention" : "idle"
    );

    setStepStatus("companion", "Connected locally");
    setStepStatus(
      "harvest",
      connected ? "Connected" : value.setup.harvestConfigured ? "Choose account" : "Connection needed"
    );
    setStepStatus(
      "jira",
      value.jira.ready ? "Enrichment ready" : value.jira.enabled ? "Needs attention" : "Optional · skipped"
    );
    setStepStatus("detection", "Matching rules ready");
    setStepStatus("review", connected ? "Ready to review" : "Available after Harvest");

    const matching = value.config.matching;
    query("#ticket-regex").value = matching.ticketKeyRegex;
    query("#jira-hosts").value = matching.jiraHosts.join("\\n");
    query("#github-hosts").value = matching.githubHosts.join("\\n");
    query("#work-hosts").value = matching.genericWorkDomains.join("\\n");

    const servicePort = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
    query("#health-service").textContent = value.health.status === "ok" ? "Running on 127.0.0.1:" + servicePort : value.health.status;
    query("#health-version").textContent = value.health.version;
    query("#health-uptime").textContent = formatDuration(value.health.uptimeSeconds);
    query("#health-data-directory").textContent = value.health.dataDirectory;
    query("#storage-data-directory").textContent = value.health.dataDirectory;
    query("#health-session").textContent = new Date(value.sessionExpiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    renderRestartAvailability(value.health.restartAvailable);

    markStep("companion", true);
    markStep("harvest", connected);
    markStep("jira", value.jira.ready || !value.jira.enabled);
    markStep("detection", true);
    markStep("review", connected);
    const currentStep = !connected
      ? "harvest"
      : value.jira.enabled && !value.jira.ready
        ? "jira"
        : "review";
    setCurrentStep(currentStep);
    renderProgressReason(currentStep, value, connected);
  }

  function setStepStatus(name, label) {
    document.querySelectorAll('[data-step-status="' + name + '"]').forEach((element) => {
      element.textContent = label;
    });
  }

  function markStep(name, complete) {
    document.querySelectorAll('[data-step="' + name + '"]').forEach((step) => {
      step.classList.toggle("is-complete", complete);
    });
  }

  function setCurrentStep(name) {
    document.querySelectorAll("[data-step]").forEach((step) => {
      const current = step.getAttribute("data-step") === name;
      step.classList.toggle("is-current", current);
      const link = step.querySelector("a");
      if (link) {
        if (current) link.setAttribute("aria-current", "step");
        else link.removeAttribute("aria-current");
      }
    });
  }

  function renderProgressReason(name, value, connected) {
    const details = {
      harvest: {
        count: "Step 2 of 5 needs attention",
        title: value.setup.harvestConfigured ? "Choose your Harvest account" : "Connect Harvest next",
        detail: value.setup.harvestConfigured
          ? "Your token is saved, but HarvestTime still needs to know which Harvest account to use."
          : "The companion is running. Add Harvest credentials so the extension can read projects and create only the time entries you approve.",
        action: "#setup",
        actionLabel: "Finish Harvest setup"
      },
      jira: {
        count: "Step 3 of 5 needs attention",
        title: "Finish or disable Jira enrichment",
        detail: "Jira verification is enabled but cannot connect. Check the site URL, email, and API token, then restart the companion.",
        action: "#connections",
        actionLabel: "Check Jira setup"
      },
      review: {
        count: "Step 5 of 5 · ready",
        title: "You’re ready to review",
        detail: value.jira.ready
          ? "The companion, Harvest, Jira enrichment, and matching rules are ready. Return to the extension to review today."
          : "The companion and Harvest are connected, matching rules are ready, and optional Jira enrichment is safely skipped. Return to the extension to review today.",
        action: "#review",
        actionLabel: "See how review works"
      }
    };
    const progress = details[name] || details.review;
    query("#setup-progress-count").textContent = progress.count;
    query("#setup-progress-title").textContent = progress.title;
    query("#setup-progress-detail").textContent = progress.detail;
    const action = query("#setup-progress-action");
    action.href = progress.action;
    action.firstChild.textContent = progress.actionLabel + " ";

    const reviewReason = query("#review-ready-reason");
    const reviewBanner = document.querySelector(".review-ready-banner");
    reviewReason.textContent = connected
      ? progress.detail
      : "Harvest is not connected yet. Complete step 2 first, then return here to learn how daily review works.";
    if (reviewBanner) reviewBanner.classList.toggle("is-pending", !connected);
  }

  function setOverviewStatus(name, label, state) {
    const statusLabel = query("#overview-" + name);
    statusLabel.textContent = label;
    statusLabel.className = "overview-status is-" + state;
    const dot = query("#overview-" + name + "-dot");
    dot.classList.toggle("is-ready", state === "ready");
    dot.classList.toggle("is-attention", state === "attention");
  }

  function setSetupPrimaryAction(formId, label) {
    const action = query("#setup-primary-action");
    action.setAttribute("form", formId);
    action.querySelector("span").textContent = label;
    action.classList.remove("is-hidden");
  }

  function authSourceLabel(source) {
    if (source === "personal-access-token") return "a local personal access token";
    if (source === "oauth") return "Harvest OAuth";
    return "companion-managed credentials";
  }

  function formatDuration(seconds) {
    if (seconds < 60) return Math.max(0, Math.floor(seconds)) + " seconds";
    if (seconds < 3600) return Math.floor(seconds / 60) + " minutes";
    return Math.floor(seconds / 3600) + "h " + Math.floor((seconds % 3600) / 60) + "m";
  }

  function renderRestartAvailability(available) {
    if (restartRequested) return;
    const button = query("#restart-button");
    button.disabled = !available;
    button.querySelector("span").textContent = available ? "Restart companion" : "Restart unavailable";
    query("#restart-availability").textContent = available
      ? "The installed background supervisor is ready."
      : "Install or start the background service to enable restart here.";
    query("#restart-fallback").classList.toggle("is-unavailable", !available);
  }

  function setRestartStatus(message, state) {
    const element = query("#restart-status");
    element.textContent = message;
    element.className = "restart-status is-" + state;
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function waitForRestartRecovery() {
    const deadline = Date.now() + 20000;
    let oldSessionEnded = false;

    while (Date.now() < deadline) {
      if (!oldSessionEnded) {
        try {
          await request("/api/admin/status");
        } catch (error) {
          if (error.status === 401) oldSessionEnded = true;
        }
      } else {
        try {
          const response = await fetch("/health", {
            cache: "no-store",
            credentials: "same-origin"
          });
          if (response.ok) {
            setRestartStatus("Companion restarted. Reopen Companion manager from the extension to create a fresh secure session.", "success");
            return;
          }
        } catch {
          // The loopback service is expected to be briefly unavailable while it restarts.
        }
      }

      await delay(350);
    }

    query("#restart-fallback").open = true;
    setRestartStatus("Restart was requested, but this page could not confirm that the companion came back. Use the command-line fallback below, then reopen Companion manager from the extension.", "error");
  }

  function splitLines(value) {
    return value.split(/\\r?\\n/).map((item) => item.trim()).filter(Boolean);
  }

  async function loadHistory() {
    query("#history-clear-button").disabled = true;
    renderHistoryLoading();
    try {
      const result = await request("/api/admin/history");
      historyDays = result.days;
      if (!historyHasLoaded && historyDays.length) {
        openHistoryDates.add(historyDays[0].date);
      }
      historyHasLoaded = true;
      renderHistorySummary(historyDays);
      renderHistoryDays();
    } catch (error) {
      historyDays = [];
      renderHistorySummary(historyDays);
      renderHistoryError(error.message);
    }
  }

  function renderHistoryLoading() {
    const container = query("#history-list");
    container.className = "history-list";
    container.setAttribute("aria-busy", "true");
    query("#history-summary").classList.add("is-hidden");
    query("#history-tools").classList.add("is-hidden");
    const state = createHistoryState(
      "loading",
      "Loading previous days…",
      "Reading the history stored on this computer."
    );
    state.setAttribute("role", "status");
    container.replaceChildren(state);
  }

  function renderHistoryError(message) {
    const container = query("#history-list");
    container.className = "history-list";
    container.setAttribute("aria-busy", "false");
    query("#history-tools").classList.add("is-hidden");
    query("#history-clear-button").disabled = true;
    const state = createHistoryState(
      "error",
      "Previous days could not be loaded",
      message || "The companion could not read local history."
    );
    state.setAttribute("role", "alert");
    const retry = document.createElement("button");
    retry.className = "history-retry-button";
    retry.type = "button";
    retry.textContent = "Try again";
    retry.addEventListener("click", () => void loadHistory());
    state.append(retry);
    container.replaceChildren(state);
  }

  function renderHistorySummary(days) {
    const summary = query("#history-summary");
    const totals = days.reduce(
      (result, day) => ({
        entries: result.entries + day.entryCount,
        attention: result.attention + getHistoryDayView(day).attentionCount,
        minutes: result.minutes + day.trackedMinutes
      }),
      { entries: 0, attention: 0, minutes: 0 }
    );
    query("#history-day-count").textContent = String(days.length);
    query("#history-entry-count").textContent = String(totals.entries);
    query("#history-time-total").textContent = formatMinutes(totals.minutes);
    query("#history-attention-count").textContent = String(totals.attention);
    summary.classList.toggle("has-attention", totals.attention > 0);
    summary.classList.toggle("is-hidden", days.length === 0);
  }

  function renderHistoryDays() {
    const container = query("#history-list");
    container.className = "history-list";
    container.setAttribute("aria-busy", "false");
    container.replaceChildren();
    query("#history-clear-button").disabled = historyDays.length === 0;
    query("#history-tools").classList.toggle("is-hidden", historyDays.length === 0);

    if (!historyDays.length) {
      container.append(createHistoryEmptyState(false));
      updateHistoryTools([]);
      return;
    }

    const views = historyDays.map(getHistoryDayView);
    const visibleViews = views.filter(
      (view) => historyFilter === "all" || view.attentionEntries.length > 0
    );
    if (!visibleViews.length) {
      container.append(createHistoryEmptyState(true));
      updateHistoryTools(visibleViews);
      return;
    }

    visibleViews.forEach((view) => container.append(createHistoryDay(view)));
    updateHistoryTools(visibleViews);
  }

  function updateHistoryTools(visibleViews) {
    document.querySelectorAll("[data-history-filter]").forEach((button) => {
      const active = button.getAttribute("data-history-filter") === historyFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    const entryCount = visibleViews.reduce(
      (total, view) =>
        total +
        (historyFilter === "attention" ? view.attentionEntries.length : view.day.entries.length),
      0
    );
    const dayCount = visibleViews.length;
    query("#history-result-summary").textContent =
      historyFilter === "attention"
        ? "Showing " +
          entryCount +
          " " +
          plural(entryCount, "entry", "entries") +
          " needing review across " +
          dayCount +
          " " +
          plural(dayCount, "day", "days")
        : "Showing " +
          entryCount +
          " " +
          plural(entryCount, "entry", "entries") +
          " across " +
          dayCount +
          " " +
          plural(dayCount, "day", "days");
    syncHistoryExpandButton();
  }

  function syncHistoryExpandButton() {
    const button = query("#history-expand-button");
    const visibleDays = Array.from(document.querySelectorAll("#history-list .history-day"));
    const allOpen = visibleDays.length > 0 && visibleDays.every((day) => day.open);
    button.disabled = visibleDays.length === 0;
    button.textContent = allOpen ? "Collapse all" : "Expand all";
  }

  function createHistoryEmptyState(filtered) {
    const empty = document.createElement("div");
    empty.className = "history-empty";
    const icon = createHistoryIcon(filtered ? "check" : "calendar");
    const title = document.createElement("strong");
    title.textContent = filtered ? "Nothing needs review" : "No previous days stored";
    const copy = document.createElement("p");
    copy.textContent = filtered
      ? "Every stored entry is complete and already on Harvest."
      : "Finished days will appear here with their recorded time and activity summary.";
    empty.append(icon, title, copy);
    if (filtered) {
      const reset = document.createElement("button");
      reset.className = "history-retry-button";
      reset.type = "button";
      reset.textContent = "Show all entries";
      reset.addEventListener("click", () => {
        historyFilter = "all";
        renderHistoryDays();
      });
      empty.append(reset);
    }
    return empty;
  }

  function createHistoryState(kind, titleText, copyText) {
    const state = document.createElement("div");
    state.className = "history-state is-" + kind;
    const icon = kind === "loading" ? document.createElement("span") : createHistoryIcon("warning");
    if (kind === "loading") icon.className = "history-spinner";
    icon.setAttribute("aria-hidden", "true");
    const title = document.createElement("strong");
    title.textContent = titleText;
    const copy = document.createElement("p");
    copy.textContent = copyText;
    state.append(icon, title, copy);
    return state;
  }

  function createHistoryDay(view) {
    const day = view.day;
    const details = document.createElement("details");
    details.className = "history-day";
    details.dataset.date = day.date;
    details.open = openHistoryDates.has(day.date);
    const summary = document.createElement("summary");
    const title = document.createElement("div");
    title.className = "history-day-title";
    const strong = document.createElement("strong");
    strong.textContent = new Date(day.date + "T12:00:00").toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const small = document.createElement("small");
    small.textContent = "Updated " + new Date(day.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) + " · " + formatHistorySources(day);
    title.append(strong, small);
    const metrics = document.createElement("div");
    metrics.className = "history-day-metrics";
    metrics.append(
      createHistoryMetric(formatMinutes(day.trackedMinutes), "Recorded"),
      createHistoryMetric(String(day.entryCount), day.entryCount === 1 ? "Entry" : "Entries"),
      createHistoryMetric(String(view.attentionCount), "Needs review", view.attentionCount > 0)
    );
    const chevron = createHistoryIcon("chevron");
    chevron.classList.add("history-chevron");
    summary.append(title, metrics, chevron);
    details.append(summary);
    const body = document.createElement("div");
    body.className = "history-day-body";
    const overview = document.createElement("dl");
    overview.className = "history-day-overview";
    overview.append(
      createHistoryDetail("Recorded span", formatHistorySpan(day.entries)),
      createHistoryDetail("Entry status", formatHistorySources(day)),
      createHistoryDetail("Work contexts", String(day.contextCount)),
      createHistoryDetail("Activity", formatHistoryActivity(day))
    );
    body.append(overview);
    const list = document.createElement("div");
    list.className = "history-entries";
    body.append(list);
    details.append(body);

    let populated = false;
    const populateEntries = () => {
      if (populated) return;
      populated = true;
      const entries = historyFilter === "attention" ? view.attentionEntries : view.entries;
      if (!entries.length) {
        const item = document.createElement("p");
        item.className = "history-no-entries";
        item.textContent = "No time entries were recorded for this day.";
        list.append(item);
      } else {
        for (const item of entries) {
          list.append(createHistoryEntry(item.entry, item.issue, day.date, item.index));
        }
      }
    };

    if (details.open) populateEntries();
    details.addEventListener("toggle", () => {
      if (details.open) {
        openHistoryDates.add(day.date);
        populateEntries();
      } else {
        openHistoryDates.delete(day.date);
      }
      syncHistoryExpandButton();
    });
    return details;
  }

  function createHistoryMetric(value, label, attention = false) {
    const metric = document.createElement("div");
    metric.classList.toggle("has-attention", attention);
    const strong = document.createElement("strong");
    strong.textContent = value;
    const small = document.createElement("small");
    small.textContent = label;
    metric.append(strong, small);
    return metric;
  }

  function createHistoryDetail(label, value) {
    const item = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    item.append(term, description);
    return item;
  }

  function getHistoryDayView(day) {
    const issues = day.entries.map((entry) => ({
      incomplete: !entry.stoppedAt,
      localOnly: entry.source !== "harvest",
      overlapMinutes: 0
    }));
    for (let first = 0; first < day.entries.length; first += 1) {
      const firstEntry = day.entries[first];
      if (!firstEntry.stoppedAt) continue;
      for (let second = first + 1; second < day.entries.length; second += 1) {
        const secondEntry = day.entries[second];
        if (!secondEntry.stoppedAt) continue;
        const overlap =
          Math.min(Date.parse(firstEntry.stoppedAt), Date.parse(secondEntry.stoppedAt)) -
          Math.max(Date.parse(firstEntry.startedAt), Date.parse(secondEntry.startedAt));
        if (overlap > 0) {
          const minutes = Math.max(1, Math.round(overlap / 60000));
          issues[first].overlapMinutes = Math.max(issues[first].overlapMinutes, minutes);
          issues[second].overlapMinutes = Math.max(issues[second].overlapMinutes, minutes);
        }
      }
    }
    const entries = day.entries.map((entry, index) => ({ entry, index, issue: issues[index] }));
    const attentionEntries = entries.filter((item) => isHistoryEntryAttention(item.issue));
    return { day, entries, attentionEntries, attentionCount: attentionEntries.length };
  }

  function isHistoryEntryAttention(issue) {
    return issue.incomplete || issue.localOnly || issue.overlapMinutes > 0;
  }

  function createHistoryEntry(entry, issue, dayDate, index) {
    const item = document.createElement("article");
    item.className = "history-entry is-" + entry.source;
    item.classList.toggle("is-incomplete", issue.incomplete);
    item.classList.toggle("is-overlap", issue.overlapMinutes > 0);
    const time = document.createElement("div");
    time.className = "history-entry-time";
    const range = document.createElement("strong");
    range.textContent = formatHistoryRange(entry.startedAt, entry.stoppedAt);
    const duration = document.createElement("small");
    duration.textContent = entry.durationMinutes === null ? "Open-ended" : formatMinutes(entry.durationMinutes);
    time.append(range, duration);
    const content = document.createElement("div");
    content.className = "history-entry-content";
    const metadata = document.createElement("div");
    metadata.className = "history-entry-metadata";
    if (entry.ticketKey) {
      const ticket = document.createElement("span");
      ticket.className = "history-ticket-key";
      ticket.textContent = entry.ticketKey;
      metadata.append(ticket);
    }
    if (entry.kind) {
      const context = document.createElement("span");
      context.textContent = formatHistoryKind(entry.kind);
      metadata.append(context);
    }
    const description = document.createElement("h3");
    description.id = "history-entry-" + dayDate + "-" + index;
    description.textContent = cleanHistoryDescription(entry.description, entry.ticketKey);
    item.setAttribute("aria-labelledby", description.id);
    content.append(metadata, description);
    const supporting = document.createElement("dl");
    supporting.className = "history-entry-details";
    supporting.append(
      createHistoryDetail(
        "Recorded to",
        entry.mappingName ||
          (entry.source === "harvest" ? "Harvest destination unavailable" : "Not on Harvest")
      )
    );
    content.append(supporting);
    const status = document.createElement("div");
    status.className = "history-entry-status";
    const source = document.createElement("span");
    source.className = "history-entry-source is-" + entry.source;
    source.textContent = historySourceLabel(entry.source);
    status.append(source);
    if (issue.incomplete) status.append(createHistoryWarning("Needs time"));
    if (issue.overlapMinutes > 0) {
      status.append(createHistoryWarning("Overlaps by " + formatMinutes(issue.overlapMinutes)));
    }
    item.append(time, content, status);
    return item;
  }

  function createHistoryWarning(label) {
    const warning = document.createElement("span");
    warning.className = "history-entry-warning";
    warning.textContent = label;
    return warning;
  }

  function formatHistoryRange(startedAt, stoppedAt) {
    const start = new Date(startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (!stoppedAt) return start + "–…";
    const stop = new Date(stoppedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return start + "–" + stop;
  }

  function formatMinutes(minutes) {
    const safeMinutes = Math.max(0, Math.round(minutes || 0));
    const hours = Math.floor(safeMinutes / 60);
    const remainder = safeMinutes % 60;
    if (!hours) return remainder + "m";
    return hours + "h" + (remainder ? " " + remainder + "m" : "");
  }

  function historySourceLabel(source) {
    if (source === "harvest") return "On Harvest";
    if (source === "manual") return "Manual entry";
    return "Local only";
  }

  function formatHistoryKind(kind) {
    if (!kind) return "";
    return kind.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  function formatHistorySources(day) {
    const mockEntryCount = Math.max(0, day.entryCount - day.harvestEntryCount - day.manualEntryCount);
    const parts = [];
    if (day.harvestEntryCount) parts.push(day.harvestEntryCount + " on Harvest");
    if (day.manualEntryCount) {
      parts.push(
        day.manualEntryCount +
          " " +
          plural(day.manualEntryCount, "manual entry", "manual entries")
      );
    }
    if (mockEntryCount) parts.push(mockEntryCount + " local only");
    if (!parts.length) parts.push("No time entries");
    return parts.join(" · ");
  }

  function formatHistoryActivity(day) {
    const parts = [];
    if (day.eventCount) {
      parts.push(day.eventCount + " " + plural(day.eventCount, "timeline event", "timeline events"));
    }
    if (day.historyItemCount) {
      parts.push(
        day.historyItemCount +
          " browser " +
          plural(day.historyItemCount, "item", "items")
      );
    }
    return parts.length ? parts.join(" · ") : "No activity items";
  }

  function formatHistorySpan(entries) {
    if (!entries.length) return "No recorded time";
    const startedAt = entries.reduce(
      (earliest, entry) =>
        Date.parse(entry.startedAt) < Date.parse(earliest) ? entry.startedAt : earliest,
      entries[0].startedAt
    );
    const stoppedEntries = entries.filter((entry) => entry.stoppedAt);
    const stoppedAt = stoppedEntries.length
      ? stoppedEntries.reduce(
          (latest, entry) =>
            Date.parse(entry.stoppedAt) > Date.parse(latest) ? entry.stoppedAt : latest,
          stoppedEntries[0].stoppedAt
        )
      : null;
    return formatHistoryRange(startedAt, stoppedAt);
  }

  function cleanHistoryDescription(description, ticketKey) {
    if (!ticketKey) return description;
    const prefix = ticketKey + ":";
    return description.toUpperCase().startsWith(prefix.toUpperCase())
      ? description.slice(prefix.length).trim() || description
      : description;
  }

  function plural(value, singular, pluralValue) {
    return value === 1 ? singular : pluralValue;
  }

  function createHistoryIcon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const paths = {
      calendar: "M6 3v3M18 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v14H4V6a1 1 0 0 1 1-1Zm3 8h3v3H8v-3Z",
      check: "m5 12 4 4L19 6",
      warning: "M12 3 2.8 20h18.4L12 3Zm0 6v5m0 3h.01",
      chevron: "m9 6 6 6-6 6"
    };
    path.setAttribute("d", paths[name] || paths.chevron);
    svg.append(path);
    return svg;
  }

  function showPage(page) {
    const name = pages.has(page) ? page : "setup";
    manager.dataset.page = name;
    document.querySelectorAll("[data-page]").forEach((element) => element.classList.toggle("is-hidden", element.getAttribute("data-page") !== name));
    document.querySelectorAll("[data-nav]").forEach((element) => {
      const active = element.getAttribute("data-nav") === name;
      element.classList.toggle("is-active", active);
      if (active) element.setAttribute("aria-current", "page");
      else element.removeAttribute("aria-current");
    });
    const contextualHelpPages = new Set(["connections", "review", "history", "settings", "health"]);
    const helpPage = contextualHelpPages.has(name) ? name : "default";
    document.querySelectorAll("[data-help-page]").forEach((element) => element.classList.toggle("is-hidden", element.getAttribute("data-help-page") !== helpPage));
    query("#menu-toggle").setAttribute("aria-expanded", "false");
    document.body.classList.remove("is-menu-open");
    if (name === "history") void loadHistory();
  }

  query("#menu-toggle").addEventListener("click", () => {
    const expanded = query("#menu-toggle").getAttribute("aria-expanded") === "true";
    query("#menu-toggle").setAttribute("aria-expanded", String(!expanded));
    document.body.classList.toggle("is-menu-open", !expanded);
  });

  document.querySelectorAll("[data-history-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      historyFilter = button.getAttribute("data-history-filter") || "all";
      renderHistoryDays();
    });
  });

  query("#history-expand-button").addEventListener("click", () => {
    const days = Array.from(document.querySelectorAll("#history-list .history-day"));
    const shouldOpen = !days.length || !days.every((day) => day.open);
    for (const day of days) {
      day.open = shouldOpen;
      const date = day.getAttribute("data-date");
      if (date) {
        if (shouldOpen) openHistoryDates.add(date);
        else openHistoryDates.delete(date);
      }
    }
    syncHistoryExpandButton();
  });

  query("#history-clear-button").addEventListener("click", () => {
    if (!historyDays.length) return;
    historyClearOpener = document.activeElement;
    const description = query("#history-clear-description");
    const dayLabel = historyDays.length === 1 ? "previous day" : "previous days";
    description.textContent = "This permanently removes " + historyDays.length + " locally stored " + dayLabel + " shown here. Today’s work, companion settings, credentials, and entries already on Harvest are not affected.";
    query("#history-clear-error").textContent = "";
    query("#history-clear-error").classList.add("is-hidden");
    query("#history-clear-dialog").showModal();
    query("#history-clear-cancel").focus();
  });

  query("#history-clear-cancel").addEventListener("click", () => {
    query("#history-clear-dialog").close();
  });

  query("#history-clear-dialog").addEventListener("close", () => {
    if (historyClearOpener && typeof historyClearOpener.focus === "function") {
      historyClearOpener.focus();
    }
    historyClearOpener = null;
  });

  query("#history-clear-confirm").addEventListener("click", async () => {
    const button = query("#history-clear-confirm");
    button.disabled = true;
    button.textContent = "Removing…";
    try {
      const result = await request("/api/admin/history", { method: "DELETE", body: "{}" });
      query("#history-clear-dialog").close();
      openHistoryDates.clear();
      await loadHistory();
      showNotice(result.removedDayCount === 1 ? "1 previous day was removed from this computer." : result.removedDayCount + " previous days were removed from this computer.");
      query("#history-title").focus();
    } catch (error) {
      const dialogError = query("#history-clear-error");
      dialogError.textContent = error.message;
      dialogError.classList.remove("is-hidden");
    } finally {
      button.disabled = false;
      button.textContent = "Remove history";
    }
  });

  query("#restart-button").addEventListener("click", () => {
    if (query("#restart-button").disabled || restartRequested) return;
    restartOpener = document.activeElement;
    query("#restart-error").textContent = "";
    query("#restart-error").classList.add("is-hidden");
    query("#restart-dialog").showModal();
    query("#restart-cancel").focus();
  });

  query("#restart-cancel").addEventListener("click", () => {
    query("#restart-dialog").close();
  });

  query("#restart-dialog").addEventListener("close", () => {
    if (restartOpener && typeof restartOpener.focus === "function") restartOpener.focus();
    restartOpener = null;
  });

  query("#restart-confirm").addEventListener("click", async () => {
    const confirm = query("#restart-confirm");
    confirm.disabled = true;
    confirm.textContent = "Restarting…";
    query("#restart-error").classList.add("is-hidden");

    try {
      await request("/api/admin/restart", { method: "POST", body: "{}" });
      restartRequested = true;
      const restartButton = query("#restart-button");
      restartButton.disabled = true;
      restartButton.querySelector("span").textContent = "Restart requested";
      query("#restart-availability").textContent = "Waiting for the fresh companion process…";
      restartOpener = null;
      query("#restart-dialog").close();
      setRestartStatus("Restart requested. The extension will be offline briefly while the companion reloads .env and saved configuration.", "waiting");
      query("#restart-status").focus();
      void waitForRestartRecovery();
    } catch (error) {
      const dialogError = query("#restart-error");
      dialogError.textContent = error.message;
      dialogError.classList.remove("is-hidden");
    } finally {
      if (!restartRequested) {
        confirm.disabled = false;
        confirm.textContent = "Restart companion";
      }
    }
  });

  query("#token-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const token = query("#token-input").value.trim();
    try {
      const result = await request("/api/admin/harvest-token", { method: "POST", body: JSON.stringify({ accessToken: token }) });
      const select = query("#account-select");
      select.replaceChildren();
      for (const account of result.accounts) {
        const option = document.createElement("option"); option.value = account.accountId; option.textContent = account.name + (account.product ? " · " + account.product : ""); select.append(option);
      }
      select.disabled = false;
      query("#account-form").classList.remove("is-hidden");
      query("#token-form").classList.add("is-hidden");
      setSetupPrimaryAction("account-form", "Use account and continue");
      query("#token-input").value = "";
      showNotice("Token validated. Choose the Harvest account to use.");
    } catch (error) { showNotice(error.message, true); }
  });

  query("#account-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await request("/api/admin/harvest-account", { method: "POST", body: JSON.stringify({ accountId: query("#account-select").value }) });
      query("#account-form").classList.add("is-hidden");
      await loadStatus();
      showNotice("Harvest account saved. The extension is ready to use.");
    } catch (error) { showNotice(error.message, true); }
  });

  query("#token-visibility").addEventListener("click", () => {
    const input = query("#token-input");
    const button = query("#token-visibility");
    const shouldShow = input.type === "password";
    input.type = shouldShow ? "text" : "password";
    button.setAttribute("aria-pressed", String(shouldShow));
    button.setAttribute("aria-label", shouldShow ? "Hide personal access token" : "Show personal access token");
  });

  query("#matching-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await request("/api/admin/matching", { method: "POST", body: JSON.stringify({
        ticketKeyRegex: query("#ticket-regex").value,
        jiraHosts: splitLines(query("#jira-hosts").value),
        githubHosts: splitLines(query("#github-hosts").value),
        genericWorkDomains: splitLines(query("#work-hosts").value)
      }) });
      await loadStatus();
      showNotice("Matching rules saved. Restart the companion before relying on the new detection rules.");
    } catch (error) { showNotice(error.message, true); }
  });

  query("#disconnect-harvest").addEventListener("click", async () => {
    if (!window.confirm("Disconnect Harvest on this computer? Existing Harvest entries will not be deleted.")) return;
    try {
      await request("/api/admin/harvest-disconnect", { method: "POST" });
      await loadStatus();
      showNotice("Harvest credentials were removed from the local companion.");
    } catch (error) { showNotice(error.message, true); }
  });

  window.addEventListener("hashchange", () => showPage(location.hash.slice(1)));

  async function start() {
    try {
      await loadStatus();
      showPage(pages.has(location.hash.slice(1)) ? location.hash.slice(1) : "setup");
    } catch {
      document.body.replaceChildren();
      location.replace(location.pathname + location.search);
    }
  }

  void start();
})();`;
