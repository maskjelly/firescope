import { spawn, spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { FirescopeError } from "./errors.js"

const isWindows = process.platform === "win32"

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

function localBin(command: string, cwd: string): string | undefined {
  const names = isWindows ? [`${command}.cmd`, `${command}.exe`, command] : [command]

  for (const name of names) {
    const candidate = join(cwd, "node_modules", ".bin", name)
    if (existsSync(candidate)) return candidate
  }

  return undefined
}

export function resolveCommand(command: string, cwd?: string): string | undefined {
  if (cwd) {
    const local = localBin(command, cwd)
    if (local) return local
  }

  const probe = spawnSync(command, ["--version"], { stdio: "ignore", shell: isWindows })
  return probe.status === 0 ? command : undefined
}

export function commandExists(command: string, cwd?: string): boolean {
  return resolveCommand(command, cwd) !== undefined
}

export function run(command: string, args: string[], options: RunOptions = {}): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      stdio: options.stdio === "inherit" ? "inherit" : "pipe",
      shell: isWindows,
    })

    let stdout = ""
    let stderr = ""

    child.stdout?.on("data", (chunk) => (stdout += String(chunk)))
    child.stderr?.on("data", (chunk) => (stderr += String(chunk)))

    child.on("error", (error) => reject(error))
    child.on("close", (code) => resolve({ code: code ?? 0, stdout, stderr }))
  })
}

export async function runRequired(command: string, args: string[], options: RunOptions = {}): Promise<void> {
  const result = await run(command, args, { stdio: "inherit", ...options })

  if (result.code !== 0) {
    throw new FirescopeError(
      `${command} ${args.join(" ")} exited with code ${result.code}`,
      "Run the underlying command directly to see the full output.",
    )
  }
}
