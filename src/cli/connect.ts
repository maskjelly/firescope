import { join } from "node:path"
import { resolveConfig } from "../config.js"
import { createFirebaseJson, createFirebaserc } from "../generate/firebase-json.js"
import { flagEnabled, flagString } from "./args.js"
import { findConfig, loadConfig } from "./config-loader.js"
import { FirescopeError } from "./errors.js"
import { writeEnvValue, writeJson } from "./fs.js"
import { color, log } from "./log.js"
import { resolveCommand, run, runRequired } from "./process.js"
import { confirm, prompt, select } from "./prompt.js"
import type { CliContext } from "./types.js"

const requiredApis = [
  "cloudfunctions.googleapis.com",
  "cloudbuild.googleapis.com",
  "artifactregistry.googleapis.com",
  "firebase.googleapis.com",
  "firestore.googleapis.com",
  "identitytoolkit.googleapis.com",
  "firebasestorage.googleapis.com",
  "run.googleapis.com",
  "eventarc.googleapis.com",
  "pubsub.googleapis.com",
]

export async function connectCommand(context: CliContext): Promise<void> {
  const firebase = resolveCommand("firebase", context.cwd)

  if (!firebase) {
    throw new FirescopeError(
      "firebase-tools is not installed for this app",
      "Run npm install (firebase-tools is a devDependency), or install it globally with npm install -g firebase-tools.",
    )
  }

  const gcloud = resolveCommand("gcloud", context.cwd)
  if (!gcloud) {
    log.warn(
      "gcloud was not found. Firescope can still write Firebase config, but cannot enable GCP APIs automatically.",
    )
  }

  const projects = flagString(context, "project") ? [] : await ensureFirebaseLogin(firebase, context.cwd)
  if (gcloud) await ensureGcloudLogin(gcloud, context.cwd)

  const requested = flagString(context, "project")
  const project = requested ?? (await chooseProject(projects))

  log.step(`Writing project configuration`)
  const existing = (await findConfig(context.cwd)) ? await loadConfig(context.cwd) : resolveConfig({})
  const config = resolveConfig({ ...existing, project })

  await writeEnvValue(join(context.cwd, ".env.local"), "FIRESCOPE_PROJECT", project)
  await writeJson(join(context.cwd, ".firebaserc"), createFirebaserc(project))
  await writeJson(join(context.cwd, "firebase.json"), createFirebaseJson(config))

  if (gcloud && !flagEnabled(context, "no-enable-apis") && (await confirm("Enable required GCP/Firebase APIs", true))) {
    log.step("Enabling required GCP/Firebase APIs")
    await runRequired(gcloud, ["services", "enable", ...requiredApis, "--project", project], {
      cwd: context.cwd,
      stdio: "inherit",
    })
  }

  log.blank()
  log.success(`Connected to Firebase project ${color.bold(project)}`)
  log.hint("Next: npm run dev to use the emulators, or npm run deploy to ship.")
}

async function ensureFirebaseLogin(firebase: string, cwd: string): Promise<Array<{ projectId: string }>> {
  const result = await run(firebase, ["projects:list", "--json"], { cwd })
  if (result.code === 0) return parseProjects(result.stdout)

  log.info("Firebase login required.")
  await runRequired(firebase, ["login"], { cwd, stdio: "inherit" })

  const retry = await run(firebase, ["projects:list", "--json"], { cwd })
  return parseProjects(retry.stdout)
}

async function ensureGcloudLogin(gcloud: string, cwd: string): Promise<void> {
  const result = await run(gcloud, ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"], { cwd })
  if (result.code === 0 && result.stdout.trim()) return

  log.info("GCP login required.")
  await runRequired(gcloud, ["auth", "login"], { cwd, stdio: "inherit" })
}

async function chooseProject(projects: Array<{ projectId: string }>): Promise<string> {
  if (projects.length === 0) {
    return prompt("Firebase project id", { hint: "Pass --project <id> to skip this prompt." })
  }

  const choices = [...projects.map((project) => project.projectId), "Use another project id"]
  const choice = await select("Select Firebase project", choices)
  if (choice === "Use another project id") {
    return prompt("Firebase project id", { hint: "Pass --project <id> to skip this prompt." })
  }

  return choice
}

function parseProjects(output: string): Array<{ projectId: string }> {
  try {
    const parsed = JSON.parse(output) as { result?: Array<{ projectId: string }> }
    return parsed.result?.filter((project) => project.projectId) ?? []
  } catch {
    return []
  }
}
