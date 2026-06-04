import {
  onDocumentCreated,
  onDocumentDeleted,
  onDocumentUpdated,
  onDocumentWritten,
  type Change,
  type DocumentOptions,
  type DocumentSnapshot,
  type FirestoreEvent,
  type QueryDocumentSnapshot,
} from "firebase-functions/v2/firestore"
import type { PathParams } from "../path.js"
import { baseContext, runtimeRegion, type FirescopeHandlerContext } from "./common.js"

type FirestoreHandler<Event> = (context: FirescopeHandlerContext & { event: Event }) => unknown | Promise<unknown>
export type FirescopeFirestoreOptions<Document extends string> = Omit<DocumentOptions<Document>, "document">
export type FirestoreCreateEvent<Document extends string> = FirestoreEvent<
  QueryDocumentSnapshot | undefined,
  PathParams<Document>
>
export type FirestoreUpdateEvent<Document extends string> = FirestoreEvent<
  Change<QueryDocumentSnapshot> | undefined,
  PathParams<Document>
>
export type FirestoreDeleteEvent<Document extends string> = FirestoreEvent<
  QueryDocumentSnapshot | undefined,
  PathParams<Document>
>
export type FirestoreWriteEvent<Document extends string> = FirestoreEvent<
  Change<DocumentSnapshot> | undefined,
  PathParams<Document>
>

function options<Document extends string>(
  document: Document,
  extra: FirescopeFirestoreOptions<Document>,
): DocumentOptions<Document> {
  return { region: runtimeRegion(), document, ...extra }
}

export const firestore = {
  document<const Document extends string>(document: Document) {
    return {
      onCreate(
        handler: FirestoreHandler<FirestoreCreateEvent<Document>>,
        extra: FirescopeFirestoreOptions<Document> = {},
      ) {
        return onDocumentCreated(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event: event as FirestoreCreateEvent<Document> })
        })
      },
      onUpdate(
        handler: FirestoreHandler<FirestoreUpdateEvent<Document>>,
        extra: FirescopeFirestoreOptions<Document> = {},
      ) {
        return onDocumentUpdated(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event: event as FirestoreUpdateEvent<Document> })
        })
      },
      onDelete(
        handler: FirestoreHandler<FirestoreDeleteEvent<Document>>,
        extra: FirescopeFirestoreOptions<Document> = {},
      ) {
        return onDocumentDeleted(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event: event as FirestoreDeleteEvent<Document> })
        })
      },
      onWrite(
        handler: FirestoreHandler<FirestoreWriteEvent<Document>>,
        extra: FirescopeFirestoreOptions<Document> = {},
      ) {
        return onDocumentWritten(options(document, extra), async (event) => {
          await handler({ ...baseContext(), event: event as FirestoreWriteEvent<Document> })
        })
      },
    }
  },
}
