import { join } from "node:path"
import { loadConfig } from "./config-loader.js"
import { discoverFunctions } from "./discover.js"
import { fileSize, pathExists } from "./fs.js"
import { log } from "./log.js"
import { commandExists, run } from "./process.js"
import type { CliContext } from "./types.js"

export async function doctorCommand(context: CliContext): Promise<void> {
  const checks: string[] = []
  let failures = 0

  function check(ok: boolean, message: string) {
    checks.push(`${ok ? "OK" : "FAIL"} ${message}`)
    if (!ok) failures += 1
  }

  check(commandExists("firebase"), "firebase-tools available")
  check(commandExists("gcloud"), "gcloud available")
  check(await pathExists(join(context.cwd, "firescope.config.ts")) || await pathExists(join(context.cwd, "firescope.config.mjs")), "firescope config exists")

  let project = ""
  try {
    const config = await loadConfig(context.cwd)
    project = config.project
    const source = config.functions.source ?? "src/functions"
    const functions = await discoverFunctions(context.cwd, source)

    check(Boolean(config.region), "region configured")
    check(Boolean(config.runtime), "runtime configured")
    check(await pathExists(join(context.cwd, source)), `functions source exists: ${source}`)
    check(functions.length > 0, `functions discovered: ${functions.length}`)
  } catch (error) {
    check(false, error instanceof Error ? error.message : String(error))
  }

  if (project && commandExists("firebase")) {
    const result = await run("firebase", ["projects:list", "--json"], { cwd: context.cwd })
    check(result.code === 0, "firebase authenticated")
  }

  if (await pathExists(join(context.cwd, ".env.local"))) {
    check((await fileSize(join(context.cwd, ".env.local"))) >= 0, ".env.local readable")
  }

  checks.forEach((line) => log.info(line))

  if (failures > 0) {
    throw new Error(`Doctor found ${failures} problem${failures === 1 ? "" : "s"}`)
  }

  log.success("Firescope doctor passed")
}
