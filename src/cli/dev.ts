import { loadConfig } from "./config-loader.js"
import { buildCommand } from "./build.js"
import { commandExists, runRequired } from "./process.js"
import type { CliContext } from "./types.js"

export async function devCommand(context: CliContext): Promise<void> {
  if (!commandExists("firebase")) {
    throw new Error("firebase-tools is required. Install it with: npm install -g firebase-tools")
  }

  const config = await loadConfig(context.cwd)
  await buildCommand(context)

  const args = ["emulators:start", "--config", "firebase.json"]
  if (config.project) args.push("--project", config.project)

  await runRequired("firebase", args, { cwd: context.cwd, stdio: "inherit" })
}
