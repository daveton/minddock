type Sample = {
  durationMs: number
  at: number
}

const keydownQueue: number[] = []
const samples: Sample[] = []
const MAX_PENDING_KEYDOWNS = 500

function percentile(values: number[], p: number) {
  if (!values.length) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * p) - 1))
  return sorted[index]
}

export function markKeydown() {
  keydownQueue.push(performance.now())

  if (keydownQueue.length > MAX_PENDING_KEYDOWNS) {
    keydownQueue.splice(0, keydownQueue.length - MAX_PENDING_KEYDOWNS)
  }
}

export function markEditorUpdate() {
  const start = keydownQueue.shift()
  if (start === undefined) {
    return
  }

  samples.push({
    durationMs: performance.now() - start,
    at: Date.now(),
  })
}

export function getInputLatencyStats() {
  const values = samples.map((item) => item.durationMs)
  return {
    count: values.length,
    p50: percentile(values, 0.5),
    p95: percentile(values, 0.95),
    max: values.length ? Math.max(...values) : 0,
  }
}

export function exportInputLatencySamples() {
  return samples.map((item) => ({ ...item }))
}

export function resetInputLatencySamples() {
  keydownQueue.length = 0
  samples.length = 0
}
