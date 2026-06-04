import { spawn, spawnSync } from "node:child_process"

export interface RunOptions {
  cwd?: string
  stdio?: "inherit" | "pipe"
  env?: NodeJS.ProcessEnv
}

export interface RunResult {
  code: number
  stdout: string
  stderr: string
}

export function commandExists(command: string): boolean {
  const result = spawnSync(command, ["--version"], { stdio: "ignore" })
  return result.status === 0
}

export function run(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stdio === "inherit" ? "inherit" : "pipe",
    })

    let stdout = ""
    let stderr = ""

    if (child.stdout) child.stdout.on("data", (chunk) => (stdout += String(chunk)))
    if (child.stderr) child.stderr.on("data", (chunk) => (stderr += String(chunk)))

    child.on("close", (code) => {
      resolve({ code: code ?? 0, stdout, stderr })
    })
  })
}

export async function runRequired(command: string, args: string[], options: RunOptions = {}): Promise<void> {
  const result = await run(command, args, { ...options, stdio: options.stdio ?? "inherit" })
  if (result.code !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.code}`)
  }
}
