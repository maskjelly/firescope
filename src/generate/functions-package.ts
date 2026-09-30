import { readFile } from "node:fs/promises"
import { scaffoldVersions } from "../scaffold/versions.js"
import { nearestPackageJson } from "../cli/fs.js"

export async function createFunctionsPackage(cwd: string, runtime = "nodejs22") {
  const packagePath = await nearestPackageJson(cwd)
  let firebaseAdminVersion = scaffoldVersions.firebaseAdmin
  let firebaseFunctionsVersion = scaffoldVersions.firebaseFunctions

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
      node: runtime.replace("nodejs", ""),
    },
  }
}
