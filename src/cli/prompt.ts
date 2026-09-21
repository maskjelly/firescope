import { stdin as input, stdout as output } from "node:process"
import { createInterface } from "node:readline/promises"
import { FirescopeError } from "./errors.js"
import { color, log } from "./log.js"

export function isInteractive(): boolean {
  return input.isTTY === true && output.isTTY === true && process.env.CI === undefined
}

export interface PromptOptions {
  default?: string
  hint?: string
}

export async function prompt(question: string, options: PromptOptions = {}): Promise<string> {
  const fallback = options.default ?? ""

  if (!isInteractive()) {
    if (fallback) {
      log.info(`${question}: ${fallback}`)
      return fallback
    }

    throw new FirescopeError(
      `Missing required input: ${question}`,
      options.hint ?? "Run this command in an interactive terminal or pass the matching flag.",
    )
  }

  const rl = createInterface({ input, output })
  const onSigint = () => {
    rl.close()
    log.blank()
    process.exit(130)
  }

  process.once("SIGINT", onSigint)

  try {
    const suffix = fallback ? ` (${fallback})` : ""
    const answer = await rl.question(`${question}${suffix}: `)
    return answer.trim() || fallback
  } finally {
    process.removeListener("SIGINT", onSigint)
    rl.close()
  }
}

export async function confirm(question: string, fallback = true): Promise<boolean> {
  if (!isInteractive()) return fallback

  const marker = fallback ? "Y/n" : "y/N"
  const answer = (await prompt(`${question} [${marker}]`)).toLowerCase()
  if (!answer) return fallback

  return ["y", "yes", "true", "1"].includes(answer)
}

export async function select(
  question: string,
  choices: string[],
  options: { defaultIndex?: number } = {},
): Promise<string> {
  if (choices.length === 0) throw new FirescopeError("No choices available")
  if (!isInteractive()) return choices[options.defaultIndex ?? 0]

  log.plain(question)
  choices.forEach((choice, index) => log.plain(`  ${color.orange(String(index + 1))}. ${choice}`))

  while (true) {
    const answer = await prompt("Choose", { default: String((options.defaultIndex ?? 0) + 1) })
    const index = Number.parseInt(answer, 10) - 1
    if (choices[index]) return choices[index]
    log.warn("Invalid choice. Try again.")
  }
}
