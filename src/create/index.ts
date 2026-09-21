#!/usr/bin/env node
import { parseArgs } from "../cli/args.js"
import { FirescopeError } from "../cli/errors.js"
import { initCommand } from "../cli/init.js"
import { color, log } from "../cli/log.js"
import { prompt } from "../cli/prompt.js"
import { version } from "../version.js"

async function main(): Promise<void> {
  const context = parseArgs(process.argv.slice(2))

  if (context.flags.has("version") || context.flags.has("v")) {
    log.plain(version)
    return
  }

  if (context.flags.has("help") || context.flags.has("h")) {
    console.log(`${color.bold("create-firescope")} [dir]\n\nScaffold a new Firescope app.`)
    console.log("\nFlags:\n  --name <name>   Package name (defaults to the directory name)")
    console.log("  --project <id>  Write a Firebase project id to .env.local")
    console.log("  --yes, -y       Accept defaults for every prompt")
    return
  }

  if (context.args.length === 0) {
    const directory = await prompt("Project directory", {
      default: "my-firescope-app",
      hint: "Run npx create-firescope <dir> to skip this prompt.",
    })
    context.args.push(directory)
  }

  await initCommand(context)
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
