import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "dotenv"

let loadedKey = ""

export interface EnvOptions {
  fallback?: string
  optional?: boolean
}

export function loadEnv(options: { cwd?: string; mode?: string; override?: boolean } = {}): void {
  const cwd = options.cwd ?? process.cwd()
  const mode = options.mode ?? process.env.FIRESCOPE_ENV ?? process.env.NODE_ENV ?? "development"
  const key = `${cwd}:${mode}:${options.override ? "override" : "default"}`

  if (loadedKey === key) return

  const files = [".env", `.env.${mode}`, ".env.local", `.env.${mode}.local`]

  for (const file of files) {
    const fullPath = resolve(cwd, file)
    if (!existsSync(fullPath)) continue

    const values = parse(readFileSync(fullPath))
    for (const [name, value] of Object.entries(values)) {
      if (options.override || process.env[name] === undefined) {
        process.env[name] = value
      }
    }
  }

  loadedKey = key
}

export function env(name: string, options: EnvOptions = {}): string {
  loadEnv()

  const value = process.env[name] ?? options.fallback
  if (value === undefined && !options.optional) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value ?? ""
}

export function envInt(name: string, options: EnvOptions = {}): number {
  const value = env(name, options)
  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer`)
  }

  return parsed
}

export function envBool(name: string, options: EnvOptions = {}): boolean {
  const value = env(name, options).toLowerCase()

  if (["1", "true", "yes", "on"].includes(value)) return true
  if (["0", "false", "no", "off"].includes(value)) return false

  throw new Error(`Environment variable ${name} must be a boolean`)
}
