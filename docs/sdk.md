# Firescope SDK reference

Firescope is a server-side library for Firebase Admin and Functions v2. Browser apps use the Firebase client SDK; never bundle Firescope or service-account credentials into browser code.

## Imports

| Module | Exports |
| --- | --- |
| `firescope` | `defineConfig`, `resolveConfig`, `scope`, `getScope`, `loadEnv`, `env`, `envInt`, `envBool`, `path`, `defineFirestoreSchema`, `collection`, `doc`, `collectionGroup` |
| `firescope/functions` | `http`, `callable`, `firestore`, `storage`, `schedule`, and their context/options types |
| `firescope/firestore` | Schema and reference helpers and types |

The compiled declarations are included in the npm package. See [the checked TypeScript examples](../tests/types/usage.ts) and [the runtime handler tests](../tests/handlers.test.mjs).

## Function handlers

Every function file has a default export. Files and directories starting with `_` are helpers. Nested names become camel-case exports (`users/created.ts` → `usersCreated`). Name collisions fail the build.

### HTTP

`http(handler, options?)` receives `{ scope, env, req, res }`. It returns your value as JSON if you have not already sent a response. Return `undefined` after responding yourself. HTTP handlers must validate input, verify identity, and choose their own error status.

```ts
import { http } from "firescope/functions"

export default http(async ({ req, res, scope }) => {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
  if (!bearer) { res.status(401).json({ error: "Sign in first" }); return }
  let uid: string
  try { uid = (await scope.auth.verifyIdToken(bearer)).uid }
  catch { res.status(401).json({ error: "Invalid token" }); return }
  return { uid }
}, { cors: ["https://your-app.example"], maxInstances: 10 })
```

### Callable

`callable<Input, Result>(handler, options?)` receives `{ scope, env, request, data, auth }`. Authentication metadata is available, but anonymous callers are allowed unless your handler rejects them. TypeScript types do not validate incoming JSON.

```ts
import { callable } from "firescope/functions"
import { HttpsError } from "firebase-functions/v2/https"

export default callable<{ name: string }, { message: string }>(({ data, auth }) => {
  if (!auth) throw new HttpsError("unauthenticated", "Sign in first")
  if (typeof data?.name !== "string" || data.name.length > 80)
    throw new HttpsError("invalid-argument", "name must be a string of at most 80 characters")
  return { message: `Hello ${data.name}` }
}, { enforceAppCheck: true })
```

### Firestore

`firestore.document("users/{userId}")` exposes `onCreate`, `onUpdate`, `onDelete`, and `onWrite`. Each accepts `(handler, options?)`. `event.params` is inferred from the path; create/delete use a snapshot, update/write use a change. Check `event.data` before reading it. Triggers may be delivered more than once: use the event ID or a transaction to deduplicate external effects. Avoid writing back to the triggering path without a guard.

```ts
import { firestore } from "firescope/functions"

export default firestore.document("users/{userId}").onCreate(async ({ event, scope }) => {
  if (!event.data) return
  await scope.db.doc(`audit/${event.id}`).set({ userId: event.params.userId })
})
```

### Storage and schedules

`storage.object(bucket?).onFinalize(handler, options?)` also supports `onDelete`, `onArchive`, and `onMetadataUpdate`; handlers receive `{ scope, env, event }`. Pass an explicit bucket or configure the Firebase default bucket.

`schedule(expression, handler, options?)` accepts a cron expression or Firebase schedule string. The context is `{ scope, env, event }`. For example, `schedule("every 24 hours", handler, { timeZone: "UTC" })`. Scheduled jobs and storage events need their actual cloud services for full deployment validation; local handler invocation tests only verify your wrapper behavior.

All wrapper options are the underlying Firebase Functions v2 options. Per-handler options override global defaults. Configure global memory, timeout, instance limits and secret names in `firescope.config.ts`.

## Admin scope

`getScope()` and lazy `scope` share a cached Admin app and services: `app`, `auth`, `db`, `functions`, `messaging`, `storage`. Project ID is read from `FIRESCOPE_PROJECT`, `GCLOUD_PROJECT`, `GOOGLE_CLOUD_PROJECT`, then `FIREBASE_CONFIG`. Configure `FIRESCOPE_STORAGE_BUCKET` for a custom default bucket. Firebase-hosted workloads use platform credentials; local production scripts need Application Default Credentials or `FIRESCOPE_SERVICE_ACCOUNT` pointing to a private JSON file.

The Admin SDK bypasses client security rules. Authorization checks in backend handlers still matter. Emulators inject their host variables; do not set emulator variables in production.

## Firestore typing

```ts
import { defineFirestoreSchema, scope } from "firescope"
type Db = { users: { name: string; createdAt: string } }
const data = defineFirestoreSchema<Db>()
await data.collection("users").add({ name: "Ada", createdAt: new Date().toISOString() })
const user = await data.doc("users", "ada").get()
const bound = data.from(scope.db)
```

`collection`, `doc`, and `group` return real Admin references, preserving queries, transactions and batches. Schema names and document writes are checked at compile time; stored documents still need runtime validation when trusted shape matters. Reads can return a missing document (`user.exists` is false). Standalone `collection<Model>(path, db?)`, `doc<Model>(fullDocumentPath, db?)`, and `collectionGroup<Model>(collectionId, db?)` work with arbitrary paths.

## Environment access

`loadEnv({ cwd?, mode?, override? })` loads `.env`, `.env.local`, `.env.<mode>`, `.env.<mode>.local` once per directory/mode combination. Later files win; existing process values win unless `override` is true. `env(name, { fallback?, optional? })` returns a string or throws; optional missing values return an empty string. `envInt` requires a safe integer; `envBool` accepts `1/true/yes/on` and `0/false/no/off`.

Local dotenv files are not automatically copied into the generated Functions package. Set deployment secrets with the Firebase CLI and list them under `functions.secrets`; use platform environment configuration for nonsecrets. Never place credentials in the Hosting directory.

## Limits

Firescope bundles app code and its own runtime; Firebase Admin/Functions remain external dependencies. Packages requiring native assets or dynamic runtime files may need packaging support beyond this bundle. Keep Node 22 as the default unless your Firebase CLI and target runtime support your chosen version. Esbuild compiles TypeScript without checking types: run your app's `npm run check` before deploying. See [local verification](local-development.md) and [deployment](deployment.md).
