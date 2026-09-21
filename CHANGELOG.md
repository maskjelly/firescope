# Changelog

All notable changes to Firescope are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-09-22

### Added

- `firescope dev` rebuilds functions when files change, so the emulator loop keeps up with your source.
- `firescope doctor` reports required checks separately from optional warnings, including emulator port availability, and supports `--strict`.
- `--project` support for `connect` and `deploy` for non-interactive runs, plus `--yes` for `init` and `deploy`.
- Config validation with actionable errors for unknown or malformed options.
- Function defaults (`memory`, `timeoutSeconds`, `minInstances`, `maxInstances`, `secrets`) are applied through `setGlobalOptions`.
- `functions.ignore` now filters function discovery, with glob support.
- `http` handlers that return a value now send it as JSON when the response is still open.
- Generated apps include a `tsconfig.json`, `check` script, README, and `.env.example`.
- Per-command help, unknown-command suggestions, colored output, and error hints.
- `create-firescope` prompts for a directory when run without arguments.

### Changed

- Requires Node 22 or newer, `firebase-admin` 14, and `firebase-functions` 7.
- Default Functions runtime is `nodejs22`; generated config enables emulator `singleProjectMode`.
- Generated app package name is sanitized from the directory name.

### Fixed

- `firescope --version` and `firescope --help` now work as documented.
- Windows command resolution for locally installed `firebase-tools`.
- `envInt` and `envBool` reject values that previously passed silently.

## [0.1.1] - 2026-06-05

### Added

- `firescope connect` can enable required GCP/Firebase APIs through `gcloud`.
- Typed Firestore schema helpers (`defineFirestoreSchema`, `collection`, `doc`, `group`).
- Typed function wrappers for HTTP, callable, Firestore, schedule, and Storage triggers.
- Generated Firebase config, rules defaults, and Functions deploy package.

### Changed

- `firescope dev` uses the `demo-firescope` project until a real project is connected.
- Documentation site redesigned and served from `docs/` on `main`.

## [0.1.0] - 2026-06-04

### Added

- Initial release: CLI (`init`, `connect`, `dev`, `build`, `deploy`, `doctor`), config loading, env file support, and function discovery.
