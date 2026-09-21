# Contributing

Thanks for helping improve Firescope. This guide covers local setup, project layout, and the release process.

## Requirements

- Node 22 or newer
- npm 10 or newer

## Setup

```sh
git clone https://github.com/maskjelly/firescope.git
cd firescope
npm install
```

## Scripts

| Command          | What it does                                    |
| ---------------- | ----------------------------------------------- |
| `npm run build`  | Compile `src/` to `dist/`                       |
| `npm run check`  | Type-check `src/` and the public API type tests |
| `npm test`       | Build, then run the Node test suite             |
| `npm run lint`   | Run ESLint                                      |
| `npm run format` | Format the repo with Prettier                   |

Run `npm run check && npm run lint && npm test` before opening a pull request.

## Layout

```txt
src/
  cli/        command implementations, argument parsing, prompts, output
  create/     the create-firescope entry point
  generate/   firebase.json, rules, functions entry, and functions package writers
  functions/  typed wrappers for Firebase Functions v2 triggers
  scaffold/   dependency versions used by generated apps
  config.ts   config types, defaults, and resolution
  env.ts      env file loading and typed env accessors
  firestore.ts typed Firestore schema helpers
  scope.ts    cached firebase-admin app scope
tests/        node:test suites plus type-level API tests
examples/     a complete example app
docs/         the GitHub Pages site
```

## Conventions

- Keep the public API thin. Firescope wraps Firebase; it should not hide it.
- Prefer conventions over configuration, and configuration over code generation.
- Add tests for CLI behavior, generated output, and config handling.
- Update the README and CHANGELOG when behavior changes.

## Testing locally

The test suite covers discovery, config loading and validation, env precedence, generators, the CLI, and an end-to-end build of a scaffolded app.

To try the CLI by hand:

```sh
npm run build
node dist/cli/index.js init /tmp/my-app --yes
node dist/cli/index.js build --cwd /tmp/my-app
```

## Release process

1. Update `CHANGELOG.md` and bump the version in `package.json`.
2. Commit the changes and push to `main`.
3. Tag the release and push the tag:

   ```sh
   git tag v0.2.0
   git push origin v0.2.0
   ```

The release workflow runs checks, tests, and `npm pack`, publishes to npm (when the `NPM_TOKEN` secret is configured), and creates a GitHub release.
