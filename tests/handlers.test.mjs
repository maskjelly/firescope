import assert from "node:assert/strict"
import test from "node:test"
import { getScope, defineFirestoreSchema } from "../dist/index.js"
import { http, callable, firestore, storage, schedule } from "../dist/functions/index.js"

process.env.GCLOUD_PROJECT = "demo-firescope-sdk"
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: "demo-firescope-sdk",
  storageBucket: "demo-firescope-sdk.appspot.com",
})

function response() {
  return {
    status(code) {
      this.code = code
      return this
    },
    send(value) {
      this.value = value
      this.writableEnded = true
      return this
    },
    headersSent: false,
    writableEnded: false,
    json(value) {
      this.value = value
      this.writableEnded = true
    },
  }
}

test("HTTP handler returns JSON and receives cached scope and original request", async () => {
  const req = { method: "GET" }
  const res = response()
  await http(({ scope, req: original }) => {
    assert.equal(scope, getScope())
    assert.equal(original, req)
    return { ok: true }
  })(req, res)
  assert.deepEqual(res.value, { ok: true })
})

test("HTTP handler respects explicit response and Firebase sanitizes errors", async () => {
  const res = response()
  await http(({ res }) => {
    res.json({ custom: true })
    return { overwrite: true }
  })({}, res)
  assert.deepEqual(res.value, { custom: true })
  const failed = response()
  await http(() => {
    throw new Error("handler failed")
  })({}, failed)
  assert.equal(failed.code, 500)
  assert.equal(failed.value, "Internal Server Error")
})

test("callable passes original request data and auth", async () => {
  const request = { data: { name: "Ada" }, auth: { uid: "u1" } }
  const result = await callable(({ data, auth, request: original }) => {
    assert.equal(original, request)
    return { name: data.name, uid: auth.uid }
  }).run(request)
  assert.deepEqual(result, { name: "Ada", uid: "u1" })
})

test("Firestore, Storage and Schedule handlers preserve event data", async () => {
  const seen = []
  const event = { params: { userId: "u1" }, data: { name: "file.txt" }, jobName: "daily" }
  await firestore
    .document("users/{userId}")
    .onCreate(({ event }) => seen.push(event.params.userId))
    .run(event)
  await storage
    .object("demo-firescope-sdk.appspot.com")
    .onFinalize(({ event }) => seen.push(event.data.name))
    .run(event)
  await schedule("every 24 hours", ({ event }) => seen.push(event.jobName)).run(event)
  assert.deepEqual(seen, ["u1", "file.txt", "daily"])
})

test("schema returns actual references with correct paths without a network request", () => {
  const db = getScope().db
  const schema = defineFirestoreSchema().from(db)
  assert.equal(schema.collection("users").path, "users")
  assert.equal(schema.doc("users", "ada").path, "users/ada")
  assert.equal(schema.collection("users").firestore, db)
})
