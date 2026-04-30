export function debounce<T extends (...args: never[]) => void | Promise<void>>(
  fn: T,
  delay: number,
) {
  let timer: number | undefined

  return (...args: Parameters<T>) => {
    window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      void fn(...args)
    }, delay)
  }
}
