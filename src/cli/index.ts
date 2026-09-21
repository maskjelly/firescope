#!/usr/bin/env node
import { version } from "../version.js"
import { parseArgs } from "./args.js"
import { buildCommand } from "./build.js"
import { connectCommand } from "./connect.js"
import { deployCommand } from "./deploy.js"
import { devCommand } from "./dev.js"
import { doctorCommand } from "./doctor.js"
import { FirescopeError } from "./errors.js"
import { initCommand } from "./init.js"
import { color, log } from "./log.js"
import { closestMatch } from "./suggest.js"
import type { CliCommand } from "./types.js"

const minimumNodeMajor = 22

const commands: Record<string, CliCommand> = {
  init: {
    description: "Scaffold a new Firescope app",
    usage: "firescope init [dir]",
    flags: [
      { name: "--name <name>", description: "Package name (defaults to the directory name)" },
      { name: "--project <id>", description: "Write a Firebase project id to .env.local" },
      { name: "--yes, -y", description: "Accept defaults for every prompt" },
    ],
    run: initCommand,
  },
  connect: {
    description: "Connect the app to a Firebase project",
    usage: "firescope connect",
    flags: [
      { name: "--project <id>", description: "Use this project instead of selecting one" },
      { name: "--no-enable-apis", description: "Skip enabling required GCP/Firebase APIs" },
    ],
    run: connectCommand,
  },
  build: {
    description: "Generate the Firebase-compatible deploy output",
    usage: "firescope build",
    flags: [],
    run: buildCommand,
  },
  dev: {
    description: "Build, watch, and start the Firebase emulators",
    usage: "firescope dev",
    flags: [{ name: "--no-watch", description: "Disable rebuilds on file changes" }],
    run: devCommand,
  },
  deploy: {
    description: "Build and deploy the app to Firebase",
    usage: "firescope deploy",
    flags: [
      { name: "--project <id>", description: "Deploy to this project instead of the configured one" },
      { name: "--yes, -y", description: "Skip the deploy confirmation" },
    ],
    run: deployCommand,
  },
  doctor: {
    description: "Check that the local setup is ready",
    usage: "firescope doctor",
    flags: [{ name: "--strict", description: "Treat optional warnings as failures" }],
    run: doctorCommand,
  },
}

async function main(): Promise<void> {
  const context = parseArgs(process.argv.slice(2))
  const commandName = context.args.shift() ?? "help"

  if (context.flags.has("version") || context.flags.has("v") || commandName === "-v") {
    log.plain(version)
    return
  }

  if (context.flags.has("help") || context.flags.has("h") || commandName === "-h") {
    printHelp(context.args[0])
    return
  }

  if (commandName === "help") {
    printHelp(context.args[0])
    return
  }

  const command = commands[commandName]

  if (!command) {
    const suggestion = closestMatch(commandName, Object.keys(commands))
    throw new FirescopeError(
      `Unknown command: ${commandName}`,
      suggestion
        ? `Did you mean "firescope ${suggestion}"? Run firescope help to list commands.`
        : "Run firescope help to list commands.",
    )
  }

  await command.run(context)
}

function printHelp(commandName?: string): void {
  if (commandName) {
    const command = commands[commandName]
    if (!command) {
      const suggestion = closestMatch(commandName, Object.keys(commands))
      throw new FirescopeError(
        `Unknown command: ${commandName}`,
        suggestion ? `Did you mean "firescope ${suggestion}"?` : "Run firescope help to list commands.",
      )
    }

    console.log(`${color.bold(command.usage)}\n\n${command.description}\n`)
    if (command.flags.length > 0) {
      console.log("Flags:")
      for (const flag of command.flags) {
        console.log(`  ${flag.name.padEnd(24)} ${flag.description}`)
      }
      console.log("")
    }
    console.log(`Global flags:\n  ${"--cwd <dir>".padEnd(24)} Run in a different project directory`)
    return
  }

  console.log(`${color.bold(`Firescope ${version}`)} — Firebase apps with a clear shape\n`)
  console.log("Usage: firescope <command> [options]\n")
  console.log("Commands:")

  for (const [name, command] of Object.entries(commands)) {
    console.log(`  ${color.orange(name.padEnd(10))} ${command.description}`)
  }

  console.log("\nGlobal flags:")
  console.log(`  ${"--cwd <dir>".padEnd(24)} Run in a different project directory`)
  console.log(`  ${"--help, -h".padEnd(24)} Show help`)
  console.log(`  ${"--version, -v".padEnd(24)} Show the CLI version`)
  console.log("\nRun firescope <command> --help for command-specific flags.")
}

const nodeMajor = Number(process.versions.node.split(".")[0])

if (nodeMajor < minimumNodeMajor) {
  log.error(`Firescope requires Node ${minimumNodeMajor} or newer. You are running Node ${process.versions.node}.`)
  log.hint("Install a newer Node release from https://nodejs.org and try again.")
  process.exit(1)
}

main().catch((error: unknown) => {
  if (error instanceof FirescopeError) {
    log.error(error.message)
    if (error.hint) log.hint(error.hint)
  } else if (error instanceof Error) {
    log.error(error.message)
    if (process.env.FIRESCOPE_DEBUG) console.error(error.stack)
  } else {
    log.error(String(error))
  }

  process.exitCode = 1
})
