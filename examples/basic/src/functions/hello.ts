import { http } from "firescope/functions"
import { data } from "../db.js"

export default http(async ({ scope }) => {
  const users = await data.collection("users", scope.db).limit(10).get()

  return {
    ok: true,
    message: "Hello from Firescope",
    users: users.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  }
})
