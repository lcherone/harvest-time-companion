import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");
const dataDir = await mkdtemp(path.join(os.tmpdir(), "harvest-time-companion-"));
const port = await findAvailablePort();
let output = "";

const server = spawn(process.execPath, ["apps/api/runtime/server.js"], {
  cwd: repoRoot,
  env: {
    ...process.env,
    HARVEST_TIME_DATA_DIR: dataDir,
    HARVEST_TOKEN_STORE_PATH: path.join(dataDir, "oauth-token.json"),
    HOST: "127.0.0.1",
    LOG_LEVEL: "silent",
    NODE_ENV: "production",
    PORT: String(port)
  },
  stdio: ["ignore", "pipe", "pipe"]
});

server.stdout.on("data", (chunk) => {
  output += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  output += chunk.toString();
});

try {
  const health = await waitForHealth(port);

  if (health?.status !== "ok" || health?.service !== "harvest-time-api") {
    throw new Error(`Unexpected health response: ${JSON.stringify(health)}`);
  }

  console.log(`Companion smoke test passed on 127.0.0.1:${port}`);
} catch (error) {
  if (output.trim()) {
    console.error(output.trim());
  }
  throw error;
} finally {
  server.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => server.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2_000))
  ]);
  await rm(dataDir, { force: true, recursive: true });
}

async function waitForHealth(targetPort) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Companion exited before becoming healthy (code ${server.exitCode})`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${targetPort}/health`);

      if (response.ok) {
        return response.json();
      }
    } catch {
      // The server may still be starting.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error("Timed out waiting for the HarvestTime companion health endpoint");
}

async function findAvailablePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : null;

      probe.close((error) => {
        if (error) {
          reject(error);
        } else if (port) {
          resolve(port);
        } else {
          reject(new Error("Unable to allocate a smoke-test port"));
        }
      });
    });
  });
}
