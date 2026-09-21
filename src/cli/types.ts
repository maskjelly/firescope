export interface CliContext {
  cwd: string
  args: string[]
  flags: Map<string, string | boolean>
  raw: string[]
}

export interface CliFlagHelp {
  name: string
  description: string
}

export interface CliCommand {
  description: string
  usage: string
  flags: CliFlagHelp[]
  run(context: CliContext): Promise<unknown>
}
