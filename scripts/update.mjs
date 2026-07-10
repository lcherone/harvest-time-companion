import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const companionRoot = path.resolve(path.dirname(__filename), "..");

export async function updateCompanion({ checkOnly = false } = {}) {
  await run("git", ["rev-parse", "--is-inside-work-tree"], { quiet: true });
  const changes = await run("git", ["status", "--porcelain", "--untracked-files=no"], {
    capture: true,
    quiet: true
  });

  if (changes.trim()) {
    throw new Error(
      "Automatic update skipped because tracked companion files have local changes. Commit or discard them first."
    );
  }

  await run("git", ["fetch", "--quiet", "--prune", "origin"]);
  const upstream = (
    await run("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], {
      capture: true,
      quiet: true
    })
  ).trim();
  const current = (await run("git", ["rev-parse", "HEAD"], { capture: true, quiet: true })).trim();
  const latest = (await run("git", ["rev-parse", upstream], { capture: true, quiet: true })).trim();

  if (current === latest) {
    return { changed: false, current, latest };
  }

  const ancestry = await run("git", ["merge-base", "--is-ancestor", current, latest], {
    allowFailure: true,
    quiet: true
  });

  if (ancestry.code !== 0) {
    throw new Error(
      `Automatic update requires a fast-forward, but ${upstream} has diverged from this checkout.`
    );
  }

  if (checkOnly) {
    return { changed: true, current, latest };
  }

  console.log(
    `Updating HarvestTime Companion from ${current.slice(0, 7)} to ${latest.slice(0, 7)}...`
  );
  await run("git", ["merge", "--ff-only", upstream]);
  await run(npmCommand(), ["ci", "--ignore-scripts", "--no-audit", "--no-fund"]);

  return { changed: true, current, latest };
}

async function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: companionRoot,
      env: process.env,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : options.quiet ? "ignore" : "inherit"
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      const result = { code: code ?? 1, stderr, stdout };

      if (code === 0 || options.allowFailure) {
        resolve(options.capture ? stdout : result);
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} failed with code ${code}${stderr ? `: ${stderr.trim()}` : ""}`
          )
        );
      }
    });
  });
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

if (path.resolve(process.argv[1] ?? "") === __filename) {
  try {
    const checkOnly = process.argv.includes("--check");
    const result = await updateCompanion({ checkOnly });

    if (!result.changed) {
      console.log("HarvestTime Companion is already up to date.");
    } else if (checkOnly) {
      console.log(
        `An update is available: ${result.current.slice(0, 7)} -> ${result.latest.slice(0, 7)}`
      );
    } else {
      console.log("HarvestTime Companion update installed.");
    }
  } catch (error) {
    console.error(`HarvestTime Companion update failed: ${error.message}`);
    process.exitCode = 1;
  }
}
