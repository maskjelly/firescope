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
    const result = await handler({ ...baseContext(), req, res })

    if (result !== undefined && !res.headersSent && !res.writableEnded) {
      res.json(result)
    }
  })
}

export type { HttpsOptions as HttpOptions }
