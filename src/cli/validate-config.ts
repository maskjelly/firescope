import type { FirescopeConfig } from "../config.js"
import { FirescopeError } from "./errors.js"
import { closestMatch } from "./suggest.js"

const topLevelKeys = ["project", "region", "runtime", "functions", "firestore", "storage", "hosting", "emulators"]

const functionsKeys = ["source", "ignore", "secrets", "memory", "timeoutSeconds", "minInstances", "maxInstances"]
const firestoreKeys = ["rules", "indexes"]
const storageKeys = ["rules"]
const hostingKeys = ["public", "cleanUrls", "trailingSlash", "ignore", "rewrites", "headers"]

function invalid(message: string, hint?: string): never {
  throw new FirescopeError(message, hint)
}

function asRecord(value: unknown, label: string, source: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    invalid(`${label} must be an object in ${source}`)
  }

  return value as Record<string, unknown>
}

function assertString(value: unknown, label: string, source: string): asserts value is string {
  if (typeof value !== "string") invalid(`${label} must be a string in ${source}`)
}

function assertBoolean(value: unknown, label: string, source: string): asserts value is boolean {
  if (typeof value !== "boolean") invalid(`${label} must be a boolean in ${source}`)
}

function assertNumber(value: unknown, label: string, source: string): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) invalid(`${label} must be a number in ${source}`)
}

function assertStringArray(value: unknown, label: string, source: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string")) {
    invalid(`${label} must be an array of strings in ${source}`)
  }
}

function assertKnownKeys(value: Record<string, unknown>, keys: string[], label: string, source: string): void {
  for (const key of Object.keys(value)) {
    if (keys.includes(key)) continue
    const suggestion = closestMatch(key, keys)
    invalid(
      `Unknown option "${key}" in ${label} (${source})`,
      suggestion
        ? `Did you mean "${suggestion}"? Valid options: ${keys.join(", ")}.`
        : `Valid options: ${keys.join(", ")}.`,
    )
  }
}

function assertPort(value: unknown, label: string, source: string): void {
  assertNumber(value, label, source)
  if (value < 1 || value > 65535) invalid(`${label} must be a port between 1 and 65535 in ${source}`)
}

function validateFunctions(value: unknown, source: string): void {
  const functions = asRecord(value, "functions", source)
  assertKnownKeys(functions, functionsKeys, "functions", source)

  if (functions.source !== undefined) assertString(functions.source, "functions.source", source)
  if (functions.ignore !== undefined) assertStringArray(functions.ignore, "functions.ignore", source)
  if (functions.secrets !== undefined) assertStringArray(functions.secrets, "functions.secrets", source)
  if (functions.memory !== undefined) assertString(functions.memory, "functions.memory", source)

  if (functions.timeoutSeconds !== undefined) {
    const timeoutSeconds = functions.timeoutSeconds
    assertNumber(timeoutSeconds, "functions.timeoutSeconds", source)
    if (timeoutSeconds < 1 || timeoutSeconds > 3600) {
      invalid(`functions.timeoutSeconds must be between 1 and 3600 in ${source}`)
    }
  }

  if (functions.minInstances !== undefined) {
    const minInstances = functions.minInstances
    assertNumber(minInstances, "functions.minInstances", source)
    if (minInstances < 0) invalid(`functions.minInstances must be zero or greater in ${source}`)
  }

  if (functions.maxInstances !== undefined) {
    const maxInstances = functions.maxInstances
    assertNumber(maxInstances, "functions.maxInstances", source)
    if (maxInstances < 1) invalid(`functions.maxInstances must be one or greater in ${source}`)
  }
}

function validateFirestore(value: unknown, source: string): void {
  const firestore = asRecord(value, "firestore", source)
  assertKnownKeys(firestore, firestoreKeys, "firestore", source)
  if (firestore.rules !== undefined) assertString(firestore.rules, "firestore.rules", source)
  if (firestore.indexes !== undefined) assertString(firestore.indexes, "firestore.indexes", source)
}

function validateStorage(value: unknown, source: string): void {
  const storage = asRecord(value, "storage", source)
  assertKnownKeys(storage, storageKeys, "storage", source)
  if (storage.rules !== undefined) assertString(storage.rules, "storage.rules", source)
}

function validateHosting(value: unknown, source: string): void {
  const hosting = asRecord(value, "hosting", source)
  assertKnownKeys(hosting, hostingKeys, "hosting", source)

  if (hosting.public !== undefined) assertString(hosting.public, "hosting.public", source)
  if (hosting.cleanUrls !== undefined) assertBoolean(hosting.cleanUrls, "hosting.cleanUrls", source)
  if (hosting.trailingSlash !== undefined) assertBoolean(hosting.trailingSlash, "hosting.trailingSlash", source)
  if (hosting.ignore !== undefined) assertStringArray(hosting.ignore, "hosting.ignore", source)

  if (hosting.rewrites !== undefined) {
    if (!Array.isArray(hosting.rewrites)) invalid(`hosting.rewrites must be an array in ${source}`)

    for (const [index, entry] of hosting.rewrites.entries()) {
      const label = `hosting.rewrites[${index}]`
      const rewrite = asRecord(entry, label, source)
      assertKnownKeys(rewrite, ["source", "function", "run", "destination"], label, source)
      assertString(rewrite.source, `${label}.source`, source)

      const targets = [rewrite.function, rewrite.destination, rewrite.run].filter((target) => target !== undefined)
      if (targets.length !== 1) invalid(`Set exactly one of function, destination, or run in ${label} (${source})`)
    }
  }

  if (hosting.headers !== undefined) {
    if (!Array.isArray(hosting.headers)) invalid(`hosting.headers must be an array in ${source}`)

    for (const [index, entry] of hosting.headers.entries()) {
      const label = `hosting.headers[${index}]`
      const header = asRecord(entry, label, source)
      assertKnownKeys(header, ["source", "headers"], label, source)
      assertString(header.source, `${label}.source`, source)

      if (!Array.isArray(header.headers)) invalid(`${label}.headers must be an array in ${source}`)

      for (const [headerIndex, headerEntry] of header.headers.entries()) {
        const entryLabel = `${label}.headers[${headerIndex}]`
        const parsed = asRecord(headerEntry, entryLabel, source)
        assertKnownKeys(parsed, ["key", "value"], entryLabel, source)
        assertString(parsed.key, `${entryLabel}.key`, source)
        assertString(parsed.value, `${entryLabel}.value`, source)
      }
    }
  }
}

function validateEmulators(value: unknown, source: string): void {
  const emulators = asRecord(value, "emulators", source)

  for (const [key, entry] of Object.entries(emulators)) {
    if (entry === undefined) continue
    if (key === "singleProjectMode") assertBoolean(entry, "emulators.singleProjectMode", source)
    else assertPort(entry, `emulators.${key}`, source)
  }
}

export function validateConfig(config: FirescopeConfig, source: string): void {
  const raw = asRecord(config, "firescope.config", source)
  assertKnownKeys(raw, topLevelKeys, "firescope.config", source)

  if (config.project !== undefined) assertString(config.project, "project", source)
  if (config.region !== undefined) assertString(config.region, "region", source)

  if (config.runtime !== undefined) {
    assertString(config.runtime, "runtime", source)
    if (!/^nodejs\d+$/.test(config.runtime)) {
      invalid(
        `Invalid runtime "${config.runtime}" in ${source}`,
        'Use a Firebase Functions runtime such as "nodejs22".',
      )
    }
  }

  if (config.functions !== undefined) validateFunctions(config.functions, source)
  if (config.firestore !== undefined && config.firestore !== false) validateFirestore(config.firestore, source)
  if (config.storage !== undefined && config.storage !== false) validateStorage(config.storage, source)
  if (config.hosting !== undefined && config.hosting !== false) validateHosting(config.hosting, source)
  if (config.emulators !== undefined) validateEmulators(config.emulators, source)
}
