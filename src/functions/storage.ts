import {
  onObjectArchived,
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
  type StorageEvent,
} from "firebase-functions/v2/storage"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

type StorageHandler = (context: FirescopeHandlerContext & { event: StorageEvent }) => unknown | Promise<unknown>

function options(bucket: string | undefined, extra: Record<string, unknown>) {
  return { region: runtimeRegion(), ...(bucket ? { bucket } : {}), ...extra }
}

export const storage = {
  object(bucket?: string) {
    return {
      onFinalize(handler: StorageHandler, extra: Record<string, unknown> = {}) {
        return onObjectFinalized(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onDelete(handler: StorageHandler, extra: Record<string, unknown> = {}) {
        return onObjectDeleted(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onArchive(handler: StorageHandler, extra: Record<string, unknown> = {}) {
        return onObjectArchived(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onMetadataUpdate(handler: StorageHandler, extra: Record<string, unknown> = {}) {
        return onObjectMetadataUpdated(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
    }
  },
}
