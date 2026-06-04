import { onRequest, type HttpsOptions, type Request } from "firebase-functions/v2/https"
import type { Response } from "express"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

export interface HttpContext extends FirescopeHandlerContext {
  req: Request
  res: Response
}

export type HttpHandler = (context: HttpContext) => unknown | Promise<unknown>

export function http(handler: HttpHandler, options: HttpsOptions = {}) {
  return onRequest({ region: runtimeRegion(), ...options }, async (req, res) => {
    await handler({ ...baseContext(), req, res })
  })
}

export type { HttpsOptions as HttpOptions }
