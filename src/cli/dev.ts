import { flagEnabled, flagString, forwardFlags } from "./args.js"
import { buildCommand } from "./build.js"
import { loadConfig } from "./config-loader.js"
import { FirescopeError } from "./errors.js"
import { color, log } from "./log.js"
import { resolveCommand, runRequired } from "./process.js"
import { watchSources } from "./watch.js"
import type { CliContext } from "./types.js"

const localDemoProject = "demo-firescope"

export async function devCommand(context: CliContext): Promise<void> {
  const firebase = resolveCommand("firebase", context.cwd)

  if (!firebase) {
    throw new FirescopeError(
      "firebase-tools is not installed for this app",
      "Run npm install (firebase-tools is a devDependency), or install it globally with npm install -g firebase-tools.",
    )
  }

  const config = await loadConfig(context.cwd)
  const project = flagString(context, "project") ?? config.project

  log.step("Building functions")
  await buildCommand(context)

  const stopWatching = flagEnabled(context, "no-watch") ? () => {} : await watchSources(context, config)

  if (!project) {
    log.info(color.dim(`No Firebase project configured. Using ${localDemoProject} for local emulators.`))
  }

  const args = [
    "emulators:start",
    "--config",
    "firebase.json",
    "--project",
    project || localDemoProject,
    ...forwardFlags(context, ["no-watch"]),
    ...context.args,
  ]

  try {
    await runRequired(firebase, args, { cwd: context.cwd, stdio: "inherit" })
  } finally {
    stopWatching()
  }
}
