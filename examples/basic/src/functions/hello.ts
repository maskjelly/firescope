import { http } from "firescope/functions"
import { data } from "../db.js"

export default http(async ({ scope, res }) => {
  const users = await data.collection("users", scope.db).limit(10).get()

  res.json({
    ok: true,
    message: "Hello from Firescope",
    users: users.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  })
})
