#!/usr/bin/env node
import { initCommand } from "../cli/init.js"

const args = process.argv.slice(2)

await initCommand({
  cwd: process.cwd(),
  args,
  flags: new Map(),
})
