export function sortPair(a: string, b: string) {
  return a < b ? ([a, b] as const) : ([b, a] as const);
}
