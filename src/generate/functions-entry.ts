import { dirname } from "node:path"
import type { FirescopeFunctionsConfig } from "../config.js"
import type { DiscoveredFunction } from "../cli/discover.js"
import { relativePosix } from "../cli/fs.js"

export interface FunctionsEntryOptions {
  functions?: FirescopeFunctionsConfig
}

function globalOptions(config: FirescopeFunctionsConfig): Record<string, unknown> {
  const options: Record<string, unknown> = {}

  if (config.memory) options.memory = config.memory
  if (config.timeoutSeconds !== undefined) options.timeoutSeconds = config.timeoutSeconds
  if (config.minInstances !== undefined) options.minInstances = config.minInstances
  if (config.maxInstances !== undefined) options.maxInstances = config.maxInstances
  if (config.secrets?.length) options.secrets = config.secrets

  return options
}

export function createFunctionsEntry(
  functions: DiscoveredFunction[],
  entryPath: string,
  options: FunctionsEntryOptions = {},
): string {
  const lines: string[] = []
  const defaults = globalOptions(options.functions ?? {})

  if (Object.keys(defaults).length > 0) {
    lines.push('import { setGlobalOptions } from "firebase-functions/v2"')
    lines.push(`setGlobalOptions(${JSON.stringify(defaults, null, 2)})`)
    lines.push("")
  }

  if (functions.length === 0) {
    lines.push("export {}")
    return `${lines.join("\n")}\n`
  }

  for (const fn of functions) {
    let importPath = relativePosix(dirname(entryPath), fn.file)
    if (!importPath.startsWith(".")) importPath = `./${importPath}`
    lines.push(`export { default as ${fn.name} } from ${JSON.stringify(importPath)};`)
  }

  return `${lines.join("\n")}\n`
}
