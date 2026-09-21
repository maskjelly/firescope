import { resolve } from "node:path"
import type { CliContext } from "./types.js"

export function parseArgs(argv: string[]): CliContext {
  const args: string[] = []
  const flags = new Map<string, string | boolean>()
  let cwd = resolve(process.cwd())
  let passthrough = false

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]

    if (passthrough) {
      args.push(value)
      continue
    }

    if (value === "--") {
      passthrough = true
      continue
    }

    if (value.startsWith("-") && !value.startsWith("--") && value.length > 1) {
      for (const short of value.slice(1)) flags.set(short, true)
      continue
    }

    if (!value.startsWith("--")) {
      args.push(value)
      continue
    }

    const [rawName, inlineValue] = value.slice(2).split("=", 2)
    const next = argv[index + 1]
    const nextValue = inlineValue ?? (next !== undefined && !next.startsWith("-") ? next : undefined)
    const flagValue = nextValue ?? true

    if (inlineValue === undefined && typeof flagValue === "string") index += 1
    flags.set(rawName, flagValue)

    if (rawName === "cwd" && typeof flagValue === "string") cwd = resolve(flagValue)
  }

  return { cwd, args, flags, raw: argv }
}

export function flagString(context: CliContext, name: string): string | undefined {
  const value = context.flags.get(name)
  return typeof value === "string" && value.length > 0 ? value : undefined
}

export function flagEnabled(context: CliContext, ...names: string[]): boolean {
  return names.some((name) => {
    const value = context.flags.get(name)
    return value === true || value === "true"
  })
}

const globalFlags = ["cwd", "help", "h", "version", "v", "yes", "y", "project"]

export function forwardFlags(context: CliContext, known: string[]): string[] {
  const forwarded: string[] = []

  for (const [name, value] of context.flags) {
    if (globalFlags.includes(name) || known.includes(name)) continue
    if (value === true) forwarded.push(`--${name}`)
    else if (value === false) continue
    else forwarded.push(`--${name}=${value}`)
  }

  return forwarded
}
