#!/usr/bin/env node
import { buildCommand } from "./build.js"
import { connectCommand } from "./connect.js"
import { deployCommand } from "./deploy.js"
import { devCommand } from "./dev.js"
import { doctorCommand } from "./doctor.js"
import { initCommand } from "./init.js"
import { log } from "./log.js"
import { resolve } from "node:path"
import type { CliCommand, CliContext } from "./types.js"

const commands: Record<string, CliCommand> = {
  init: initCommand,
  connect: connectCommand,
  build: buildCommand,
  dev: devCommand,
  deploy: deployCommand,
  doctor: doctorCommand,
}

async function main() {
  const context = parseContext(process.argv.slice(2))
  const commandName = context.args.shift() ?? "help"

  if (commandName === "help" || commandName === "--help" || commandName === "-h") {
    printHelp()
    return
  }

  if (commandName === "version" || commandName === "--version" || commandName === "-v") {
    console.log("0.1.1")
    return
  }

  const command = commands[commandName]
  if (!command) {
    throw new Error(`Unknown command: ${commandName}`)
  }

  await command(context)
}

function parseContext(argv: string[]): CliContext {
  const args: string[] = []
  const flags = new Map<string, string | boolean>()
  let cwd = resolve(process.cwd())

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index]
    if (!value.startsWith("--")) {
      args.push(value)
      continue
    }

    const [rawName, inlineValue] = value.slice(2).split("=", 2)
    const nextValue = inlineValue ?? (argv[index + 1]?.startsWith("-") ? undefined : argv[index + 1])
    const flagValue = nextValue ?? true

    if (inlineValue === undefined && typeof flagValue === "string") index += 1
    flags.set(rawName, flagValue)
    if (rawName === "cwd" && typeof flagValue === "string") cwd = resolve(flagValue)
  }

  return { cwd, args, flags }
}

function printHelp() {
  console.log(`Firescope\n\nUsage:\n  firescope init [dir]\n  firescope connect\n  firescope dev\n  firescope build\n  firescope deploy [--yes]\n  firescope doctor\n\nFlags:\n  --cwd <dir>  Run in a different project directory\n`)
}

main().catch((error) => {
  log.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
