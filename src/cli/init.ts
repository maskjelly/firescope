import { basename, join, resolve } from "node:path"
import { createFirestoreRules, createStorageRules } from "../generate/firebase-rules.js"
import { scaffoldVersions } from "../scaffold/versions.js"
import { version } from "../version.js"
import { flagEnabled, flagString } from "./args.js"
import { FirescopeError } from "./errors.js"
import { ensureDir, isEmptyDir, pathExists, writeEnvValue, writeFileIfMissing } from "./fs.js"
import { color, log } from "./log.js"
import { detectPackageManager, installCommand, runCommand } from "./package-manager.js"
import { prompt } from "./prompt.js"
import type { CliContext } from "./types.js"

export function toPackageName(input: string): string {
  const name = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-._]+/g, "-")
    .replace(/^[._-]+/, "")
    .replace(/[._-]+$/, "")
    .replace(/-{2,}/g, "-")

  return name || "firescope-app"
}

export async function initCommand(context: CliContext): Promise<void> {
  const targetArg = context.args[0]
  const yes = flagEnabled(context, "yes", "y")
  const appDir = targetArg ? resolve(context.cwd, targetArg) : context.cwd
  const directoryName = basename(appDir) || "my-firescope-app"
  const appName =
    flagString(context, "name") ?? (yes ? directoryName : await prompt("App name", { default: directoryName }))
  const packageName = toPackageName(appName)
  const project = flagString(context, "project")
  const packageManager = detectPackageManager(context.cwd)

  await ensureDir(appDir)

  if (!(await isEmptyDir(appDir)) && !(await pathExists(join(appDir, "firescope.config.ts")))) {
    throw new FirescopeError(
      `Directory is not empty: ${appDir}`,
      "Choose an empty directory, or re-run init inside an existing Firescope app.",
    )
  }

  await writeFileIfMissing(
    join(appDir, "package.json"),
    `${JSON.stringify(
      {
        name: packageName,
        version: "0.0.0",
        private: true,
        type: "module",
        scripts: {
          dev: "firescope dev",
          build: "firescope build",
          check: "tsc --noEmit",
          connect: "firescope connect",
          deploy: "firescope deploy",
          doctor: "firescope doctor",
        },
        dependencies: {
          firescope: `^${version}`,
          "firebase-admin": scaffoldVersions.firebaseAdmin,
          "firebase-functions": scaffoldVersions.firebaseFunctions,
        },
        devDependencies: {
          "@types/node": scaffoldVersions.typesNode,
          "firebase-tools": scaffoldVersions.firebaseTools,
          typescript: scaffoldVersions.typescript,
        },
        engines: {
          node: ">=22",
        },
      },
      null,
      2,
    )}\n`,
  )

  await writeFileIfMissing(
    join(appDir, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          lib: ["ES2022"],
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          skipLibCheck: true,
          forceConsistentCasingInFileNames: true,
          types: ["node"],
        },
        include: ["src/**/*.ts", "firescope.config.ts"],
      },
      null,
      2,
    )}\n`,
  )

  await writeFileIfMissing(
    join(appDir, "firescope.config.ts"),
    `import { defineConfig } from "firescope"

export default defineConfig({
  project: process.env.FIRESCOPE_PROJECT,
  region: "us-central1",
  runtime: "nodejs22",
  functions: {
    source: "src/functions",
  },
  hosting: {
    public: "public",
    cleanUrls: true,
  },
})
`,
  )

  await writeFileIfMissing(
    join(appDir, "src", "db.ts"),
    `import { defineFirestoreSchema } from "firescope"

export type AppDb = {
  users: {
    displayName: string
    createdAt: string
  }
}

export const data = defineFirestoreSchema<AppDb>()
`,
  )

  await writeFileIfMissing(
    join(appDir, "src", "functions", "hello.ts"),
    `import { http } from "firescope/functions"
import { data } from "../db.js"

export default http(async ({ scope }) => {
  const users = await data.collection("users", scope.db).limit(10).get()

  return {
    ok: true,
    message: "Hello from Firescope",
    users: users.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  }
})
`,
  )

  await writeFileIfMissing(
    join(appDir, "public", "index.html"),
    `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Firescope</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        display: grid;
        min-height: 100vh;
        margin: 0;
        place-items: center;
        background: radial-gradient(circle at top left, #fbbf24, transparent 32%), #0b1020;
      }

      main {
        width: min(680px, calc(100vw - 32px));
        border: 1px solid rgba(255, 255, 255, 0.14);
        border-radius: 28px;
        padding: 40px;
        color: #f8fafc;
        background: rgba(17, 24, 39, 0.82);
        box-shadow: 0 32px 90px rgba(0, 0, 0, 0.36);
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(2.2rem, 8vw, 4rem);
        letter-spacing: -0.06em;
      }

      p {
        margin: 0 0 20px;
        color: #cbd5f5;
      }

      code {
        border-radius: 8px;
        padding: 2px 6px;
        color: #ffe6a3;
        background: rgba(255, 255, 255, 0.08);
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Firescope is running</h1>
      <p>Your app is served from <code>public/</code> and your functions live in <code>src/functions/</code>.</p>
      <p>Run <code>npm run dev</code> to start the Firebase emulators, then open the hosting URL to see this page.</p>
    </main>
  </body>
</html>
`,
  )

  await writeFileIfMissing(
    join(appDir, "README.md"),
    `# ${packageName}

A Firebase app built with [Firescope](https://github.com/maskjelly/firescope).

## Commands

| Command | What it does |
| --- | --- |
| \`${runCommand(packageManager, "dev")}\` | Build, watch, and start the Firebase emulators |
| \`${runCommand(packageManager, "build")}\` | Generate the Firebase-compatible deploy output |
| \`${runCommand(packageManager, "check")}\` | Type-check the app |
| \`${runCommand(packageManager, "connect")}\` | Select a Firebase project and write local config |
| \`${runCommand(packageManager, "deploy")}\` | Build and deploy to Firebase |
| \`${runCommand(packageManager, "doctor")}\` | Check that the local setup is ready |

## Layout

\`\`\`txt
firescope.config.ts   framework configuration
src/db.ts             typed Firestore schema
src/functions/        one file per function (underscore-prefixed files are helpers)
public/               static hosting files
\`\`\`

Local emulators run against the demo project \`demo-firescope\` until you run connect.
Read the full documentation at https://github.com/maskjelly/firescope#readme.
`,
  )

  await writeFileIfMissing(join(appDir, "firestore.rules"), createFirestoreRules())
  await writeFileIfMissing(join(appDir, "storage.rules"), createStorageRules())
  await writeFileIfMissing(join(appDir, ".env.example"), "FIRESCOPE_PROJECT=\n")
  await writeFileIfMissing(join(appDir, ".env.local"), "FIRESCOPE_PROJECT=\n")

  if (project) await writeEnvValue(join(appDir, ".env.local"), "FIRESCOPE_PROJECT", project)

  await writeFileIfMissing(
    join(appDir, ".gitignore"),
    `node_modules
.firescope
.firebase
.env
.env.*
!.env.example
*.log
.DS_Store
`,
  )

  log.blank()
  log.success(`Created ${color.bold(packageName)} in ${appDir}`)
  log.blank()
  log.plain("Next steps:")

  if (targetArg) log.plain(`  cd ${targetArg}`)
  log.plain(`  ${installCommand(packageManager)}`)
  log.plain(`  ${runCommand(packageManager, "dev")}`)
  log.blank()
  log.detail("Local emulators use the demo-firescope project until you run connect.")
}
