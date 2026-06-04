import { onSchedule, type ScheduledEvent } from "firebase-functions/v2/scheduler"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

export interface ScheduleContext extends FirescopeHandlerContext {
  event: ScheduledEvent
}

export type ScheduleHandler = (context: ScheduleContext) => unknown | Promise<unknown>

export function schedule(expression: string, handler: ScheduleHandler, options: Record<string, unknown> = {}) {
  return onSchedule({ region: runtimeRegion(), schedule: expression, ...options }, async (event) => {
    await handler({ ...baseContext(), event })
  })
}
