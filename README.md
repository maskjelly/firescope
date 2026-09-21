# Firescope

**Firebase apps with a clear shape.** A convention-first framework for Firebase: function discovery, a typed admin scope, generated Firebase config, env loading, emulator wiring, and deploy commands.

[![npm](https://img.shields.io/npm/v/firescope.svg)](https://www.npmjs.com/package/firescope)
[![CI](https://github.com/maskjelly/firescope/actions/workflows/ci.yml/badge.svg)](https://github.com/maskjelly/firescope/actions/workflows/ci.yml)
[![license](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![node](https://img.shields.io/badge/node-%3E%3D22-brightgreen.svg)](https://nodejs.org)

- **Docs site:** https://maskjelly.github.io/firescope/
- **Example app:** [`examples/basic`](./examples/basic)
- **Changelog:** [`CHANGELOG.md`](./CHANGELOG.md)

## Why Firescope

Firebase gives you powerful primitives and a lot of glue. Firescope keeps the primitives and writes the glue:

- One file per function, discovered by convention. No export barrel to maintain.
- A typed admin scope (`scope.db`, `scope.auth`, `scope.storage`, ...) instead of repeated SDK bootstrapping.
- Typed Firestore collections and documents without a runtime abstraction layer.
- `firebase.json`, `.firebaserc`, rules defaults, and the deployable Functions package generated from one config file.
- Predictable env file loading and a local emulator loop that rebuilds when you save.
- Project connection and deploys behind two commands.

Firescope is intentionally thin. You still write Firebase Functions v2 code, and you can drop down to the underlying SDK at any time.

## Requirements

- Node 22 or newer
- npm 10 or newer (pnpm, yarn, and bun also work)
- A Firebase project for deploys (local development uses the emulators and a demo project)

## Quick start

```sh
npx firescope@latest init my-app
cd my-app
npm install
npm run dev
```

`create-firescope` is available too:

```sh
npx create-firescope@latest my-app
```

When you are ready to deploy:

```sh
npm run connect
npm run deploy
```

## App shape

```txt
my-app/
  firescope.config.ts    framework configuration
  tsconfig.json
  src/
    db.ts                typed Firestore schema
    functions/
      hello.ts           -> hello
      users/
        created.ts       -> usersCreated
        _shared/
          audit.ts       helpers are not deployed
  public/                static hosting files
  .env.local             local env values (gitignored)
```

`npm run build` generates the Firebase-facing files:

```txt
firebase.json
.firebaserc
firestore.rules
storage.rules
.firescope/
  functions/
    package.json
    src/index.ts
    lib/index.js
```

The generated Functions package is what Firebase deploys. Your source app stays clean.

## Configuration

Everything lives in `firescope.config.ts`:

```ts
import { defineConfig } from "firescope"

export default defineConfig({
  project: process.env.FIRESCOPE_PROJECT,
  region: "us-central1",
  runtime: "nodejs22",
  functions: {
    source: "src/functions",
    ignore: ["**/*.test.ts"],
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    secrets: ["STRIPE_KEY"],
  },
  firestore: {
    rules: "firestore.rules",
    indexes: "firestore.indexes.json",
  },
  storage: {
    rules: "storage.rules",
  },
  hosting: {
    public: "public",
    cleanUrls: true,
    rewrites: [{ source: "/api/hello", function: "hello" }],
  },
  emulators: {
    firestore: 8080,
    ui: 4000,
  },
})
```

| Option                                              | Default                                          | Notes                                                   |
| --------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| `project`                                           | `process.env.FIRESCOPE_PROJECT`                  | Written by `firescope connect`                          |
| `region`                                            | `"us-central1"`                                  | Applied to every generated function                     |
| `runtime`                                           | `"nodejs22"`                                     | `nodejs20`, `nodejs22`, `nodejs24`                      |
| `functions.source`                                  | `"src/functions"`                                | Directory scanned for function files                    |
| `functions.ignore`                                  | `["node_modules", ".git", "dist", ".firescope"]` | Glob patterns excluded from discovery                   |
| `functions.memory`                                  | Firebase default                                 | `128MiB` through `8GiB`                                 |
| `functions.timeoutSeconds`                          | Firebase default                                 | 1 to 3600                                               |
| `functions.minInstances` / `functions.maxInstances` | Firebase default                                 | Applied via `setGlobalOptions`                          |
| `functions.secrets`                                 | none                                             | Secret names exposed to every function                  |
| `firestore` / `storage` / `hosting`                 | enabled                                          | Set to `false` to skip generating that section          |
| `emulators`                                         | standard ports                                   | Port per emulator; `singleProjectMode` is on by default |

Unknown or malformed options fail the build with the file, the option name, and a suggested fix.

## Functions

Every supported file under `src/functions` becomes a Firebase function export. Files and folders that start with `_` are treated as helpers.

```txt
src/functions/hello.ts          -> hello
src/functions/users/created.ts  -> usersCreated
src/functions/users/_helpers.ts -> not deployed
```

### HTTP

```ts
import { http } from "firescope/functions"
import { data } from "../db.js"

export default http(async ({ scope, req, res }) => {
  const snapshot = await data.collection("users", scope.db).limit(10).get()

  return {
    users: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  }
})
```

Returning a value sends it as JSON when the response is still open. Use `res` directly for streaming or custom status codes.

### Callable

```ts
import { callable } from "firescope/functions"

export default callable<{ name: string }>(async ({ data, auth }) => {
  return { message: `Hello ${data.name}`, userId: auth?.uid ?? null }
})
```

### Firestore triggers

```ts
import { firestore } from "firescope/functions"
import { data } from "../db.js"

export default firestore.document("users/{userId}").onCreate(async ({ event, scope }) => {
  await data.collection("audit", scope.db).add({
    type: "user.created",
    userId: event.params.userId,
    createdAt: new Date().toISOString(),
  })
})
```

`event.params.userId` is inferred from `"users/{userId}"`. Rename the path parameter and TypeScript forces the handler to follow. `onUpdate`, `onDelete`, and `onWrite` are available with the same typing.

### Schedule

```ts
import { schedule } from "firescope/functions"

export default schedule("every 24 hours", async ({ event }) => {
  console.log("running", event.jobName)
})
```

### Storage

```ts
import { storage } from "firescope/functions"

export default storage.object().onFinalize(async ({ event }) => {
  console.log("uploaded", event.data.name)
})
```

Pass a bucket to scope a trigger: `storage.object("my-app.appspot.com").onFinalize(...)`. `onDelete`, `onArchive`, and `onMetadataUpdate` are also available.

Every handler receives the same context:

| Field                               | Description                                                              |
| ----------------------------------- | ------------------------------------------------------------------------ |
| `scope`                             | Cached `firebase-admin` app, auth, db, functions, messaging, and storage |
| `env`                               | The typed env accessor from `firescope`                                  |
| `event` / `req` / `res` / `request` | The original Firebase trigger payload                                    |

## Typed Firestore

Define your data model once and get typed collections, documents, and collection groups:

```ts
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
}

export const data = defineFirestoreSchema<AppDb>()
```

```ts
await data.collection("users").add({
  displayName: "Ada",
  createdAt: new Date().toISOString(),
})

const user = await data.doc("users", "ada").get()
const audits = await data.group("audit").get()
```

Collection names and document shapes are checked by TypeScript: `data.collection("userz")` and missing required fields fail at compile time. There is no runtime validation or wrapper object; you get real `firebase-admin` references back.

For ad-hoc paths, use the standalone helpers:

```ts
import { collection, collectionGroup, doc } from "firescope"

const users = collection<{ displayName: string }>("users")
```

Every helper accepts an explicit `db` as the last argument, or `data.from(scope.db)` binds the whole schema to one Firestore instance.

## Environment files

`loadEnv` runs automatically when the scope is created. Files are loaded in this order, with later files winning:

```txt
.env
.env.local
.env.<mode>
.env.<mode>.local
```

`<mode>` comes from `FIRESCOPE_ENV`, then `NODE_ENV`, then `"development"`. Existing shell variables are preserved unless you pass `override: true`.

```ts
import { env, envBool, envInt, loadEnv } from "firescope"

loadEnv({ mode: "test" })

const region = env("REGION", { fallback: "us-central1" })
const port = envInt("PORT", { fallback: "8080" })
const debug = envBool("DEBUG", { fallback: "false" })
```

`env` throws a descriptive error when a required variable is missing. `envInt` and `envBool` reject malformed values instead of coercing them.

## Local credentials

Prefer emulators locally and Firebase runtime credentials in production. Do not commit service account JSON files.

For advanced local cases, Firescope reads:

```txt
FIRESCOPE_SERVICE_ACCOUNT=./secrets/service-account.json
FIRESCOPE_STORAGE_BUCKET=my-app.appspot.com
FIRESCOPE_PROJECT=my-firebase-project
```

## CLI

```txt
firescope init [dir]   Scaffold a new Firescope app
firescope connect      Connect the app to a Firebase project
firescope build        Generate the Firebase-compatible deploy output
firescope dev          Build, watch, and start the Firebase emulators
firescope deploy       Build and deploy the app to Firebase
firescope doctor       Check that the local setup is ready
firescope help [cmd]   Show help for any command
```

Global flags:

```txt
--cwd <dir>            Run in a different project directory
--help, -h             Show help
--version, -v          Show the CLI version
```

Command flags:

| Command   | Flags                                      |
| --------- | ------------------------------------------ |
| `init`    | `--name <name>`, `--project <id>`, `--yes` |
| `connect` | `--project <id>`, `--no-enable-apis`       |
| `dev`     | `--no-watch`                               |
| `deploy`  | `--project <id>`, `--yes`                  |
| `doctor`  | `--strict`                                 |

`dev` and `deploy` forward flags that Firescope does not recognize to the Firebase CLI, so `firescope deploy --only functions` works as expected.

### init

Scaffolds the app shape above and installs nothing. `--yes` accepts the defaults, which makes it safe for scripts and CI. Re-running it inside an existing app only fills in missing files.

### connect

Logs in with `firebase-tools`, lists your projects, writes the selection to `.env.local` and `.firebaserc`, and regenerates `firebase.json`. When `gcloud` is available it offers to enable the Firebase and GCP APIs that Functions and Hosting need.

### dev

Builds the app, starts the emulators, and rebuilds functions whenever files change, so the Functions emulator reloads without restarting. Use `--no-watch` for a single build. Local development uses the demo project `demo-firescope` until you run `connect`.

Generated apps install `firebase-tools` locally, so `npm run dev` works without a global Firebase CLI. Firescope also resolves the local binary when you run `npx firescope dev`.

### build

Discovers functions, writes the generated entry point, bundles `.firescope/functions/lib/index.js` with esbuild, and regenerates `firebase.json`, rules defaults, and `.firebaserc`.

Firescope bundles its own runtime helpers into the output and leaves `firebase-admin` and `firebase-functions` external, so the deploy package stays self-contained without duplicating Firebase's runtime packages.

Safe default `firestore.rules` and `storage.rules` are written when missing. The defaults are closed (`allow read, write: if false`), so emulators never accidentally expose production data. Customize them when your client app needs direct Firestore or Storage access.

### deploy

Confirms the target project, builds, then hands off to `firebase deploy`.

### doctor

Checks Node, config validity, function discovery, `firebase-tools`, authentication, rules files, hosting output, and emulator port availability. Required checks fail the command; optional checks are reported as warnings. Add `--strict` to fail on warnings too.

## Troubleshooting

**`firebase-tools is not installed for this app`**
Run `npm install` in the app directory. Firescope looks for `node_modules/.bin/firebase` first and then your `PATH`.

**Functions do not reload during `npm run dev`**
Make sure watch mode is on (it is by default). Files must live under `functions.source`; helper files can be anywhere but must start with `_` or match `functions.ignore`.

**`No Firebase project configured`**
Run `npm run connect`, or pass `--project <id>` to `deploy`. Local development does not need a project.

**Emulator ports are already in use**
Run `firescope doctor` to see which ports are busy, then change them under `emulators` in `firescope.config.ts`.

**TypeScript cannot find `firescope/functions`**
Run `npm install` so the package is linked into the app, and keep `moduleResolution` set to `NodeNext` (or `Bundler`) in your `tsconfig.json`.

## Development

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for local setup, the test suite, and the release process.

## License

[MIT](./LICENSE)
