import { firestore } from "firescope/functions"

export default firestore.document("users/{userId}").onCreate(async ({ event, scope }) => {
  await scope.db.collection("audit").add({
    type: "user.created",
    userId: event.params.userId,
    createdAt: new Date().toISOString(),
  })
})
