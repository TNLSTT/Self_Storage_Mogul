export const nextRandom = (state: { seed: number }) => {
  const next = (state.seed * 48271) % 0x7fffffff
  state.seed = next
  return next / 0x7fffffff
}

export const randomBetween = (state: { seed: number }, min: number, max: number) => {
  return min + (max - min) * nextRandom(state)
}
