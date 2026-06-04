import { onCall, type CallableOptions, type CallableRequest } from "firebase-functions/v2/https"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

export interface CallableContext<T = unknown> extends FirescopeHandlerContext {
  request: CallableRequest<T>
  data: T
  auth: CallableRequest<T>["auth"]
}

export type CallableHandler<T = unknown, Result = unknown> = (
  context: CallableContext<T>,
) => Result | Promise<Result>

export function callable<T = unknown, Result = unknown>(
  handler: CallableHandler<T, Result>,
  options: CallableOptions<T> = {},
) {
  return onCall<T>({ region: runtimeRegion(), ...options }, async (request) => {
    return handler({ ...baseContext(), request, data: request.data, auth: request.auth })
  })
}

export type { CallableOptions }
