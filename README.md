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

export default http(async ({ scope, res }) => {
  const snapshot = await scope.db.collection("users").limit(10).get()

  res.json({
    users: snapshot.docs.map((doc) => doc.data()),
  })
})
```

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

export default firestore.document("users/{userId}").onCreate(async ({ event, scope }) => {
  await scope.db.collection("audit").add({
    type: "user.created",
    userId: event.params.userId,
    createdAt: new Date().toISOString(),
  })
})
```

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

This is the first working framework version. It is intentionally small: conventions, CLI, runtime scope, function wrappers, generated Firebase config, generated deploy output, and onboarding checks.
