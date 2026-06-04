import { dirname } from "node:path"
import type { DiscoveredFunction } from "../cli/discover.js"
import { relativePosix } from "../cli/fs.js"

export function createFunctionsEntry(functions: DiscoveredFunction[], entryPath: string): string {
  if (functions.length === 0) {
    return "export {}\n"
  }

  return functions
    .map((fn) => {
      let importPath = relativePosix(dirname(entryPath), fn.file)
      if (!importPath.startsWith(".")) importPath = `./${importPath}`
      return `export { default as ${fn.name} } from ${JSON.stringify(importPath)};`
    })
    .join("\n") + "\n"
}
