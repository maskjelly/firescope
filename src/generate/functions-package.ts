import { readFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { nearestPackageJson, pathExists, relativePosix } from "../cli/fs.js"

export async function createFunctionsPackage(cwd: string, functionsRoot: string) {
  const packagePath = await nearestPackageJson(cwd)
  let firescopeVersion = "^0.1.0"
  let firebaseAdminVersion = "^13.0.2"
  let firebaseFunctionsVersion = "^6.2.0"

  if (packagePath) {
    const pkg = JSON.parse(await readFile(packagePath, "utf8")) as {
      name?: string
      version?: string
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }

    const deps = { ...pkg.devDependencies, ...pkg.dependencies }
    firescopeVersion = deps.firescope ?? (pkg.name === "firescope" ? `^${pkg.version ?? "0.1.0"}` : firescopeVersion)
    if (firescopeVersion.startsWith("file:")) {
      const target = resolve(dirname(packagePath), firescopeVersion.slice("file:".length))
      let relativeTarget = relativePosix(functionsRoot, target)
      if (!relativeTarget.startsWith(".")) relativeTarget = `./${relativeTarget}`
      firescopeVersion = `file:${relativeTarget}`
    }
    firebaseAdminVersion = deps["firebase-admin"] ?? firebaseAdminVersion
    firebaseFunctionsVersion = deps["firebase-functions"] ?? firebaseFunctionsVersion
  }

  const localFirescope = join(cwd, "node_modules", "firescope")
  const localPackage = packagePath ? JSON.parse(await readFile(packagePath, "utf8")) as { name?: string } : undefined
  if (!(await pathExists(localFirescope)) && localPackage?.name === "firescope") {
    let relativeTarget = relativePosix(functionsRoot, cwd)
    if (!relativeTarget.startsWith(".")) relativeTarget = `./${relativeTarget}`
    firescopeVersion = `file:${relativeTarget}`
  }

  return {
    name: "firescope-functions",
    private: true,
    type: "module",
    main: "lib/index.js",
    dependencies: {
      "firebase-admin": firebaseAdminVersion,
      "firebase-functions": firebaseFunctionsVersion,
      firescope: firescopeVersion,
    },
    engines: {
      node: ">=20",
    },
  }
}
