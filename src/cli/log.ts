const colorEnabled =
  process.env.NO_COLOR === undefined &&
  process.env.FORCE_COLOR !== "0" &&
  process.env.TERM !== "dumb" &&
  process.stdout.isTTY === true

function paint(open: string) {
  return (text: string) => (colorEnabled ? `${open}${text}\x1b[0m` : text)
}

export const color = {
  bold: paint("\x1b[1m"),
  dim: paint("\x1b[2m"),
  red: paint("\x1b[31m"),
  green: paint("\x1b[32m"),
  yellow: paint("\x1b[33m"),
  cyan: paint("\x1b[36m"),
  gray: paint("\x1b[90m"),
  orange: paint("\x1b[38;5;214m"),
}

export const symbol = {
  success: "✔",
  error: "✖",
  warn: "!",
  step: "›",
  hint: "→",
}

export const log = {
  intro(message: string) {
    console.log(`\n${color.bold(message)}`)
  },
  step(message: string) {
    console.log(`${color.orange(symbol.step)} ${message}`)
  },
  info(message: string) {
    console.log(`  ${message}`)
  },
  detail(message: string) {
    console.log(`  ${color.gray(message)}`)
  },
  plain(message: string) {
    console.log(message)
  },
  success(message: string) {
    console.log(`${color.green(symbol.success)} ${message}`)
  },
  warn(message: string) {
    console.warn(`${color.yellow(symbol.warn)} ${message}`)
  },
  error(message: string) {
    console.error(`${color.red(symbol.error)} ${message}`)
  },
  hint(message: string) {
    console.log(`  ${color.gray(`${symbol.hint} ${message}`)}`)
  },
  pass(message: string) {
    console.log(`  ${color.green(symbol.success)} ${message}`)
  },
  fail(message: string) {
    console.log(`  ${color.red(symbol.error)} ${message}`)
  },
  skip(message: string) {
    console.log(`  ${color.gray(`- ${message}`)}`)
  },
  blank() {
    console.log("")
  },
}
