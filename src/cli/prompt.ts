import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

export async function prompt(question: string, fallback = ""): Promise<string> {
  const rl = createInterface({ input, output })

  try {
    const suffix = fallback ? ` (${fallback})` : ""
    const answer = await rl.question(`${question}${suffix}: `)
    return answer.trim() || fallback
  } finally {
    rl.close()
  }
}

export async function confirm(question: string, fallback = true): Promise<boolean> {
  const marker = fallback ? "Y/n" : "y/N"
  const answer = (await prompt(`${question} [${marker}]`)).toLowerCase()
  if (!answer) return fallback
  return ["y", "yes", "true", "1"].includes(answer)
}

export async function select(question: string, choices: string[]): Promise<string> {
  if (choices.length === 0) throw new Error("No choices available")

  console.log(question)
  choices.forEach((choice, index) => console.log(`${index + 1}. ${choice}`))

  while (true) {
    const answer = await prompt("Choose", "1")
    const index = Number.parseInt(answer, 10) - 1
    if (choices[index]) return choices[index]
    console.log("Invalid choice. Try again.")
  }
}
