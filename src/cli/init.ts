import { join, resolve } from "node:path"
import { createFirestoreRules, createStorageRules } from "../generate/firebase-rules.js"
import { ensureDir, isEmptyDir, pathExists, writeFileIfMissing, writeJson } from "./fs.js"
import { log } from "./log.js"
import { prompt } from "./prompt.js"
import type { CliContext } from "./types.js"

export async function initCommand(context: CliContext): Promise<void> {
  const targetArg = context.args[0]
  const appDir = targetArg ? resolve(context.cwd, targetArg) : context.cwd
  const appName = targetArg ?? (await prompt("App name", "my-firescope-app"))

  await ensureDir(appDir)

  if (!(await isEmptyDir(appDir)) && !(await pathExists(join(appDir, "firescope.config.ts")))) {
    throw new Error(`Directory is not empty: ${appDir}`)
  }

  await writeJson(join(appDir, "package.json"), {
    name: appName.replace(/[^a-zA-Z0-9-_]/g, "-").toLowerCase(),
    private: true,
    type: "module",
    scripts: {
      dev: "firescope dev",
      build: "firescope build",
      connect: "firescope connect",
      deploy: "firescope deploy",
      doctor: "firescope doctor",
    },
    dependencies: {
      firescope: "^0.1.1",
      "firebase-admin": "^13.0.2",
      "firebase-functions": "^6.2.0",
    },
    devDependencies: {
      "firebase-tools": "^14.17.0",
      typescript: "^5.7.2",
    },
    engines: {
      node: ">=20",
    },
  })

  await writeFileIfMissing(
    join(appDir, "firescope.config.ts"),
    `import { defineConfig } from "firescope"\n\nexport default defineConfig({\n  project: process.env.FIRESCOPE_PROJECT,\n  region: "us-central1",\n  runtime: "nodejs20",\n  functions: {\n    source: "src/functions",\n  },\n  hosting: {\n    public: "public",\n    cleanUrls: true,\n  },\n})\n`,
  )

  await writeFileIfMissing(
    join(appDir, "src", "db.ts"),
    `import { defineFirestoreSchema } from "firescope"\n\nexport type AppDb = {\n  users: {\n    displayName: string\n    createdAt: string\n  }\n}\n\nexport const data = defineFirestoreSchema<AppDb>()\n`,
  )

  await writeFileIfMissing(
    join(appDir, "src", "functions", "hello.ts"),
    `import { http } from "firescope/functions"\nimport { data } from "../db.js"\n\nexport default http(async ({ scope, res }) => {\n  const users = await data.collection("users", scope.db).limit(10).get()\n\n  res.json({\n    ok: true,\n    message: "Hello from Firescope",\n    users: users.docs.map((doc) => ({ id: doc.id, ...doc.data() })),\n  })\n})\n`,
  )

  await writeFileIfMissing(
    join(appDir, "public", "index.html"),
    `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n    <title>Firescope</title>\n  </head>\n  <body>\n    <main>\n      <h1>Firescope is running</h1>\n      <p>Run <code>npm run dev</code> to start the Firebase emulators.</p>\n    </main>\n  </body>\n</html>\n`,
  )

  await writeFileIfMissing(join(appDir, "firestore.rules"), createFirestoreRules())
  await writeFileIfMissing(join(appDir, "storage.rules"), createStorageRules())
  await writeFileIfMissing(join(appDir, ".env.local"), "FIRESCOPE_PROJECT=\n")
  await writeFileIfMissing(join(appDir, ".gitignore"), "node_modules\n.firescope\n.firebase\n.env.local\n*.log\n")

  log.success(`Created Firescope app in ${appDir}`)
  log.info(`Next: ${targetArg ? `cd ${targetArg}, ` : ""}npm install, npm run dev`)
}
