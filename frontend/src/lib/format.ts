export function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export function formatLakhs(amount: number): string {
  const lakhs = amount / 100000
  return `₹${lakhs.toFixed(2)}L`
}

export function formatPct(value: number): string {
  return `${value.toFixed(1)}%`
}
