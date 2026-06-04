# Firescope

Firescope is a convention-first framework for Firebase apps. It keeps Firebase's power, but removes the repetitive setup: admin SDK bootstrapping, function exports, generated Firebase config, local env loading, emulator wiring, project connection, and deploy commands.

## Quick Start

```sh
npx firescope@latest init my-app
cd my-app
npm install
npx firescope connect
npx firescope dev
```

Deploy:

```sh
npx firescope deploy
```

## App Shape

```txt
my-app/
  firescope.config.ts
  src/
    db.ts
    functions/
      hello.ts
      users/
        create.ts
  public/
  .env.local
```

## Config

```ts
import { defineConfig } from "firescope"

export default defineConfig({
  project: process.env.FIRESCOPE_PROJECT,
  region: "us-central1",
  runtime: "nodejs20",
  functions: {
    source: "src/functions",
  },
  hosting: {
    public: "public",
    cleanUrls: true,
  },
})
```

## HTTP Function

```ts
import { http } from "firescope/functions"
import { data } from "../db.js"

export default http(async ({ scope, res }) => {
  const snapshot = await data.collection("users", scope.db).limit(10).get()

  res.json({
    users: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
  })
})
```

## Typed Firestore

Define your data model once. Firescope adds type-safe collections and docs without adding runtime validation or abstraction overhead.

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
```

Collection names and document shapes are checked by TypeScript. `data.collection("userz")` and missing required fields fail at compile time.

## Callable Function

```ts
import { callable } from "firescope/functions"

export default callable<{ name: string }>(async ({ data }) => {
  return { message: `Hello ${data.name}` }
})
```

## Firestore Trigger

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

`event.params.userId` is inferred from `"users/{userId}"`. Rename the path param and TypeScript forces the handler to follow.

## CLI

```txt
firescope init      scaffold an app
firescope connect   login, select project, write config, enable APIs
firescope dev       build and start Firebase emulators
firescope build     generate Firebase-compatible output
firescope deploy    build and deploy
firescope doctor    validate local setup
```

The CLI expects `firebase-tools` for emulator and deploy commands. `firescope connect` can also use `gcloud` to enable required Firebase/GCP APIs automatically.

## What Firescope Generates

```txt
firebase.json
.firebaserc
.firescope/
  functions/
    package.json
    src/index.ts
    lib/index.js
```

The generated Functions package is what Firebase deploys. The source app stays clean.

Firescope bundles its own runtime helpers into the generated Functions output and leaves Firebase packages external. That keeps deploy output self-contained while preserving Firebase's runtime packages.

## Function Discovery

Every supported source file under `src/functions` is treated as a Firebase function export by default:

```txt
src/functions/hello.ts          -> hello
src/functions/users/created.ts  -> usersCreated
```

Use underscore-prefixed files or folders for local helpers that should not become functions:

```txt
src/functions/_shared/audit.ts
src/functions/users/_helpers.ts
```

## Environment Files

Firescope loads env files in this order, with later files winning over earlier files:

```txt
.env
.env.local
.env.<mode>
.env.<mode>.local
```

Existing shell environment variables are preserved by default. Pass `override: true` to `loadEnv` when file values should replace existing process values.

## Local Credentials

Do not commit service account JSON files. Prefer emulators locally and Firebase runtime credentials in production.

Optional local admin credential support exists for advanced cases:

```txt
FIRESCOPE_SERVICE_ACCOUNT=./secrets/service-account.json
FIRESCOPE_STORAGE_BUCKET=my-app.appspot.com
```

## Current Status

This is the first working framework version. It is intentionally small: conventions, CLI, runtime scope, typed Firestore helpers, typed function wrappers, generated Firebase config, generated deploy output, and onboarding checks.

## Release

Releases are created from version tags:

```sh
git tag v0.1.0
git push origin v0.1.0
```

The release workflow runs type checks, tests, builds an npm tarball, and publishes a GitHub release.

## GitHub Pages

The project page is served from `docs/` on `main`: https://maskjelly.github.io/firescope/
