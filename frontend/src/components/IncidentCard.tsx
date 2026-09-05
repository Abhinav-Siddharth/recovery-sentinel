import { ArrowRight } from 'lucide-react'
import { formatLakhs, formatPct } from '../lib/format'

type IncidentCardProps = {
  incidentId: string
  route: string
  status: string
  baselineSuccess: number
  observedSuccess: number
  affectedTransactions: number
  revenueAtRisk: number
  protectActive: boolean
  loading?: boolean
  error?: string | null
}

export function IncidentCard({
  incidentId,
  route,
  status,
  baselineSuccess,
  observedSuccess,
  affectedTransactions,
  revenueAtRisk,
  protectActive,
  loading = false,
  error = null,
}: IncidentCardProps) {
  if (error) {
    return (
      <section className="rounded-2xl border border-[#5a3a1e]/60 bg-[#16100a]/70 px-5 py-5 backdrop-blur-md">
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#c7924a] uppercase">
          Primary incident
        </p>
        <p className="mt-2 text-sm text-[#f0b45d]">Unable to load incident data.</p>
        <p className="mt-1 text-xs text-[#b9a48a]">{error}</p>
      </section>
    )
  }

  const title = loading
    ? 'Loading incident...'
    : `${incidentId} — ${route} / UPI DEGRADATION`

  return (
    <section className="glass overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-6 px-5 py-5">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-[#c7924a] uppercase">
            Primary incident{status && !loading ? ` · ${status}` : ''}
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-[#f6efe4] md:text-[26px]">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-[#b9a48a]">
            Success collapsed on a single acquirer path. Revenue is isolated,
            retryable failures are bounded, and future UPI is shifted off the
            unhealthy route.

          </p>
        </div>

        <div
          className={`min-w-[240px] rounded-xl border px-4 py-3 backdrop-blur-md transition-all hover:scale-[1.02] ${
            protectActive
              ? 'border-[#2f7a5c]/60 bg-[#0d221b]/60 text-[#8ee0c0] shadow-[0_0_24px_rgba(47,122,92,0.15)]'
              : 'border-[#5a3a1e]/60 bg-[#1c140c]/60 text-[#e8a54b]'
          }`}
        >
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase">
            Protect future traffic
          </p>
          <p className="mt-2 flex items-center gap-2 text-lg font-semibold tracking-wide text-white">
            {route}
            <ArrowRight className="h-4 w-4 text-[#e8a54b]" />
            ROUTE_C
          </p>
          <p className="mt-1 text-xs opacity-80">
            {protectActive ? 'Bounded shift live | 15 min window' : 'Pending policy gate'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 border-t border-white/[0.06] sm:grid-cols-4">
        <Stat
          label="Baseline success"
          value={loading ? '...' : formatPct(baselineSuccess)}
        />
        <Stat
          label="Observed success"
          value={loading ? '...' : formatPct(observedSuccess)}
          alert
        />
        <Stat
          label="Affected transactions"
          value={loading ? '...' : String(affectedTransactions)}
        />
        <Stat
          label="Revenue at risk"
          value={loading ? '...' : formatLakhs(revenueAtRisk)}
          alert
        />
      </dl>
    </section>
  )
}

function Stat({
  label,
  value,
  alert = false,
}: {
  label: string
  value: string
  alert?: boolean
}) {
  return (
    <div className="border-white/[0.06] px-5 py-4 transition-colors hover:bg-white/[0.03] [&:not(:last-child)]:border-r">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-[#a88b68] uppercase">
        {label}
      </dt>
      <dd className={`mt-1 text-xl font-semibold ${alert ? 'text-[#f0b45d]' : 'text-[#f6efe4]'}`}>
        {value}
      </dd>
    </div>
  )
}