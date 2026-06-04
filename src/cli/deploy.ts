import { buildCommand } from "./build.js"
import { loadConfig } from "./config-loader.js"
import { commandExists, runRequired } from "./process.js"
import { confirm } from "./prompt.js"
import type { CliContext } from "./types.js"

export async function deployCommand(context: CliContext): Promise<void> {
  if (!commandExists("firebase")) {
    throw new Error("firebase-tools is required. Install it with: npm install -g firebase-tools")
  }

  const config = await loadConfig(context.cwd)
  if (!config.project) {
    throw new Error("No Firebase project configured. Run firescope connect first.")
  }

  if (!context.flags.has("yes") && !context.flags.has("y")) {
    const proceed = await confirm(`Deploy to ${config.project}`, false)
    if (!proceed) return
  }

  await buildCommand(context)
  await runRequired("firebase", ["deploy", "--config", "firebase.json", "--project", config.project], {
    cwd: context.cwd,
    stdio: "inherit",
  })
}
