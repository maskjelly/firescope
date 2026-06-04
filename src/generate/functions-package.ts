import { readFile } from "node:fs/promises"
import { nearestPackageJson } from "../cli/fs.js"

export async function createFunctionsPackage(cwd: string) {
  const packagePath = await nearestPackageJson(cwd)
  let firebaseAdminVersion = "^13.0.2"
  let firebaseFunctionsVersion = "^6.2.0"

  if (packagePath) {
    const pkg = JSON.parse(await readFile(packagePath, "utf8")) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    const deps = { ...pkg.devDependencies, ...pkg.dependencies }
    firebaseAdminVersion = deps["firebase-admin"] ?? firebaseAdminVersion
    firebaseFunctionsVersion = deps["firebase-functions"] ?? firebaseFunctionsVersion
  }

  return {
    name: "firescope-functions",
    private: true,
    type: "module",
    main: "lib/index.js",
    dependencies: {
      "firebase-admin": firebaseAdminVersion,
      "firebase-functions": firebaseFunctionsVersion,
    },
    engines: {
      node: ">=20",
    },
  }
}
