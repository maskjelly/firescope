import { existsSync, readFileSync } from "node:fs"
import {
  cert,
  getApps,
  initializeApp,
  type App,
  type AppOptions,
} from "firebase-admin/app"
import { getAuth, type Auth } from "firebase-admin/auth"
import { getFirestore, type Firestore } from "firebase-admin/firestore"
import { getFunctions, type Functions } from "firebase-admin/functions"
import { getMessaging, type Messaging } from "firebase-admin/messaging"
import { getStorage, type Storage } from "firebase-admin/storage"
import { loadEnv } from "./env.js"

export interface FirescopeScope {
  app: App
  auth: Auth
  db: Firestore
  functions: Functions
  messaging: Messaging
  storage: Storage
}

let cachedScope: FirescopeScope | undefined

function appOptionsFromEnvironment(): AppOptions | undefined {
  const serviceAccountPath = process.env.FIRESCOPE_SERVICE_ACCOUNT
  const storageBucket = process.env.FIRESCOPE_STORAGE_BUCKET
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? process.env.FIREBASE_CONFIG_PROJECT

  const options: AppOptions = {}

  if (serviceAccountPath) {
    if (!existsSync(serviceAccountPath)) {
      throw new Error(`FIRESCOPE_SERVICE_ACCOUNT does not exist: ${serviceAccountPath}`)
    }

    options.credential = cert(JSON.parse(readFileSync(serviceAccountPath, "utf8")))
  }

  if (storageBucket) options.storageBucket = storageBucket
  if (projectId) options.projectId = projectId

  return Object.keys(options).length ? options : undefined
}

export function getScope(): FirescopeScope {
  loadEnv()

  if (cachedScope) return cachedScope

  const app = getApps()[0] ?? initializeApp(appOptionsFromEnvironment())

  cachedScope = {
    app,
    auth: getAuth(app),
    db: getFirestore(app),
    functions: getFunctions(app),
    messaging: getMessaging(app),
    storage: getStorage(app),
  }

  return cachedScope
}

export const scope = new Proxy({} as FirescopeScope, {
  get(_target, property: keyof FirescopeScope) {
    return getScope()[property]
  },
})
