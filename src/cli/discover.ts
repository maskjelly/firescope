import { basename, dirname, extname, join, relative } from "node:path"
import { listFiles, toPosix } from "./fs.js"

export interface DiscoveredFunction {
  name: string
  file: string
  relativeFile: string
}

function toFunctionName(relativeFile: string): string {
  const withoutExt = relativeFile.slice(0, -extname(relativeFile).length)
  const parts = toPosix(withoutExt)
    .split("/")
    .filter((part) => part !== "index")

  const raw = parts
    .join("-")
    .replace(/[^a-zA-Z0-9]+(.)/g, (_match, char: string) => char.toUpperCase())
    .replace(/^[^a-zA-Z]+/, "")

  const name = raw ? raw[0].toLowerCase() + raw.slice(1) : basename(dirname(relativeFile))
  return name || "app"
}

export async function discoverFunctions(cwd: string, source: string): Promise<DiscoveredFunction[]> {
  const sourceRoot = join(cwd, source)
  const files = await listFiles(sourceRoot)
  const seen = new Map<string, string>()

  return files
    .filter((file) => shouldDiscoverFunction(toPosix(relative(sourceRoot, file))))
    .map((file) => {
      const relativeFile = toPosix(relative(sourceRoot, file))
      const name = toFunctionName(relativeFile)
      const existing = seen.get(name)

      if (existing) {
        throw new Error(`Duplicate function name "${name}" from ${existing} and ${relativeFile}`)
      }

      seen.set(name, relativeFile)
      return { name, file, relativeFile }
    })
}

function shouldDiscoverFunction(relativeFile: string): boolean {
  return !relativeFile.split("/").some((part) => part.startsWith("_"))
}
