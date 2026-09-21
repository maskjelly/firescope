import { data } from "../../db.js"
import type { FirescopeScope } from "firescope"

export async function writeAuditEntry(scope: FirescopeScope, userId: string): Promise<void> {
  await data.collection("audit", scope.db).add({
    type: "user.created",
    userId,
    createdAt: new Date().toISOString(),
  })
}
