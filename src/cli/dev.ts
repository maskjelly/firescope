import { loadConfig } from "./config-loader.js"
import { buildCommand } from "./build.js"
import { log } from "./log.js"
import { commandExists, runRequired } from "./process.js"
import type { CliContext } from "./types.js"

const localDemoProject = "demo-firescope"

export async function devCommand(context: CliContext): Promise<void> {
  if (!commandExists("firebase")) {
    throw new Error("firebase-tools is required. Run npm install in this app, or install it with: npm install -D firebase-tools")
  }

  const config = await loadConfig(context.cwd)
  await buildCommand(context)

  const args = ["emulators:start", "--config", "firebase.json"]
  args.push("--project", config.project || localDemoProject)

  if (!config.project) {
    log.info(`No Firebase project configured. Using ${localDemoProject} for local emulators.`)
  }

  await runRequired("firebase", args, { cwd: context.cwd, stdio: "inherit" })
}
