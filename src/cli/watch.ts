import { watch, type FSWatcher } from "node:fs"
import { dirname, join, relative } from "node:path"
import type { FirescopeConfig } from "../config.js"
import { buildCommand } from "./build.js"
import { findConfig } from "./config-loader.js"
import { color, log } from "./log.js"
import type { CliContext } from "./types.js"

const rebuildDelay = 120

export async function watchSources(context: CliContext, config: Required<FirescopeConfig>) {
  const sourceRoot = join(context.cwd, config.functions.source ?? "src/functions")
  const parent = dirname(sourceRoot)
  const watchRoot = parent.startsWith(context.cwd) && parent !== context.cwd ? parent : sourceRoot
  const configPath = await findConfig(context.cwd)
  const paths = configPath ? [watchRoot, configPath] : [watchRoot]

  let timer: NodeJS.Timeout | undefined
  let building = false
  let queued = false

  const rebuild = async () => {
    if (building) {
      queued = true
      return
    }

    building = true
    try {
      await buildCommand(context)
      log.success("Rebuilt functions")
    } catch (error) {
      log.error(error instanceof Error ? error.message : String(error))
    } finally {
      building = false
      if (queued) {
        queued = false
        await rebuild()
      }
    }
  }

  const schedule = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => void rebuild(), rebuildDelay)
  }

  const watchers: FSWatcher[] = []

  for (const path of paths) {
    try {
      watchers.push(watch(path, { recursive: true }, schedule))
    } catch {
      log.warn(`Could not watch ${relative(context.cwd, path) || path} for changes`)
    }
  }

  log.info(color.dim(`Watching ${relative(context.cwd, watchRoot) || "."} for changes`))

  return () => {
    if (timer) clearTimeout(timer)
    for (const watcher of watchers) watcher.close()
  }
}
