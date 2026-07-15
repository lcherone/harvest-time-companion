import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
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
let updateCheckQueued = false;
let lifecycleQueue = Promise.resolve();

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

function checkForUpdate() {
  if (updateCheckQueued || stopping) {
    return;
  }

  updateCheckQueued = true;
  void queueLifecycle(async () => {
    try {
      const result = await updateCompanion({ checkOnly: true });

      if (!result.changed || stopping) {
        return;
      }

      restarting = true;
      await stopServer();
      await installUpdate();
      restarting = false;

      if (!stopping && !server) {
        startServer();
      }
    } catch (error) {
      restarting = false;
      console.error(`HarvestTime automatic update failed: ${error.message}`);

      if (!server && !stopping) {
        startServer();
      }
    } finally {
      updateCheckQueued = false;
    }
  });
}

async function installUpdate() {
  try {
    await updateCompanion();
  } catch (error) {
    console.error(`HarvestTime automatic update skipped: ${error.message}`);
  }
}

function startServer() {
  if (server || stopping) {
    return;
  }

  const child = spawn(process.execPath, ["apps/api/runtime/server.js"], {
    cwd: companionRoot,
    env: {
      ...process.env,
      HARVEST_TIME_COMPANION_VERSION: readCompanionVersion(),
      HARVEST_TIME_SUPERVISED: "1",
      NODE_ENV: process.env.NODE_ENV ?? "production"
    },
    stdio: ["inherit", "inherit", "inherit", "ipc"]
  });
  server = child;

  child.on("error", (error) => {
    console.error(`HarvestTime API could not start: ${error.message}`);
  });
  child.on("message", (message) => {
    if (message?.type === "restart-companion") {
      void queueLifecycle(restartServerFromManager);
    }
  });
  child.on("exit", (code, signal) => {
    if (server !== child) {
      return;
    }

    server = undefined;

    if (stopping) {
      return;
    }

    if (restarting) {
      return;
    }

    console.error(`HarvestTime API exited (${signal ?? `code ${code}`}); restarting in 5 seconds.`);
    setTimeout(() => {
      void queueLifecycle(async () => {
        if (!stopping && !server) {
          startServer();
        }
      });
    }, 5_000);
  });
}

function readCompanionVersion() {
  try {
    const packageJson = JSON.parse(readFileSync(path.join(companionRoot, "package.json"), "utf8"));
    return typeof packageJson.version === "string" ? packageJson.version : "0.1.0";
  } catch {
    return process.env.npm_package_version ?? "0.1.0";
  }
}

async function restartServerFromManager() {
  if (stopping) {
    return;
  }

  restarting = true;
  console.log("HarvestTime companion restart requested from the local manager.");
  try {
    await stopServer();
  } finally {
    restarting = false;
  }

  if (!stopping && !server) {
    startServer();
  }
}

function queueLifecycle(operation) {
  const run = lifecycleQueue.then(operation, operation);
  lifecycleQueue = run.catch((error) => {
    console.error(`HarvestTime companion lifecycle operation failed: ${error.message}`);
  });
  return lifecycleQueue;
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
  await queueLifecycle(stopServer);
  process.exit(signal === "SIGINT" ? 130 : 0);
}
