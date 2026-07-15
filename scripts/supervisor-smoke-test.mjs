import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, URL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const companionRoot = path.resolve(__dirname, "..");
const extensionOrigin = "chrome-extension://pbdiaopaeddjdblijddkkgfiheejolol";
const dataDir = await mkdtemp(path.join(os.tmpdir(), "harvest-time-supervisor-data-"));
const initCwd = await mkdtemp(path.join(os.tmpdir(), "harvest-time-supervisor-env-"));
const port = await findAvailablePort();
const managerOrigin = `http://127.0.0.1:${port}`;
let output = "";

const supervisorEnv = {
  ...process.env,
  HARVEST_TIME_DATA_DIR: dataDir,
  HARVEST_TIME_ENV_FILE: path.join(initCwd, ".env"),
  HARVEST_TOKEN_STORE_PATH: path.join(dataDir, "oauth-token.json"),
  HOST: "127.0.0.1",
  INIT_CWD: initCwd,
  LOG_LEVEL: "silent",
  NODE_ENV: "production",
  PORT: String(port)
};

for (const key of [
  "EXTENSION_ORIGIN",
  "JIRA_API_TOKEN",
  "JIRA_EMAIL",
  "JIRA_SITE_URL",
  "JIRA_VERIFY_ISSUES"
]) {
  delete supervisorEnv[key];
}

await writeFile(path.join(initCwd, ".env"), "JIRA_VERIFY_ISSUES=false\n", "utf8");

const supervisor = spawn(process.execPath, ["scripts/supervisor.mjs", "--no-update"], {
  cwd: companionRoot,
  env: supervisorEnv,
  stdio: ["ignore", "pipe", "pipe"]
});

supervisor.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
supervisor.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  const packageVersion = JSON.parse(
    await readFile(path.join(companionRoot, "package.json"), "utf8")
  ).version;
  const initialHealth = await waitForHealth();

  if (initialHealth.version !== packageVersion) {
    throw new Error(`Health reported version ${initialHealth.version}, expected ${packageVersion}`);
  }

  const firstSession = await createManagerSession();
  const initialStatus = await readManagerStatus(firstSession);

  if (!initialStatus.health?.restartAvailable) {
    throw new Error(`Supervisor restart is unavailable: ${JSON.stringify(initialStatus.health)}`);
  }

  if (initialStatus.health?.version !== packageVersion) {
    throw new Error(
      `Supervisor reported version ${initialStatus.health?.version}, expected ${packageVersion}`
    );
  }

  if (initialStatus.jira?.siteUrl) {
    throw new Error(`Jira unexpectedly started configured: ${JSON.stringify(initialStatus.jira)}`);
  }

  await writeFile(
    path.join(initCwd, ".env"),
    "JIRA_VERIFY_ISSUES=true\nJIRA_SITE_URL=https://restart-smoke.atlassian.net\n",
    "utf8"
  );

  const restartResponse = await fetch(`${managerOrigin}/api/admin/restart`, {
    body: "{}",
    headers: {
      "content-type": "application/json",
      cookie: firstSession.cookie,
      origin: managerOrigin,
      "x-harvesttime-csrf": firstSession.csrfToken
    },
    method: "POST"
  });
  const restart = await readJson(restartResponse, "requesting a supervised restart");

  if (restartResponse.status !== 202 || restart.restartScheduled !== true) {
    throw new Error(
      `Unexpected restart response (${restartResponse.status}): ${JSON.stringify(restart)}`
    );
  }

  await waitForOldSessionToExpire(firstSession);
  const restartedHealth = await waitForHealth();

  if (restartedHealth.version !== packageVersion) {
    throw new Error(
      `Restarted health reported version ${restartedHealth.version}, expected ${packageVersion}`
    );
  }

  const secondSession = await createManagerSession();
  const restartedStatus = await readManagerStatus(secondSession);

  if (restartedStatus.jira?.enabled !== true) {
    throw new Error(`Jira environment was not reloaded: ${JSON.stringify(restartedStatus.jira)}`);
  }

  if (restartedStatus.jira?.siteUrl !== "https://restart-smoke.atlassian.net") {
    throw new Error(
      `Restarted companion did not load the new Jira site: ${JSON.stringify(restartedStatus.jira)}`
    );
  }

  console.log(`Companion supervisor restart smoke test passed on 127.0.0.1:${port}`);
} catch (error) {
  if (output.trim()) {
    console.error(output.trim());
  }
  throw error;
} finally {
  await stopSupervisor();
  await Promise.all([
    rm(dataDir, { force: true, recursive: true }),
    rm(initCwd, { force: true, recursive: true })
  ]);
}

async function createManagerSession() {
  const launchResponse = await fetch(`${managerOrigin}/api/admin/sessions`, {
    body: "{}",
    headers: {
      "content-type": "application/json",
      origin: extensionOrigin,
      "x-harvesttime-client": "extension"
    },
    method: "POST"
  });
  const launch = await readJson(launchResponse, "creating a manager launch token");
  const token = new URL(launch.url).hash.slice(1);
  const exchangeResponse = await fetch(`${managerOrigin}/api/admin/session/exchange`, {
    body: JSON.stringify({ token }),
    headers: {
      "content-type": "application/json",
      origin: managerOrigin
    },
    method: "POST"
  });
  const exchange = await readJson(exchangeResponse, "exchanging a manager launch token");
  const cookie = exchangeResponse.headers.get("set-cookie")?.split(";", 1)[0];

  if (!cookie || typeof exchange.csrfToken !== "string") {
    throw new Error("Manager session response did not include its cookie and CSRF token");
  }

  return { cookie, csrfToken: exchange.csrfToken };
}

async function readManagerStatus(session) {
  const response = await fetch(`${managerOrigin}/api/admin/status`, {
    headers: { cookie: session.cookie }
  });
  return readJson(response, "loading manager status");
}

async function waitForOldSessionToExpire(session) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (supervisor.exitCode !== null || supervisor.signalCode !== null) {
      throw new Error("Supervisor exited while restarting the companion");
    }

    try {
      const response = await fetch(`${managerOrigin}/api/admin/status`, {
        headers: { cookie: session.cookie }
      });

      if (response.status === 401) {
        return;
      }
    } catch {
      // The API is briefly unavailable while the supervisor replaces it.
    }

    await delay(100);
  }

  throw new Error("Timed out waiting for the previous manager session to be invalidated");
}

async function waitForHealth() {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    if (supervisor.exitCode !== null || supervisor.signalCode !== null) {
      throw new Error(
        `Supervisor exited before the companion became healthy (code ${supervisor.exitCode})`
      );
    }

    try {
      const response = await fetch(`${managerOrigin}/health`);

      if (response.ok) {
        const health = await response.json();

        if (health?.status === "ok" && health?.service === "harvest-time-api") {
          return health;
        }
      }
    } catch {
      // The API may still be starting.
    }

    await delay(100);
  }

  throw new Error("Timed out waiting for the supervised companion health endpoint");
}

async function readJson(response, action) {
  const text = await response.text();
  let body;

  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON while ${action} (${response.status}): ${text}`);
  }

  if (!response.ok) {
    throw new Error(`Request failed while ${action} (${response.status}): ${text}`);
  }

  return body;
}

async function stopSupervisor() {
  if (supervisor.exitCode !== null || supervisor.signalCode !== null) {
    return;
  }

  const exited = new Promise((resolve) => supervisor.once("exit", resolve));
  supervisor.kill("SIGTERM");
  await Promise.race([exited, delay(7_000)]);

  if (supervisor.exitCode === null && supervisor.signalCode === null) {
    supervisor.kill("SIGKILL");
    await Promise.race([exited, delay(2_000)]);
  }
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const availablePort = typeof address === "object" && address ? address.port : null;

      probe.close((error) => {
        if (error) {
          reject(error);
        } else if (availablePort) {
          resolve(availablePort);
        } else {
          reject(new Error("Unable to allocate a supervisor smoke-test port"));
        }
      });
    });
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}
