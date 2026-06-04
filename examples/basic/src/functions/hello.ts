import { http } from "firescope/functions"

export default http(async ({ res }) => {
  res.json({ ok: true, message: "Hello from Firescope" })
})
