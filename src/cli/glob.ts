function globToRegExp(pattern: string): RegExp {
  let source = "^"

  for (let index = 0; index < pattern.length; index += 1) {
    const char = pattern[index]

    if (char === "*") {
      if (pattern[index + 1] === "*") {
        source += ".*"
        index += 1
        if (pattern[index + 1] === "/") index += 1
      } else {
        source += "[^/]*"
      }
      continue
    }

    if (char === "?") {
      source += "[^/]"
      continue
    }

    source += char.replace(/[.+^${}()|[\]\\]/g, "\\$&")
  }

  return new RegExp(`${source}$`)
}

export function matchesGlob(path: string, pattern: string): boolean {
  const normalized = pattern.replaceAll("\\", "/").replace(/^\.\//, "")

  if (!normalized.includes("/")) {
    const matcher = globToRegExp(normalized)
    return path.split("/").some((segment) => matcher.test(segment))
  }

  return globToRegExp(normalized).test(path)
}

export function matchesAnyGlob(path: string, patterns: string[]): boolean {
  return patterns.some((pattern) => matchesGlob(path, pattern))
}
