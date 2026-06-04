import type { FirescopeConfig } from "../config.js"

export function createFirebaseJson(config: Required<FirescopeConfig>) {
  const firebaseJson: Record<string, unknown> = {
    functions: {
      source: ".firescope/functions",
      runtime: config.runtime,
      ignore: ["node_modules", ".git", "firebase-debug.log", "firebase-debug.*.log"],
    },
    emulators: config.emulators,
  }

  if (config.hosting !== false) {
    firebaseJson.hosting = {
      public: config.hosting.public ?? "public",
      cleanUrls: config.hosting.cleanUrls,
      trailingSlash: config.hosting.trailingSlash,
      ignore: config.hosting.ignore,
      rewrites: config.hosting.rewrites,
      headers: config.hosting.headers,
    }
  }

  return stripUndefined(firebaseJson)
}

export function createFirebaserc(project: string) {
  return {
    projects: {
      default: project,
    },
  }
}

function stripUndefined<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripUndefined) as T
  if (!value || typeof value !== "object") return value

  const result: Record<string, unknown> = {}
  for (const [key, nested] of Object.entries(value)) {
    if (nested !== undefined) result[key] = stripUndefined(nested)
  }

  return result as T
}
