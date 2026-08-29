import { formatInr, formatPct } from '../lib/format'

type Kpi = {
  label: string
  value: string
  hint: string
  emphasis: 'risk' | 'ok' | 'neutral'
}

type KpiStripProps = {
  revenueAtRisk: number
  revenueRecovered: number
  recoveryRate: number
  affectedTransactions: number
  escalated: number
  loading?: boolean
  error?: string | null
}

export function KpiStrip({
  revenueAtRisk,
  revenueRecovered,
  recoveryRate,
  affectedTransactions,
  escalated,
  loading = false,
  error = null,
}: KpiStripProps) {
  if (error) {
    return (
      <section className="border border-[#1d3348] bg-[#0a1724] px-5 py-4">
        <p className="font-mono text-[10px] tracking-[0.16em] text-[#7f93a8] uppercase">
          Live metrics
        </p>
        <p className="mt-2 text-sm text-[#f0b45d]">
          Unable to load metrics from the backend.
        </p>
        <p className="mt-1 text-xs text-[#6f879e]">{error}</p>
      </section>
    )
  }

  const items: Kpi[] = [
    {
      label: 'Revenue At Risk',
      value: loading ? '…' : formatInr(revenueAtRisk),
      hint: 'Affected UPI volume on ROUTE_B',
      emphasis: 'risk',
    },
    {
      label: 'Revenue Recovered',
      value: loading ? '…' : formatInr(revenueRecovered),
      hint: 'Captured after bounded retry',
      emphasis: 'ok',
    },
    {
      label: 'Recovery Rate',
      value: loading ? '…' : formatPct(recoveryRate),
      hint: 'Recovered / at risk',
      emphasis: 'ok',
    },
    {
      label: 'Affected Transactions',
      value: loading ? '…' : String(affectedTransactions),
      hint: 'Failed on ROUTE_B / UPI',
      emphasis: 'neutral',
    },
    {
      label: 'Escalated',
      value: loading ? '…' : String(escalated),
      hint: 'High-value or non-retryable',
      emphasis: 'neutral',
    },
  ]

  return (
    <section className="grid grid-cols-2 gap-px border border-[#1d3348] bg-[#1d3348] lg:grid-cols-5">
      {items.map((item, index) => (
        <article
          key={item.label}
          className={`bg-[#0a1724] px-5 py-4 transition-opacity duration-500 ${
            index === 0 ? 'col-span-2 lg:col-span-1' : ''
          } ${loading ? 'opacity-60' : ''}`}
        >
          <p className="font-mono text-[10px] tracking-[0.16em] text-[#7f93a8] uppercase">
            {item.label}
          </p>
          <p
            className={`mt-2 font-semibold tracking-tight ${
              item.emphasis === 'risk'
                ? 'text-2xl text-[#f0b45d] md:text-[28px]'
                : item.emphasis === 'ok'
                  ? 'text-2xl text-[#5ed0a5] md:text-[28px]'
                  : 'text-2xl text-[#e8eef5] md:text-[28px]'
            }`}
          >
            {item.value}
          </p>
          <p className="mt-1 text-xs text-[#6f879e]">
            {loading ? 'Loading live metrics…' : item.hint}
          </p>
        </article>
      ))}
    </section>
  )
}
