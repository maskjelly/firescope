import { existsSync } from "node:fs"
import { join } from "node:path"

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun"

export function detectPackageManager(cwd: string): PackageManager {
  const agent = process.env.npm_config_user_agent ?? ""

  if (agent.startsWith("pnpm")) return "pnpm"
  if (agent.startsWith("yarn")) return "yarn"
  if (agent.startsWith("bun")) return "bun"

  if (existsSync(join(cwd, "pnpm-lock.yaml"))) return "pnpm"
  if (existsSync(join(cwd, "yarn.lock"))) return "yarn"
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) return "bun"

  return "npm"
}

export function installCommand(packageManager: PackageManager): string {
  switch (packageManager) {
    case "pnpm":
      return "pnpm install"
    case "yarn":
      return "yarn"
    case "bun":
      return "bun install"
    default:
      return "npm install"
  }
}

export function runCommand(packageManager: PackageManager, script: string): string {
  switch (packageManager) {
    case "pnpm":
      return `pnpm ${script}`
    case "yarn":
      return `yarn ${script}`
    case "bun":
      return `bun run ${script}`
    default:
      return `npm run ${script}`
  }
}
