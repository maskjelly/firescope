export function editDistance(left: string, right: string): number {
  const rows = left.length + 1
  const columns = right.length + 1
  const matrix: number[][] = Array.from({ length: rows }, () => Array.from({ length: columns }, () => 0))

  for (let row = 0; row < rows; row += 1) matrix[row][0] = row
  for (let column = 0; column < columns; column += 1) matrix[0][column] = column

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      )
    }
  }

  return matrix[rows - 1][columns - 1]
}

export function closestMatch(input: string, candidates: string[], maxDistance = 3): string | undefined {
  let best: string | undefined
  let bestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const distance = editDistance(input.toLowerCase(), candidate.toLowerCase())
    if (distance < bestDistance) {
      bestDistance = distance
      best = candidate
    }
  }

  return bestDistance <= maxDistance ? best : undefined
}
