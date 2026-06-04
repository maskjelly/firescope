import { defineFirestoreSchema } from "firescope"

export type AppDb = {
  users: {
    displayName: string
    createdAt: string
  }
  audit: {
    type: "user.created"
    userId: string
    createdAt: string
  }
  jobs: {
    type: "daily.summary"
    createdAt: string
  }
}

export const data = defineFirestoreSchema<AppDb>()
