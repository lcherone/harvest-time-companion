import { execFile } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const companionRoot = path.resolve(path.dirname(__filename), "..");
const uninstall = process.argv.includes("--uninstall");

if (process.argv.includes("--help")) {
  console.log(`Usage: node scripts/install-service.mjs [--uninstall]

Installs or removes a per-user background service for HarvestTime Companion.
Supported service managers: macOS launchd, Linux systemd --user, and Windows Task Scheduler.`);
  process.exit(0);
}

if (uninstall) {
  await uninstallService();
  console.log("HarvestTime Companion background service removed. Local data was kept.");
} else {
  await installService();
  console.log("HarvestTime Companion background service installed and started.");
}

async function installService() {
  if (process.platform === "darwin") {
    await installLaunchAgent();
  } else if (process.platform === "linux") {
    await installSystemdUserService();
  } else if (process.platform === "win32") {
    await installScheduledTask();
  } else {
    throw new Error(`Automatic service installation is not supported on ${process.platform}.`);
  }
}

async function uninstallService() {
  if (process.platform === "darwin") {
    const filePath = launchAgentPath();
    await runIgnoringFailure("launchctl", ["bootout", `gui/${process.getuid()}`, filePath]);
    await rm(filePath, { force: true });
  } else if (process.platform === "linux") {
    await runIgnoringFailure("systemctl", ["--user", "disable", "--now", "harvest-time-companion"]);
    await rm(systemdServicePath(), { force: true });
    await runIgnoringFailure("systemctl", ["--user", "daemon-reload"]);
  } else if (process.platform === "win32") {
    await runIgnoringFailure("schtasks.exe", ["/Delete", "/TN", "HarvestTime Companion", "/F"]);
  } else {
    throw new Error(`Automatic service removal is not supported on ${process.platform}.`);
  }
}

async function installLaunchAgent() {
  const filePath = launchAgentPath();
  const logDirectory = path.join(os.homedir(), ".harvest-time", "logs");
  await mkdir(path.dirname(filePath), { recursive: true });
  await mkdir(logDirectory, { recursive: true });
  await writeFile(
    filePath,
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.harvesttime.companion</string>
  <key>ProgramArguments</key>
  <array>
    <string>${xml(process.execPath)}</string>
    <string>${xml(path.join(companionRoot, "scripts", "supervisor.mjs"))}</string>
  </array>
  <key>WorkingDirectory</key><string>${xml(companionRoot)}</string>
  <key>EnvironmentVariables</key>
  <dict><key>PATH</key><string>${xml(servicePath())}</string></dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>${xml(path.join(logDirectory, "companion.log"))}</string>
  <key>StandardErrorPath</key><string>${xml(path.join(logDirectory, "companion-error.log"))}</string>
</dict>
</plist>
`
  );
  await chmod(filePath, 0o600);
  await runIgnoringFailure("launchctl", ["bootout", `gui/${process.getuid()}`, filePath]);
  await exec("launchctl", ["bootstrap", `gui/${process.getuid()}`, filePath]);
}

async function installSystemdUserService() {
  const filePath = systemdServicePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    `[Unit]
Description=HarvestTime Companion
After=network-online.target

[Service]
Type=simple
WorkingDirectory=${systemdQuote(companionRoot)}
ExecStart=${systemdQuote(process.execPath)} ${systemdQuote(path.join(companionRoot, "scripts", "supervisor.mjs"))}
Environment=PATH=${systemdQuote(servicePath())}
Restart=on-failure
RestartSec=5

[Install]
WantedBy=default.target
`
  );
  await exec("systemctl", ["--user", "daemon-reload"]);
  await exec("systemctl", ["--user", "enable", "harvest-time-companion"]);
  await exec("systemctl", ["--user", "restart", "harvest-time-companion"]);
}

async function installScheduledTask() {
  const command = `"${process.execPath}" "${path.join(companionRoot, "scripts", "supervisor.mjs")}"`;
  await runIgnoringFailure("schtasks.exe", ["/Delete", "/TN", "HarvestTime Companion", "/F"]);
  await exec("schtasks.exe", [
    "/Create",
    "/SC",
    "ONLOGON",
    "/TN",
    "HarvestTime Companion",
    "/TR",
    command,
    "/F"
  ]);
  await exec("schtasks.exe", ["/Run", "/TN", "HarvestTime Companion"]);
}

function launchAgentPath() {
  return path.join(os.homedir(), "Library", "LaunchAgents", "com.harvesttime.companion.plist");
}

function systemdServicePath() {
  return path.join(os.homedir(), ".config", "systemd", "user", "harvest-time-companion.service");
}

function servicePath() {
  const entries = [
    path.dirname(process.execPath),
    ...(process.env.PATH ?? "").split(path.delimiter)
  ];
  return [...new Set(entries.filter(Boolean))].join(path.delimiter);
}

function systemdQuote(value) {
  return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`;
}

function xml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function runIgnoringFailure(command, args) {
  await exec(command, args).catch(() => undefined);
}
