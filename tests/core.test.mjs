import assert from "node:assert/strict"
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"

import { loadConfig } from "../dist/cli/config-loader.js"
import { discoverFunctions } from "../dist/cli/discover.js"
import { loadEnv } from "../dist/env.js"
import { createFirebaseJson } from "../dist/generate/firebase-json.js"
import { createFirestoreRules, createStorageRules } from "../dist/generate/firebase-rules.js"
import { createFunctionsEntry } from "../dist/generate/functions-entry.js"
import { createFunctionsPackage } from "../dist/generate/functions-package.js"

async function tempProject() {
  return mkdtemp(join(tmpdir(), "firescope-test-"))
}

test("discoverFunctions ignores underscore helper files and folders", async () => {
  const cwd = await tempProject()
  await mkdir(join(cwd, "src/functions/users/_shared"), { recursive: true })
  await writeFile(join(cwd, "src/functions/hello.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/_local.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/users/created.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/users/_shared/audit.ts"), "export default {}\n")

  const functions = await discoverFunctions(cwd, "src/functions")

  assert.deepEqual(functions.map((fn) => fn.name), ["hello", "usersCreated"])
})

test("loadEnv gives local and mode files higher precedence", async () => {
  const cwd = await tempProject()
  const name = "FIRESCOPE_TEST_PRECEDENCE"
  delete process.env[name]

  await writeFile(join(cwd, ".env"), `${name}=base\n`)
  await writeFile(join(cwd, ".env.local"), `${name}=local\n`)
  await writeFile(join(cwd, ".env.test"), `${name}=mode\n`)
  await writeFile(join(cwd, ".env.test.local"), `${name}=mode-local\n`)

  loadEnv({ cwd, mode: "test" })

  assert.equal(process.env[name], "mode-local")
  delete process.env[name]
})

test("loadEnv preserves shell values unless override is enabled", async () => {
  const cwd = await tempProject()
  const name = "FIRESCOPE_TEST_OVERRIDE"
  process.env[name] = "shell"

  await writeFile(join(cwd, ".env"), `${name}=file\n`)

  loadEnv({ cwd, mode: "test" })
  assert.equal(process.env[name], "shell")

  loadEnv({ cwd, mode: "test", override: true })
  assert.equal(process.env[name], "file")
  delete process.env[name]
})

test("createFunctionsPackage emits only Firebase runtime dependencies", async () => {
  const cwd = await tempProject()
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({
      dependencies: {
        firescope: "file:../firescope",
        "firebase-admin": "^13.1.0",
        "firebase-functions": "^6.3.0",
      },
    }),
  )

  const pkg = await createFunctionsPackage(cwd)

  assert.deepEqual(pkg.dependencies, {
    "firebase-admin": "^13.1.0",
    "firebase-functions": "^6.3.0",
  })
})

test("createFunctionsEntry exports discovered functions from source files", () => {
  const output = createFunctionsEntry(
    [{ name: "hello", file: "/repo/src/functions/hello.ts", relativeFile: "hello.ts" }],
    "/repo/.firescope/functions/src/index.ts",
  )

  assert.equal(output, 'export { default as hello } from "../../../src/functions/hello.ts";\n')
})

test("createFirebaseJson omits hosting when disabled", () => {
  const firebaseJson = createFirebaseJson({
    project: "demo",
    region: "us-central1",
    runtime: "nodejs20",
    functions: { source: "src/functions", ignore: [] },
    firestore: { rules: "firestore.rules" },
    storage: { rules: "storage.rules" },
    hosting: false,
    emulators: { functions: 5001 },
  })

  assert.equal("hosting" in firebaseJson, false)
  assert.deepEqual(firebaseJson.functions, {
    source: ".firescope/functions",
    runtime: "nodejs20",
    ignore: ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"],
  })
  assert.deepEqual(firebaseJson.firestore, { rules: "firestore.rules" })
  assert.deepEqual(firebaseJson.storage, { rules: "storage.rules" })
})

test("default Firebase rules are safe closed rules", () => {
  assert.match(createFirestoreRules(), /service cloud\.firestore/)
  assert.match(createFirestoreRules(), /allow read, write: if false/)
  assert.match(createStorageRules(), /service firebase\.storage/)
  assert.match(createStorageRules(), /allow read, write: if false/)
})

test("loadConfig loads .env.local before importing config", async () => {
  const cwd = await tempProject()
  await writeFile(join(cwd, ".env.local"), "FIRESCOPE_PROJECT=demo-loaded\n")
  await writeFile(
    join(cwd, "firescope.config.mjs"),
    'export default { project: process.env.FIRESCOPE_PROJECT, region: "europe-west1" }\n',
  )

  const config = await loadConfig(cwd)

  assert.equal(config.project, "demo-loaded")
  assert.equal(config.region, "europe-west1")
})

test("built functions bundle does not externalize Firescope runtime imports", async () => {
  const file = await readFile(new URL("../dist/cli/build.js", import.meta.url), "utf8")

  assert.match(file, /external: \["firebase-admin", "firebase-functions"\]/)
  assert.doesNotMatch(file, /"firescope\/functions"/)
})
