import {
  defineConfig,
  defineFirestoreSchema,
  env,
  envBool,
  envInt,
  loadEnv,
  path,
  scope,
  type FirescopeConfig,
  type PathParams,
} from "firescope"
import { callable, firestore, http, schedule, storage } from "firescope/functions"

export const config = defineConfig({
  project: "demo-firescope",
  region: "us-central1",
  runtime: "nodejs22",
  functions: {
    source: "src/functions",
    ignore: ["**/*.test.ts"],
    memory: "512MiB",
    timeoutSeconds: 60,
    secrets: ["API_KEY"],
  },
  hosting: {
    public: "public",
    rewrites: [{ source: "/api/hello", function: "hello" }],
  },
})

export const resolvedConfig: FirescopeConfig = config

export type AppDb = {
  users: {
    displayName: string
    createdAt: string
  }
}

export const data = defineFirestoreSchema<AppDb>()

export const users = data.collection("users")
export const user = data.doc("users", "ada")
export const userGroup = data.group("users")
export const bound = data.from(scope.db)

// @ts-expect-error unknown collections are rejected
data.collection("userz")

// @ts-expect-error documents must match the collection model
users.add({ displayName: "Ada" })

export const apiPath = path("/users/{userId}")
type Params = PathParams<typeof apiPath.path>
export const params: Params = { userId: "ada" }

export const hello = http(async ({ res }) => {
  res.json({ ok: true })
})

export const autoJson = http(async () => ({ ok: true }))

export const ping = callable<{ name?: string }, { message: string }>(async ({ data: input, auth }) => {
  return { message: `Hello ${input.name ?? auth?.uid ?? "friend"}` }
})

export const daily = schedule("every 24 hours", async ({ event }) => {
  const jobName: string | undefined = event.jobName
  return jobName
})

export const created = firestore.document("users/{userId}").onCreate(async ({ event }) => {
  const id: string = event.params.userId
  return id
})

export const updated = firestore.document("users/{userId}").onUpdate(async ({ event }) => {
  return event.data?.after.id
})

export const uploaded = storage.object().onFinalize(async ({ event }) => {
  return event.data.name
})

export const project = env("FIRESCOPE_PROJECT", { optional: true })
export const port = envInt("PORT", { fallback: "8080" })
export const debug = envBool("DEBUG", { fallback: "false" })

loadEnv({ cwd: process.cwd(), mode: "test" })

void resolvedConfig
void user
void userGroup
void bound
void params
void project
void port
void debug
void hello
void autoJson
void ping
void daily
void created
void updated
void uploaded
