import { firestore } from "firescope/functions"
import { data } from "../../db.js"

export default firestore.document("users/{userId}").onCreate(async ({ event, scope }) => {
  await data.collection("audit", scope.db).add({
    type: "user.created",
    userId: event.params.userId,
    createdAt: new Date().toISOString(),
  })
})
