import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
  onDocumentWritten,
  type FirestoreEvent,
  type QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

type FirestoreHandler<Event> = (context: FirescopeHandlerContext & { event: Event }) => unknown | Promise<unknown>

function options(document: string, extra: Record<string, unknown>) {
  return { region: runtimeRegion(), document, ...extra }
}

export const firestore = {
  document(document: string) {
    return {
      onCreate(handler: FirestoreHandler<FirestoreEvent<QueryDocumentSnapshot | undefined>>, extra: Record<string, unknown> = {}) {
        return onDocumentCreated(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onUpdate(handler: FirestoreHandler<FirestoreEvent<unknown>>, extra: Record<string, unknown> = {}) {
        return onDocumentUpdated(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onDelete(handler: FirestoreHandler<FirestoreEvent<QueryDocumentSnapshot | undefined>>, extra: Record<string, unknown> = {}) {
        return onDocumentDeleted(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
      onWrite(handler: FirestoreHandler<FirestoreEvent<unknown>>, extra: Record<string, unknown> = {}) {
        return onDocumentWritten(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event })
        })
      },
    }
  },
}
