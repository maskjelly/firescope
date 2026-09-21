export class FirescopeError extends Error {
  readonly hint?: string

  constructor(message: string, hint?: string) {
    super(message)
    this.name = "FirescopeError"
    this.hint = hint
  }
}

export function fail(message: string, hint?: string): never {
  throw new FirescopeError(message, hint)
}
