export { defineConfig, resolveConfig } from "./config.js"
export type {
  FirescopeConfig,
  FirescopeEmulatorsConfig,
  FirescopeFunctionMemory,
  FirescopeFirestoreConfig,
  FirescopeFunctionsConfig,
  FirescopeHostingConfig,
  FirescopeHostingRewrite,
  FirescopeRuntime,
  FirescopeStorageConfig,
} from "./config.js"
export { env, envBool, envInt, loadEnv } from "./env.js"
export { collection, collectionGroup, defineFirestoreSchema, doc } from "./firestore.js"
export type {
  BoundFirestoreSchema,
  CollectionModel,
  CollectionName,
  FirestoreModel,
  FirestoreSchema,
  FirestoreSchemaApi,
} from "./firestore.js"
export { path } from "./path.js"
export type { PathParams, TypedPath } from "./path.js"
export { getScope, scope } from "./scope.js"
export type { FirescopeScope } from "./scope.js"
