import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { parse } from "dotenv"

const loadedKeys = new Set<string>()

export interface EnvOptions {
  fallback?: string
  optional?: boolean
}

export function loadEnv(options: { cwd?: string; mode?: string; override?: boolean } = {}): void {
  const cwd = options.cwd ?? process.cwd()
  const mode = options.mode ?? process.env.FIRESCOPE_ENV ?? process.env.NODE_ENV ?? "development"
  const key = `${cwd}:${mode}:${options.override ? "override" : "default"}`

  if (loadedKeys.has(key)) return
  loadedKeys.add(key)

  const files = [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`]
  const values: Record<string, string> = {}

  for (const file of files) {
    const fullPath = resolve(cwd, file)
    if (!existsSync(fullPath)) continue

    Object.assign(values, parse(readFileSync(fullPath)))
  }

  for (const [name, value] of Object.entries(values)) {
    if (options.override || process.env[name] === undefined) {
      process.env[name] = value
    }
  }
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
  const value = env(name, options).trim()

  if (!/^-?\d+$/.test(value)) {
    throw new Error(`Environment variable ${name} must be an integer (received "${value}")`)
  }

  return Number.parseInt(value, 10)
}

export function envBool(name: string, options: EnvOptions = {}): boolean {
  const value = env(name, options).trim().toLowerCase()

  if (["1", "true", "yes", "on"].includes(value)) return true
  if (["0", "false", "no", "off"].includes(value)) return false

  throw new Error(
    `Environment variable ${name} must be a boolean: 1, true, yes, on, 0, false, no, or off (received "${value}")`,
  )
}
