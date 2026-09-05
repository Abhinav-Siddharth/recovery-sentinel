export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatInrPrecise(amount: number): string {
  // Fixed two decimals for money amounts such as expected value
  // (₹1,769.85) while keeping the Indian digit grouping used elsewhere.
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function formatLakhs(amount: number): string {
  const lakhs = amount / 100000
  return `₹${lakhs.toFixed(2)}L`
}

export function formatPct(value: number): string {
  // Keep up to two decimals so backend rates such as 0.9717 render as
  // "97.17%", but trim trailing zeros so whole/decimal-one values stay
  // compact (0 → "0%", 4.3 → "4.3%").
  return `${value.toFixed(2).replace(/\.?0+$/, '')}%`
}
