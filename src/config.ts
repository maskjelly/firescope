export type FirescopeRuntime = "nodejs20" | "nodejs22" | (string & {})

export type FirescopeFunctionMemory =
  | "128MiB"
  | "256MiB"
  | "512MiB"
  | "1GiB"
  | "2GiB"
  | "4GiB"
  | "8GiB"
  | (string & {})

export interface FirescopeFunctionsConfig {
  source?: string
  ignore?: string[]
  secrets?: string[]
  memory?: FirescopeFunctionMemory
  timeoutSeconds?: number
  minInstances?: number
  maxInstances?: number
}

export interface FirescopeHostingRewrite {
  source: string
  function?: string
  run?: {
    serviceId: string
    region?: string
  }
  destination?: string
}

export interface FirescopeHostingConfig {
  public?: string
  cleanUrls?: boolean
  trailingSlash?: boolean
  ignore?: string[]
  rewrites?: FirescopeHostingRewrite[]
  headers?: Array<{
    source: string
    headers: Array<{ key: string; value: string }>
  }>
}

export interface FirescopeEmulatorsConfig {
  auth?: number
  firestore?: number
  functions?: number
  hosting?: number
  storage?: number
  pubsub?: number
  ui?: number
}

export interface FirescopeConfig {
  project?: string
  region?: string
  runtime?: FirescopeRuntime
  functions?: FirescopeFunctionsConfig
  hosting?: FirescopeHostingConfig | false
  emulators?: FirescopeEmulatorsConfig
}

export function defineConfig<const Config extends FirescopeConfig>(config: Config): Config {
  return config
}

export const defaultConfig = {
  region: "us-central1",
  runtime: "nodejs20",
  functions: {
    source: "src/functions",
    ignore: ["node_modules", ".git", "dist", ".firescope"],
  },
  hosting: {
    public: "public",
    cleanUrls: true,
    ignore: ["firebase.json", "**/.*", "**/node_modules/**"],
  },
  emulators: {
    auth: 9099,
    firestore: 8080,
    functions: 5001,
    hosting: 5000,
    storage: 9199,
    pubsub: 8085,
    ui: 4000,
  },
} satisfies Required<Pick<FirescopeConfig, "region" | "runtime" | "functions" | "hosting" | "emulators">>

export function resolveConfig(config: FirescopeConfig): Required<FirescopeConfig> {
  return {
    project: config.project ?? "",
    region: config.region ?? defaultConfig.region,
    runtime: config.runtime ?? defaultConfig.runtime,
    functions: {
      ...defaultConfig.functions,
      ...config.functions,
    },
    hosting:
      config.hosting === false
        ? false
        : {
            ...defaultConfig.hosting,
            ...(config.hosting ?? {}),
          },
    emulators: {
      ...defaultConfig.emulators,
      ...(config.emulators ?? {}),
    },
  }
}
