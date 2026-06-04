import { constants } from "node:fs"
import { access, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, relative, resolve } from "node:path"

export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true })
}

export async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T
}

export async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFileSafe(path, `${JSON.stringify(value, null, 2)}\n`)
}

export async function writeFileSafe(path: string, value: string): Promise<void> {
  await ensureDir(dirname(path))
  await writeFile(path, value)
}

export async function writeFileIfMissing(path: string, value: string): Promise<boolean> {
  if (await pathExists(path)) return false
  await writeFileSafe(path, value)
  return true
}

export async function emptyDir(path: string): Promise<void> {
  await rm(path, { recursive: true, force: true })
  await ensureDir(path)
}

export async function listFiles(root: string, extensions = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs"])): Promise<string[]> {
  if (!(await pathExists(root))) return []

  const results: string[] = []

  async function walk(current: string) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue

      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
        continue
      }

      const ext = fullPath.slice(fullPath.lastIndexOf("."))
      if (extensions.has(ext) && !fullPath.endsWith(".d.ts")) {
        results.push(fullPath)
      }
    }
  }

  await walk(root)
  return results.sort()
}

export async function copyDir(source: string, target: string): Promise<void> {
  if (!(await pathExists(source))) return

  await ensureDir(target)
  const entries = await readdir(source, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".firescope" || entry.name === ".git") continue

    const sourcePath = join(source, entry.name)
    const targetPath = join(target, entry.name)

    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath)
    } else {
      await writeFileSafe(targetPath, await readFile(sourcePath, "utf8"))
    }
  }
}

export async function isEmptyDir(path: string): Promise<boolean> {
  if (!(await pathExists(path))) return true
  return (await readdir(path)).length === 0
}

export async function nearestPackageJson(cwd: string): Promise<string | undefined> {
  let current = resolve(cwd)

  while (true) {
    const candidate = join(current, "package.json")
    if (await pathExists(candidate)) return candidate


    const next = dirname(current)
    if (next === current) return undefined
    current = next
  }
}

export async function fileSize(path: string): Promise<number> {
  return (await stat(path)).size
}

export function toPosix(path: string): string {
  return path.replaceAll("\\", "/")
}

export function relativePosix(from: string, to: string): string {
  return toPosix(relative(from, to))
}
