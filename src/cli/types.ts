export interface CliContext {
  cwd: string
  args: string[]
  flags: Map<string, string | boolean>
}

export type CliCommand = (context: CliContext) => Promise<void>
