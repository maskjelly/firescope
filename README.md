# Firescope

Firescope is a convention-first framework for Firebase apps. It keeps Firebase's power, but removes the repetitive setup: admin SDK bootstrapping, function exports, generated Firebase config, local env loading, emulator wiring, project connection, and deploy commands.

## Quick Start

```sh
npm create firescope@latest my-app
cd my-app
npm install
firescope connect
firescope dev
```

Deploy:

```sh
firescope deploy
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

## Local Credentials

Do not commit service account JSON files. Prefer emulators locally and Firebase runtime credentials in production.

Optional local admin credential support exists for advanced cases:

```txt
FIRESCOPE_SERVICE_ACCOUNT=./secrets/service-account.json
FIRESCOPE_STORAGE_BUCKET=my-app.appspot.com
```

## Current Status

This is the first working framework version. It is intentionally small: conventions, CLI, runtime scope, typed Firestore helpers, typed function wrappers, generated Firebase config, generated deploy output, and onboarding checks.
