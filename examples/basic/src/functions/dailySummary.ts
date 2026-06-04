import { schedule } from "firescope/functions"
import { data } from "../db.js"

export default schedule("every 24 hours", async ({ scope }) => {
  await data.collection("jobs", scope.db).add({
    type: "daily.summary",
    createdAt: new Date().toISOString(),
  })
})
