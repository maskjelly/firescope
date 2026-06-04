import { join, resolve } from "node:path"
import { createJiti } from "jiti"
import { resolveConfig, type FirescopeConfig } from "../config.js"
import { loadEnv } from "../env.js"
import { pathExists } from "./fs.js"

const configFiles = [
  "firescope.config.ts",
  "firescope.config.mts",
  "firescope.config.js",
  "firescope.config.mjs",
  "firescope.config.cjs",
]

export async function findConfig(cwd: string): Promise<string | undefined> {
  for (const file of configFiles) {
    const candidate = join(cwd, file)
    if (await pathExists(candidate)) return candidate
  }

  return undefined
}

export async function loadConfig(cwd: string): Promise<Required<FirescopeConfig>> {
  const configPath = await findConfig(cwd)

  if (!configPath) {
    throw new Error(`No firescope config found in ${cwd}. Run firescope init first.`)
  }

  loadEnv({ cwd })

  const jiti = createJiti(resolve(cwd, "firescope.config.ts"), {
    interopDefault: true,
    moduleCache: false,
  })
  const loaded = await jiti.import(configPath, { default: true })

  return resolveConfig((loaded ?? {}) as FirescopeConfig)
}
