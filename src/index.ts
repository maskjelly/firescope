export { defineConfig, resolveConfig } from "./config.js"
export type {
  FirescopeConfig,
  FirescopeEmulatorsConfig,
  FirescopeFunctionMemory,
  FirescopeFunctionsConfig,
  FirescopeHostingConfig,
  FirescopeHostingRewrite,
  FirescopeRuntime,
} from "./config.js"
export { env, envBool, envInt, loadEnv } from "./env.js"
export { getScope, scope } from "./scope.js"
export type { FirescopeScope } from "./scope.js"
