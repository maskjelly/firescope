import { callable } from "firescope/functions"

export default callable<{ name?: string }>(async ({ data }) => {
  return {
    pong: true,
    message: `Hello ${data.name ?? "friend"}`,
  }
})
