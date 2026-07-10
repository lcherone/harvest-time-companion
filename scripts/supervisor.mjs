import { spawn } from "node:child_process";
import path from "node:path";
import { clearInterval, setInterval } from "node:timers";
import { fileURLToPath } from "node:url";

import { updateCompanion } from "./update.mjs";

const __filename = fileURLToPath(import.meta.url);
const companionRoot = path.resolve(path.dirname(__filename), "..");
const help = process.argv.includes("--help");
const updatesEnabled = !process.argv.includes("--no-update");
const updateInterval = Number(process.env.HARVEST_TIME_UPDATE_INTERVAL_MS ?? 21_600_000);
let server;
let stopping = false;
let restarting = false;

if (help) {
  console.log(`Usage: node scripts/supervisor.mjs [--no-update]

Starts the HarvestTime API, checks the companion's tracked Git branch for fast-forward updates,
installs dependencies after an update, and restarts the API. The default check interval is 6 hours.
Set HARVEST_TIME_UPDATE_INTERVAL_MS to override the interval.`);
  process.exit(0);
}

if (!Number.isFinite(updateInterval) || updateInterval < 60_000) {
  throw new Error("HARVEST_TIME_UPDATE_INTERVAL_MS must be a number of at least 60000.");
}

startServer();
const timer = updatesEnabled ? setInterval(checkForUpdate, updateInterval) : null;
timer?.unref();

if (updatesEnabled) {
  setTimeout(checkForUpdate, 5_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

async function checkForUpdate() {
  try {
    const result = await updateCompanion({ checkOnly: true });

    if (!result.changed || stopping) {
      return;
    }

    restarting = true;
    await stopServer();
    await installUpdate();
    restarting = false;
    startServer();
  } catch (error) {
    restarting = false;
    console.error(`HarvestTime automatic update failed: ${error.message}`);

    if (!server && !stopping) {
      startServer();
    }
  }
}

async function installUpdate() {
  try {
    await updateCompanion();
  } catch (error) {
    console.error(`HarvestTime automatic update skipped: ${error.message}`);
  }
}

function startServer() {
  server = spawn(process.execPath, ["apps/api/runtime/server.js"], {
    cwd: companionRoot,
    env: { ...process.env, NODE_ENV: process.env.NODE_ENV ?? "production" },
    stdio: "inherit"
  });

  server.on("error", (error) => {
    console.error(`HarvestTime API could not start: ${error.message}`);
  });
  server.on("exit", (code, signal) => {
    server = undefined;

    if (stopping) {
      process.exit(code ?? 0);
    }

    if (restarting) {
      return;
    }

    console.error(`HarvestTime API exited (${signal ?? `code ${code}`}); restarting in 5 seconds.`);
    setTimeout(() => {
      if (!stopping) {
        startServer();
      }
    }, 5_000);
  });
}

async function stopServer() {
  if (!server) {
    return;
  }

  const child = server;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) =>
      setTimeout(() => {
        child.kill("SIGKILL");
        resolve();
      }, 5_000)
    )
  ]);
}

async function shutdown(signal) {
  if (stopping) {
    return;
  }

  stopping = true;
  if (timer) {
    clearInterval(timer);
  }
  await stopServer();
  process.exit(signal === "SIGINT" ? 130 : 0);
}
