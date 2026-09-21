import { flagEnabled, flagString, forwardFlags } from "./args.js"
import { buildCommand } from "./build.js"
import { loadConfig } from "./config-loader.js"
import { FirescopeError } from "./errors.js"
import { color, log } from "./log.js"
import { resolveCommand, runRequired } from "./process.js"
import { confirm } from "./prompt.js"
import type { CliContext } from "./types.js"

export async function deployCommand(context: CliContext): Promise<void> {
  const firebase = resolveCommand("firebase", context.cwd)

  if (!firebase) {
    throw new FirescopeError(
      "firebase-tools is not installed for this app",
      "Run npm install (firebase-tools is a devDependency), or install it globally with npm install -g firebase-tools.",
    )
  }

  const config = await loadConfig(context.cwd)
  const project = flagString(context, "project") ?? config.project

  if (!project) {
    throw new FirescopeError(
      "No Firebase project configured",
      "Run firescope connect to select a project, or pass --project <id>.",
    )
  }

  if (!flagEnabled(context, "yes", "y") && !(await confirm(`Deploy to ${color.bold(project)}`, false))) {
    log.warn("Deploy cancelled.")
    return
  }

  log.step("Building functions")
  await buildCommand(context)

  const args = [
    "deploy",
    "--config",
    "firebase.json",
    "--project",
    project,
    ...forwardFlags(context, ["yes", "y", "project"]),
    ...context.args,
  ]

  await runRequired(firebase, args, { cwd: context.cwd, stdio: "inherit" })
  log.success(`Deployed to ${color.bold(project)}`)
}
