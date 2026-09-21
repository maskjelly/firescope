# Firescope basic example

A complete Firescope app showing function discovery, typed Firestore, and the local emulator workflow.

## Run it

```sh
npm install
npm run dev
```

Local emulators run against the demo project `demo-firescope`. When you are ready to deploy, run `npm run connect` and then `npm run deploy`.

## What is here

```txt
firescope.config.ts          framework configuration
src/db.ts                    typed Firestore schema
src/functions/hello.ts       HTTP function with a hosting rewrite at /api/hello
src/functions/ping.ts        callable function
src/functions/dailySummary.ts scheduled function
src/functions/users/created.ts Firestore trigger -> usersCreated
src/functions/_shared/       underscore-prefixed helper files are not deployed as functions
public/                      static hosting files
```

`npm run build` writes the deployable output to `.firescope/functions` and regenerates `firebase.json`.
