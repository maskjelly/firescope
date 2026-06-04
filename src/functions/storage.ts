import {
  onObjectArchived,
  onObjectDeleted,
  onObjectFinalized,
  onObjectMetadataUpdated,
  type StorageOptions,
  type StorageEvent,
} from "firebase-functions/v2/storage"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

type StorageHandler = (context: FirescopeHandlerContext & { event: StorageEvent }) => unknown | Promise<unknown>
export type FirescopeStorageOptions = Omit<StorageOptions, "bucket">

function options(bucket: StorageOptions["bucket"] | undefined, extra: FirescopeStorageOptions): StorageOptions {
  return { region: runtimeRegion(), ...(bucket ? { bucket } : {}), ...extra }
}

export const storage = {
  object(bucket?: StorageOptions["bucket"]) {
    return {
      onFinalize(handler: StorageHandler, extra: FirescopeStorageOptions = {}) {
        return onObjectFinalized(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onDelete(handler: StorageHandler, extra: FirescopeStorageOptions = {}) {
        return onObjectDeleted(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onArchive(handler: StorageHandler, extra: FirescopeStorageOptions = {}) {
        return onObjectArchived(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onMetadataUpdate(handler: StorageHandler, extra: FirescopeStorageOptions = {}) {
        return onObjectMetadataUpdated(options(bucket, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
    }
  },
}
