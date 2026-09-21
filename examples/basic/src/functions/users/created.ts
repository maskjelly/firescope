import { firestore } from "firescope/functions"
import { writeAuditEntry } from "../_shared/audit.js"

export default firestore.document("users/{userId}").onCreate(async ({ event, scope }) => {
  await writeAuditEntry(scope, event.params.userId)
})
