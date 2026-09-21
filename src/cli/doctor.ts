import { createServer } from "node:net"
import { join } from "node:path"
import type { FirescopeConfig } from "../config.js"
import { flagEnabled } from "./args.js"
import { findConfig, loadConfig } from "./config-loader.js"
import { discoverFunctions } from "./discover.js"
import { FirescopeError } from "./errors.js"
import { pathExists } from "./fs.js"
import { color, log } from "./log.js"
import { resolveCommand, run } from "./process.js"
import type { CliContext } from "./types.js"

interface Check {
  label: string
  status: "pass" | "fail" | "warn"
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()
    server.once("error", () => resolve(true))
    server.once("listening", () => server.close(() => resolve(false)))
    server.listen(port, "127.0.0.1")
  })
}

export async function doctorCommand(context: CliContext): Promise<void> {
  const checks: Check[] = []
  const add = (status: Check["status"], label: string) => checks.push({ label, status })
  const strict = flagEnabled(context, "strict")

  const nodeMajor = Number(process.versions.node.split(".")[0])
  add(nodeMajor >= 22 ? "pass" : "fail", `Node ${process.versions.node} (>= 22 required)`)

  const configPath = await findConfig(context.cwd)
  add(
    configPath ? "pass" : "fail",
    configPath ? `config: ${configPath.replace(`${context.cwd}/`, "")}` : "firescope config",
  )

  let config: Required<FirescopeConfig> | undefined

  try {
    config = await loadConfig(context.cwd)
    add("pass", "config is valid")
  } catch (error) {
    add("fail", error instanceof Error ? error.message : String(error))
  }

  if (config) {
    const source = config.functions.source ?? "src/functions"
    const sourceExists = await pathExists(join(context.cwd, source))

    add(sourceExists ? "pass" : "fail", `functions source: ${source}`)

    if (sourceExists) {
      const functions = await discoverFunctions(context.cwd, source, config.functions.ignore ?? [])
      add(functions.length > 0 ? "pass" : "fail", `functions discovered: ${functions.length}`)
    }

    add(
      config.project ? "pass" : "warn",
      config.project ? `project: ${config.project}` : "no project configured (run firescope connect)",
    )

    if (config.firestore !== false) {
      const rules = config.firestore.rules ?? "firestore.rules"
      add((await pathExists(join(context.cwd, rules))) ? "pass" : "warn", `firestore rules: ${rules}`)
    }

    if (config.storage !== false) {
      const rules = config.storage.rules ?? "storage.rules"
      add((await pathExists(join(context.cwd, rules))) ? "pass" : "warn", `storage rules: ${rules}`)
    }

    if (config.hosting !== false) {
      const publicDir = config.hosting.public ?? "public"
      add((await pathExists(join(context.cwd, publicDir))) ? "pass" : "warn", `hosting public dir: ${publicDir}`)
    }
  }

  const firebase = resolveCommand("firebase", context.cwd)
  add(firebase ? "pass" : "fail", firebase ? "firebase-tools available" : "firebase-tools missing (run npm install)")

  if (firebase && config?.project) {
    const result = await run(firebase, ["projects:list", "--json"], { cwd: context.cwd })
    add(result.code === 0 ? "pass" : "warn", result.code === 0 ? "firebase authenticated" : "firebase authentication")
  }

  const gcloud = resolveCommand("gcloud", context.cwd)
  add(gcloud ? "pass" : "warn", gcloud ? "gcloud available" : "gcloud missing (optional, needed to enable APIs)")

  if (config) {
    const ports = Object.entries(config.emulators)
      .filter((entry): entry is [string, number] => typeof entry[1] === "number")
      .map(([service, port]) => ({ service, port }))
    const availability = await Promise.all(ports.map((entry) => portInUse(entry.port)))
    const busy = ports.filter((_, index) => availability[index]).map((entry) => `${entry.service}:${entry.port}`)
    add(
      busy.length === 0 ? "pass" : "warn",
      busy.length === 0 ? "emulator ports available" : `emulator ports in use: ${busy.join(", ")}`,
    )
  }

  log.blank()

  for (const check of checks) {
    if (check.status === "pass") log.pass(check.label)
    else if (check.status === "fail") log.fail(check.label)
    else log.skip(check.label)
  }

  const failures = checks.filter((check) => check.status === "fail").length
  const warnings = checks.filter((check) => check.status === "warn").length

  log.blank()

  if (failures > 0) {
    throw new FirescopeError(
      `Doctor found ${failures} problem${failures === 1 ? "" : "s"}`,
      "Fix the failing checks above, then run firescope doctor again.",
    )
  }

  if (strict && warnings > 0) {
    throw new FirescopeError(`Doctor found ${warnings} warning${warnings === 1 ? "" : "s"} in strict mode`)
  }

  log.success(
    warnings > 0
      ? `Setup is ready (${color.yellow(`${warnings} optional warning${warnings === 1 ? "" : "s"}`)})`
      : "Setup is ready",
  )
}
