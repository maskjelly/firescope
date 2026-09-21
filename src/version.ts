import { readFileSync } from "node:fs"

function readVersion(): string {
  try {
    const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
      version?: string
    }
    return packageJson.version ?? "0.0.0"
  } catch {
    return "0.0.0"
  }
}

export const version = readVersion()
