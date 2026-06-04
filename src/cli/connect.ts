import { join } from "node:path"
import { resolveConfig } from "../config.js"
import { createFirebaseJson, createFirebaserc } from "../generate/firebase-json.js"
import { findConfig, loadConfig } from "./config-loader.js"
import { pathExists, writeFileSafe, writeJson } from "./fs.js"
import { log } from "./log.js"
import { commandExists, run, runRequired } from "./process.js"
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
  if (!commandExists("firebase")) {
    throw new Error("firebase-tools is required. Run npm install in this app, or install it with: npm install -D firebase-tools")
  }

  if (!commandExists("gcloud")) {
    log.warn("gcloud was not found. Firescope can still write Firebase config, but cannot enable GCP APIs automatically.")
  }

  await ensureFirebaseLogin(context.cwd)
  if (commandExists("gcloud")) await ensureGcloudLogin(context.cwd)

  const project = await chooseProject(context.cwd)
  const existingConfig = (await findConfig(context.cwd)) ? await loadConfig(context.cwd) : resolveConfig({})
  const config = resolveConfig({ ...existingConfig, project })

  await writeProjectEnv(context.cwd, project)
  await writeJson(join(context.cwd, ".firebaserc"), createFirebaserc(project))
  await writeJson(join(context.cwd, "firebase.json"), createFirebaseJson(config))

  if (commandExists("gcloud") && (await confirm("Enable required GCP/Firebase APIs", true))) {
    await runRequired("gcloud", ["services", "enable", ...requiredApis, "--project", project], {
      cwd: context.cwd,
      stdio: "inherit",
    })
  }

  log.success(`Connected Firescope to Firebase project ${project}`)
}

async function ensureFirebaseLogin(cwd: string): Promise<void> {
  const result = await run("firebase", ["projects:list", "--json"], { cwd })
  if (result.code === 0) return

  log.info("Firebase login required.")
  await runRequired("firebase", ["login"], { cwd, stdio: "inherit" })
}

async function ensureGcloudLogin(cwd: string): Promise<void> {
  const result = await run("gcloud", ["auth", "list", "--filter=status:ACTIVE", "--format=value(account)"], { cwd })
  if (result.code === 0 && result.stdout.trim()) return

  log.info("GCP login required.")
  await runRequired("gcloud", ["auth", "login"], { cwd, stdio: "inherit" })
}

async function chooseProject(cwd: string): Promise<string> {
  const result = await run("firebase", ["projects:list", "--json"], { cwd })
  const projects = parseProjects(result.stdout)

  if (projects.length === 0) {
    return prompt("Firebase project id")
  }

  const choices = [...projects.map((project) => project.projectId), "Use another project id"]
  const choice = await select("Select Firebase project", choices)
  if (choice === "Use another project id") return prompt("Firebase project id")
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

async function writeProjectEnv(cwd: string, project: string): Promise<void> {
  const envPath = join(cwd, ".env.local")
  const current = (await pathExists(envPath)) ? await import("node:fs/promises").then((fs) => fs.readFile(envPath, "utf8")) : ""
  const lines = current
    .split("\n")
    .filter((line) => line && !line.startsWith("FIRESCOPE_PROJECT="))

  lines.push(`FIRESCOPE_PROJECT=${project}`)
  await writeFileSafe(envPath, `${lines.join("\n")}\n`)
}
