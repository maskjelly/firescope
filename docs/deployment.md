# Deploy and operate an app

Use a separate Firebase project for staging. Cloud deploys need billing and the permissions/APIs required by your Firebase services; `firescope connect` can select an existing project. See [Firebase's deployment guide](https://firebase.google.com/docs/functions/get-started).

```sh
npm ci
npm run check
npm run build
npm run connect
# Set secrets before deploy if handlers use them:
npx firebase functions:secrets:set API_KEY --project your-staging-project
npm run deploy -- --project your-staging-project --yes
```

`deploy` rebuilds before invoking the Firebase CLI. It preserves a last-good bundle on compilation failure but will not deploy that stale bundle because the command fails. The generated package's Node engine matches the configured runtime. Configured Firestore index files are created empty when missing; existing index/rules files are preserved. Review generated `firebase.json` and your rules before every release.

After staging deploy, verify each exported HTTP/callable URL, an authenticated call, a rejected anonymous/malformed call, relevant Firestore/Storage triggers, and logs. Run rule tests separately: Admin SDK handler tests do not verify client rules. Set `maxInstances`, timeouts, budget alerts and retention for logs/artifact images before production.

## Rollback

Record the source commit and package lock for every deploy. To roll back Functions, check out the previous known-good commit, install from its lockfile, type-check, build and deploy it to the same project. Check for renamed/deleted exports before confirming Firebase's deletion prompts. Firestore data and schema migrations are independent of code rollback: keep migrations compatible and back up data first. Hosting has its own release rollback in Firebase.

## Framework verification

From the Firescope repository:

```sh
npm ci
npm run check
npm run lint
npm run format:check
npm test
npm pack
```

Tests cover source discovery, generated packages, invalid config, failed rebuild preservation, watchers, literal SDK handler contexts and typed references. They do not claim a live Firebase deployment. [SDK reference](sdk.md) · [Local development](local-development.md)
