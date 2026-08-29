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
      <section className="border border-[#5a3a1e] bg-[#16100a] px-5 py-5">
        <p className="font-mono text-[10px] tracking-[0.2em] text-[#c7924a] uppercase">
          Primary incident
        </p>
        <p className="mt-2 text-sm text-[#f0b45d]">Unable to load incident data.</p>
        <p className="mt-1 text-xs text-[#b9a48a]">{error}</p>
      </section>
    )
  }

  const title = loading
    ? 'Loading incident…'
    : `${incidentId} — ${route} / UPI DEGRADATION`

  return (
    <section className="border border-[#5a3a1e] bg-[#16100a]">
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
          className={`min-w-[240px] border px-4 py-3 ${
            protectActive
              ? 'border-[#2f7a5c] bg-[#0d221b] text-[#8ee0c0]'
              : 'border-[#5a3a1e] bg-[#1c140c] text-[#e8a54b]'
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
            {protectActive ? 'Bounded shift live · 15 min window' : 'Pending policy gate'}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 border-t border-[#5a3a1e] sm:grid-cols-4">
        <Stat
          label="Baseline success"
          value={loading ? '…' : formatPct(baselineSuccess)}
        />
        <Stat
          label="Observed success"
          value={loading ? '…' : formatPct(observedSuccess)}
          alert
        />
        <Stat
          label="Affected transactions"
          value={loading ? '…' : String(affectedTransactions)}
        />
        <Stat
          label="Revenue at risk"
          value={loading ? '…' : formatLakhs(revenueAtRisk)}
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
    <div className="border-[#5a3a1e] px-5 py-4 [&:not(:last-child)]:border-r">
      <dt className="font-mono text-[10px] tracking-[0.14em] text-[#a88b68] uppercase">
        {label}
      </dt>
      <dd className={`mt-1 text-xl font-semibold ${alert ? 'text-[#f0b45d]' : 'text-[#f6efe4]'}`}>
        {value}
      </dd>
    </div>
  )
}
