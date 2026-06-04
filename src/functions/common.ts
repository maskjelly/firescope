import { env } from "../env.js"
import { getScope, type FirescopeScope } from "../scope.js"

export interface FirescopeHandlerContext {
  scope: FirescopeScope
  env: typeof env
}

export function baseContext(): FirescopeHandlerContext {
  return {
    scope: getScope(),
    env,
  }
}

export function runtimeRegion(): string {
  return process.env.FIRESCOPE_REGION ?? "us-central1"
}
