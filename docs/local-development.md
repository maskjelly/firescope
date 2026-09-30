# Verify a local app

Use Node 22 and npm. Java is needed for the Firestore/Storage emulator components; use Java 21 for compatibility with newer Firestore emulator releases. See the [official emulator prerequisites](https://firebase.google.com/docs/emulator-suite/install_and_configure).

```sh
npx firescope@latest init my-app
cd my-app
npm install
npm run check
npm run build
npm run doctor
npm run dev
```

Without a configured cloud project, `dev` chooses `demo-firescope`. Keep all dependent services emulated when using a real project so calls cannot accidentally reach live resources. Open the emulator UI at `http://127.0.0.1:4000`.

## Prove HTTP works

The scaffold exports `hello`. In a second terminal:

```sh
curl --fail http://127.0.0.1:5001/demo-firescope/us-central1/hello
curl --fail http://127.0.0.1:5000/api/hello
```

Both return the greeting JSON. If you set a project/region, use those values in the Functions URL. The second URL uses the scaffold's Hosting rewrite.

Edit a function, save, and call it again. Firescope stages each build, preserves installed dependencies, and replaces the runtime entry only after compilation succeeds. A syntax error leaves the previous working bundle in place and logs the failure. Type errors require `npm run check`; esbuild alone does not reject them. Restart `dev` after changing project identity or emulator ports.

## Verify a callable

The [basic example](../examples/basic) includes `ping`. The minimal scaffold includes only `hello`; add a callable first or run the basic example. Callables use Firebase's envelope:

```sh
curl --fail -H 'Content-Type: application/json' \
  -d '{"data":{"name":"Ada"}}' \
  http://127.0.0.1:5001/demo-firescope/us-central1/ping
```

Use your actual exported function name and input schema. The response envelope contains `result`. A browser client should use the Firebase Functions SDK and `connectFunctionsEmulator`, not import Firescope.

## Troubleshoot

| Symptom | Action |
| --- | --- |
| `firebase-tools` missing | Run `npm install` in the scaffolded app. |
| Java missing | Install the Java version required by your installed emulator release. |
| Port busy | Stop the conflicting service or change emulator ports in config. |
| Function not discovered | Check source directory, ignore patterns, underscore prefix and default export. |
| No rebuilds | Check watcher warning, OS watch limits and source directory; restart `dev`. |
| Permission denied from browser Firestore | Default client rules deny everything. Write explicit rules and test them. |
| Cloud deploy missing env | Configure secrets/platform environment; local dotenv files are not shipped. |

[SDK reference](sdk.md) · [Deploy an app](deployment.md)
