import { relative, join, resolve } from "node:path"
import { createJiti } from "jiti"
import { resolveConfig, type FirescopeConfig } from "../config.js"
import { loadEnv } from "../env.js"
import { FirescopeError } from "./errors.js"
import { pathExists } from "./fs.js"
import { validateConfig } from "./validate-config.js"

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
    throw new FirescopeError(
      `No Firescope config found in ${cwd}`,
      "Run firescope init to scaffold an app, or run this command from your app directory.",
    )
  }

  loadEnv({ cwd })

  const jiti = createJiti(resolve(cwd, "firescope.config.ts"), {
    interopDefault: true,
    moduleCache: false,
  })

  let loaded: unknown

  try {
    loaded = await jiti.import(configPath, { default: true })
  } catch (error) {
    throw new FirescopeError(
      `Could not load ${relative(cwd, configPath)}: ${error instanceof Error ? error.message : String(error)}`,
      "Fix the error above, then run the command again.",
    )
  }

  const config = (loaded ?? {}) as FirescopeConfig
  validateConfig(config, relative(cwd, configPath))

  return resolveConfig(config)
}
