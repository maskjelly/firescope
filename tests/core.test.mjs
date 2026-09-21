import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import { fileURLToPath } from "node:url"

import { buildCommand } from "../dist/cli/build.js"
import { loadConfig } from "../dist/cli/config-loader.js"
import { discoverFunctions } from "../dist/cli/discover.js"
import { matchesGlob } from "../dist/cli/glob.js"
import { initCommand, toPackageName } from "../dist/cli/init.js"
import { forwardFlags, parseArgs } from "../dist/cli/args.js"
import { validateConfig } from "../dist/cli/validate-config.js"
import { watchSources } from "../dist/cli/watch.js"
import { envBool, envInt, loadEnv } from "../dist/env.js"
import { createFirebaseJson } from "../dist/generate/firebase-json.js"
import { createFirestoreRules, createStorageRules } from "../dist/generate/firebase-rules.js"
import { createFunctionsEntry } from "../dist/generate/functions-entry.js"
import { createFunctionsPackage } from "../dist/generate/functions-package.js"

const repoRoot = fileURLToPath(new URL("..", import.meta.url))
const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"))

async function tempProject() {
  return mkdtemp(join(tmpdir(), "firescope-test-"))
}

async function linkFirescope(appDir) {
  const target = join(appDir, "node_modules", "firescope")
  await mkdir(join(appDir, "node_modules"), { recursive: true })

  try {
    await symlink(repoRoot, target, process.platform === "win32" ? "junction" : "dir")
    return true
  } catch {
    return false
  }
}

test("discoverFunctions ignores underscore helper files and folders", async () => {
  const cwd = await tempProject()
  await mkdir(join(cwd, "src/functions/users/_shared"), { recursive: true })
  await writeFile(join(cwd, "src/functions/hello.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/_local.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/users/created.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/users/_shared/audit.ts"), "export default {}\n")

  const functions = await discoverFunctions(cwd, "src/functions")

  assert.deepEqual(
    functions.map((fn) => fn.name),
    ["hello", "usersCreated"],
  )
})

test("discoverFunctions respects configured ignore patterns", async () => {
  const cwd = await tempProject()
  await mkdir(join(cwd, "src/functions/legacy"), { recursive: true })
  await writeFile(join(cwd, "src/functions/hello.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/hello.test.ts"), "export default {}\n")
  await writeFile(join(cwd, "src/functions/legacy/old.ts"), "export default {}\n")

  const functions = await discoverFunctions(cwd, "src/functions", ["**/*.test.ts", "legacy/**"])

  assert.deepEqual(
    functions.map((fn) => fn.name),
    ["hello"],
  )
})

test("matchesGlob supports segment, wildcard, and globstar patterns", () => {
  assert.equal(matchesGlob("users/created.ts", "node_modules"), false)
  assert.equal(matchesGlob("node_modules/pkg/index.ts", "node_modules"), true)
  assert.equal(matchesGlob("users/created.test.ts", "**/*.test.ts"), true)
  assert.equal(matchesGlob("created.test.ts", "**/*.test.ts"), true)
  assert.equal(matchesGlob("created.ts", "**/*.test.ts"), false)
  assert.equal(matchesGlob("legacy/users/old.ts", "legacy/**"), true)
  assert.equal(matchesGlob("other/old.ts", "legacy/**"), false)
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

test("envInt and envBool reject malformed values", () => {
  process.env.FIRESCOPE_TEST_INT = "12abc"
  process.env.FIRESCOPE_TEST_BOOL = "maybe"

  assert.throws(() => envInt("FIRESCOPE_TEST_INT"), /must be an integer/)
  assert.throws(() => envBool("FIRESCOPE_TEST_BOOL"), /must be a boolean/)

  process.env.FIRESCOPE_TEST_INT = "42"
  process.env.FIRESCOPE_TEST_BOOL = "on"

  assert.equal(envInt("FIRESCOPE_TEST_INT"), 42)
  assert.equal(envBool("FIRESCOPE_TEST_BOOL"), true)

  delete process.env.FIRESCOPE_TEST_INT
  delete process.env.FIRESCOPE_TEST_BOOL
})

test("createFunctionsPackage emits only Firebase runtime dependencies", async () => {
  const cwd = await tempProject()
  await writeFile(
    join(cwd, "package.json"),
    JSON.stringify({
      dependencies: {
        firescope: "file:../firescope",
        "firebase-admin": "^14.1.0",
        "firebase-functions": "^7.3.0",
      },
    }),
  )

  const pkg = await createFunctionsPackage(cwd)

  assert.deepEqual(pkg.dependencies, {
    "firebase-admin": "^14.1.0",
    "firebase-functions": "^7.3.0",
  })
})

test("createFunctionsEntry exports discovered functions from source files", () => {
  const output = createFunctionsEntry(
    [{ name: "hello", file: "/repo/src/functions/hello.ts", relativeFile: "hello.ts" }],
    "/repo/.firescope/functions/src/index.ts",
  )

  assert.equal(output, 'export { default as hello } from "../../../src/functions/hello.ts";\n')
})

test("createFunctionsEntry emits setGlobalOptions for configured defaults", () => {
  const output = createFunctionsEntry(
    [{ name: "hello", file: "/repo/src/functions/hello.ts", relativeFile: "hello.ts" }],
    "/repo/.firescope/functions/src/index.ts",
    {
      functions: {
        memory: "512MiB",
        timeoutSeconds: 60,
        minInstances: 1,
        maxInstances: 10,
        secrets: ["API_KEY"],
      },
    },
  )

  assert.match(output, /import \{ setGlobalOptions \} from "firebase-functions\/v2"/)
  assert.match(output, /"memory": "512MiB"/)
  assert.match(output, /"timeoutSeconds": 60/)
  assert.match(output, /"minInstances": 1/)
  assert.match(output, /"maxInstances": 10/)
  assert.match(output, /"secrets": \[\n\s+"API_KEY"\n\s+\]/)
  assert.match(output, /export \{ default as hello \}/)
})

test("createFunctionsEntry writes an empty module when no functions exist", () => {
  const output = createFunctionsEntry([], "/repo/.firescope/functions/src/index.ts")
  assert.equal(output, "export {}\n")
})

test("createFirebaseJson omits hosting when disabled", () => {
  const firebaseJson = createFirebaseJson({
    project: "demo",
    region: "us-central1",
    runtime: "nodejs22",
    functions: { source: "src/functions", ignore: [] },
    firestore: { rules: "firestore.rules" },
    storage: { rules: "storage.rules" },
    hosting: false,
    emulators: { functions: 5001 },
  })

  assert.equal("hosting" in firebaseJson, false)
  assert.deepEqual(firebaseJson.functions, {
    source: ".firescope/functions",
    runtime: "nodejs22",
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
  assert.equal(config.runtime, "nodejs22")
})

test("loadConfig rejects unknown and malformed options", async () => {
  const cwd = await tempProject()
  await writeFile(join(cwd, "firescope.config.mjs"), "export default { hosting: { pubic: 'public' } }\n")
  await assert.rejects(loadConfig(cwd), /Unknown option "pubic"/)

  const badRuntime = await tempProject()
  await writeFile(join(badRuntime, "firescope.config.mjs"), 'export default { runtime: "node18" }\n')
  await assert.rejects(loadConfig(badRuntime), /Invalid runtime "node18"/)

  const badPort = await tempProject()
  await writeFile(join(badPort, "firescope.config.mjs"), 'export default { emulators: { firestore: "8080" } }\n')
  await assert.rejects(loadConfig(badPort), /emulators\.firestore must be a number/)
})

test("validateConfig accepts a complete configuration", () => {
  validateConfig(
    {
      project: "demo",
      region: "us-central1",
      runtime: "nodejs22",
      functions: { source: "src/functions", ignore: ["**/*.test.ts"], secrets: ["API_KEY"], memory: "256MiB" },
      firestore: { rules: "firestore.rules" },
      storage: false,
      hosting: { public: "public", rewrites: [{ source: "/api", function: "api" }] },
      emulators: { firestore: 8080, singleProjectMode: true },
    },
    "firescope.config.ts",
  )
})

test("built functions bundle does not externalize Firescope runtime imports", async () => {
  const file = await readFile(new URL("../dist/cli/build.js", import.meta.url), "utf8")

  assert.match(file, /external: \["firebase-admin", "firebase-functions"\]/)
  assert.doesNotMatch(file, /"firescope\/functions"/)
})

test("toPackageName sanitizes directory style input", () => {
  assert.equal(toPackageName("./My App"), "my-app")
  assert.equal(toPackageName("packages/my-app"), "packages-my-app")
  assert.equal(toPackageName("--weird--name--"), "weird-name")
  assert.equal(toPackageName(""), "firescope-app")
})

test("parseArgs separates flags, positionals, and passthrough arguments", () => {
  const context = parseArgs(["deploy", "-y", "--only", "functions", "--", "--force"])

  assert.deepEqual(context.args, ["deploy", "--force"])
  assert.equal(context.flags.get("y"), true)
  assert.equal(context.flags.get("only"), "functions")
  assert.deepEqual(forwardFlags(context, []), ["--only=functions"])
})

test("init scaffolds a complete app with sanitized names", async () => {
  const cwd = await tempProject()

  await initCommand({ cwd, args: ["./My App"], flags: new Map([["yes", true]]), raw: [] })

  const appDir = join(cwd, "My App")
  const appPackage = JSON.parse(await readFile(join(appDir, "package.json"), "utf8"))

  assert.equal(appPackage.name, "my-app")
  assert.equal(appPackage.dependencies.firescope, `^${packageJson.version}`)
  assert.equal(appPackage.scripts.check, "tsc --noEmit")

  for (const file of [
    "firescope.config.ts",
    "tsconfig.json",
    "README.md",
    ".gitignore",
    ".env.example",
    ".env.local",
    "firestore.rules",
    "storage.rules",
    "src/db.ts",
    "src/functions/hello.ts",
    "public/index.html",
  ]) {
    assert.equal(existsSync(join(appDir, file)), true, `${file} should exist`)
  }
})

test("build generates Firebase output for a scaffolded app", async (t) => {
  const cwd = await tempProject()
  const linked = await linkFirescope(cwd)

  if (!linked) {
    t.skip("could not create a node_modules symlink on this platform")
    return
  }

  await mkdir(join(cwd, "src/functions/users"), { recursive: true })
  await writeFile(
    join(cwd, "firescope.config.ts"),
    `export default {
  project: "demo-e2e",
  runtime: "nodejs22",
  functions: { source: "src/functions", memory: "256MiB", timeoutSeconds: 30, secrets: ["API_KEY"] },
}
`,
  )
  await writeFile(
    join(cwd, "src/functions/users/created.ts"),
    `import { firestore } from "firescope/functions"

export default firestore.document("users/{userId}").onCreate(async ({ event }) => event.params.userId)
`,
  )

  await buildCommand({ cwd, args: [], flags: new Map(), raw: [] })

  const firebaseJson = JSON.parse(await readFile(join(cwd, "firebase.json"), "utf8"))
  const entry = await readFile(join(cwd, ".firescope/functions/src/index.ts"), "utf8")
  const bundle = await readFile(join(cwd, ".firescope/functions/lib/index.js"), "utf8")

  assert.equal(firebaseJson.functions.source, ".firescope/functions")
  assert.equal(firebaseJson.functions.runtime, "nodejs22")
  assert.equal(firebaseJson.emulators.singleProjectMode, true)
  assert.deepEqual(JSON.parse(await readFile(join(cwd, ".firebaserc"), "utf8")), { projects: { default: "demo-e2e" } })

  assert.match(entry, /setGlobalOptions/)
  assert.match(entry, /export \{ default as usersCreated \}/)
  assert.match(bundle, /from "firebase-functions\/v2\/firestore"/)
  assert.match(bundle, /usersCreated/)
})

test("watchSources rebuilds when function files change", async (t) => {
  const cwd = await tempProject()
  const linked = await linkFirescope(cwd)

  if (!linked) {
    t.skip("could not create a node_modules symlink on this platform")
    return
  }

  await mkdir(join(cwd, "src/functions"), { recursive: true })
  await writeFile(
    join(cwd, "firescope.config.ts"),
    'export default { project: "demo-watch", functions: { source: "src/functions" } }\n',
  )
  await writeFile(join(cwd, "src/functions/first.ts"), "export default {}\n")

  const context = { cwd, args: [], flags: new Map(), raw: [] }
  await buildCommand(context)
  const stop = await watchSources(context, await loadConfig(cwd))

  try {
    await writeFile(join(cwd, "src/functions/second.ts"), "export default {}\n")

    const entryPath = join(cwd, ".firescope/functions/src/index.ts")
    const deadline = Date.now() + 15000
    let entry = ""

    while (Date.now() < deadline) {
      entry = await readFile(entryPath, "utf8")
      if (entry.includes("second")) break
      await new Promise((resolve) => setTimeout(resolve, 200))
    }

    assert.match(entry, /export \{ default as second \}/)
  } finally {
    stop()
  }
})

test("cli reports its version and lists commands in help", () => {
  const cli = join(repoRoot, "dist/cli/index.js")

  const version = execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" }).trim()
  assert.equal(version, packageJson.version)

  const help = execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" })
  assert.match(help, /Usage: firescope <command> \[options\]/)
  assert.match(help, /doctor/)
})
