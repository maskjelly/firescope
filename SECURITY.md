# Security Policy

## Supported versions

The latest published minor release receives security fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems. Use GitHub's private
vulnerability reporting at https://github.com/maskjelly/firescope/security/advisories/new
or email the maintainer listed in `package.json`.

Include a description of the issue, steps to reproduce it, and the affected
versions. You can expect an initial response within a few days.

## Scope

Firescope runs locally and generates Firebase configuration. Reports that are
most useful include:

- Command injection or unsafe process spawning in the CLI
- Path traversal or unsafe file writes in generated output
- Secret leakage through generated files, logs, or bundled output
- Unsafe defaults in generated Firestore or Storage rules
