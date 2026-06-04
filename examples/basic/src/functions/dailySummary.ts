import { schedule } from "firescope/functions"

export default schedule("every 24 hours", async ({ scope }) => {
  await scope.db.collection("jobs").add({
    type: "daily.summary",
    createdAt: new Date().toISOString(),
  })
})
