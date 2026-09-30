import assert from "node:assert/strict"
import { initializeApp, deleteApp } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

const project = process.env.GCLOUD_PROJECT || "demo-firescope"
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080"
const app = initializeApp({ projectId: project })
const db = getFirestore(app)
const functions = `http://127.0.0.1:${process.env.FIRESCOPE_TEST_FUNCTIONS_PORT || "5001"}/${project}/us-central1`
async function json(url, options) {
  const response = await fetch(url, options)
  assert.equal(response.status, 200, await response.clone().text())
  return response.json()
}
try {
  const hello = await json(`${functions}/hello`)
  assert.equal(hello.ok, true)
  assert.deepEqual(hello.users, [])
  const hosted = await json(`${process.env.FIRESCOPE_TEST_HOSTING_URL || "http://127.0.0.1:5000"}/api/hello`)
  assert.equal(hosted.message, "Hello from Firescope")
  const callable = await json(`${functions}/ping`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: { name: "Ada" } }),
  })
  assert.equal(callable.result.pong, true)
  assert.equal(callable.result.message, "Hello Ada")
  const userId = `smoke-${Date.now()}`
  await db.doc(`users/${userId}`).set({ displayName: "Ada", createdAt: new Date().toISOString() })
  let audits
  for (let attempt = 0; attempt < 100; attempt++) {
    audits = await db.collection("audit").where("userId", "==", userId).get()
    if (!audits.empty) break
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
  assert.ok(!audits.empty, "Firestore create trigger must write an audit document")
  const withUser = await json(`${functions}/hello`)
  assert.ok(withUser.users.some((user) => user.id === userId))
  console.log("PASS: real emulator HTTP, Hosting rewrite, callable, typed Firestore write/read and create trigger")
} finally {
  await db.terminate()
  await deleteApp(app)
}
