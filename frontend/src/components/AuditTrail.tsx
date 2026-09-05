type AuditEvent = {
  id: string | number
  timestamp: string
  transactionId?: string | null
  incidentId?: string | null
  event: string
  actor?: string
  details?: string | null
}

type Props = {
  events: AuditEvent[]
  loading?: boolean
  error?: string | null
}

function formatTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function cleanText(value?: string | null) {
  if (!value) return ''

  return value
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isProviderFailure(details: string) {
  const value = details.toLowerCase()

  return (
    value.includes('resource_exhausted') ||
    value.includes('429') ||
    value.includes('quota') ||
    value.includes('rate-limit') ||
    value.includes('rate limit')
  )
}

function summarizeDetails(event: AuditEvent) {
  const details = cleanText(event.details)

  if (event.event === 'INCIDENT_DIAGNOSED' && isProviderFailure(details)) {
    return {
      headline: 'AI diagnosis unavailable; deterministic fallback applied.',
      meta: 'Provider quota/rate limit encountered',
    }
  }

  if (event.event === 'INCIDENT_DIAGNOSED') {
    return {
      headline: 'Incident diagnosis recorded.',
      meta: details,
    }
  }

  if (event.event === 'ACTION_VALIDATED') {
    const finalAction = details.match(
      /final_action['"]?\s*:\s*['"]?([A-Z_]+)/i,
    )?.[1]

    const decision = details.match(
      /decision['"]?\s*:\s*['"]?([A-Z_]+)/i,
    )?.[1]

    const expectedValue = details.match(
      /expected_value['"]?\s*:\s*([0-9.]+)/i,
    )?.[1]

    if (finalAction) {
      return {
        headline: `${decision ?? 'ALLOW'} → ${finalAction}`,
        meta: expectedValue
          ? `Expected recovery value: ₹${Number(expectedValue).toLocaleString(
              'en-IN',
              { maximumFractionDigits: 0 },
            )}`
          : 'Deterministic policy checks passed',
      }
    }

    return {
      headline: 'Policy validation completed.',
      meta: 'Deterministic safety checks evaluated',
    }
  }

  if (event.event === 'REVENUE_RECOVERED') {
    const amountMatch = details.match(/₹?([\d,]+(?:\.\d+)?)/)

    return {
      headline: 'Verified recovery recorded.',
      meta: amountMatch
        ? `₹${amountMatch[1]} recovered`
        : 'Revenue recovery verified',
    }
  }

  if (event.event === 'ROUTE_SHIFT') {
    return {
      headline: 'Future traffic protection applied.',
      meta: details || 'ROUTE_B → ROUTE_C for 15 min',
    }
  }

  if (event.event === 'TRANSACTION_ESCALATED') {
    return {
      headline: 'Transaction escalated for review.',
      meta: details || 'No safe automated recovery path',
    }
  }

  if (event.event === 'INCIDENT_RESOLVED') {
    return {
      headline: 'Incident resolved.',
      meta: details || 'Recovery workflow completed',
    }
  }

  return {
    headline: event.event
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/^\w/, (char) => char.toUpperCase()),
    meta: details,
  }
}

function eventTone(event: AuditEvent) {
  switch (event.event) {
    case 'INCIDENT_DIAGNOSED':
      return {
        line: 'border-sky-400/20',
        badge: 'bg-sky-400/10 text-sky-300 border-sky-400/20',
      }

    case 'ACTION_VALIDATED':
      return {
        line: 'border-emerald-400/20',
        badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
      }

    case 'REVENUE_RECOVERED':
      return {
        line: 'border-emerald-400/20',
        badge: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
      }

    case 'TRANSACTION_ESCALATED':
      return {
        line: 'border-amber-400/20',
        badge: 'bg-amber-400/10 text-amber-300 border-amber-400/20',
      }

    case 'ROUTE_SHIFT':
      return {
        line: 'border-cyan-400/20',
        badge: 'bg-cyan-400/10 text-cyan-300 border-cyan-400/20',
      }

    default:
      return {
        line: 'border-white/[0.07]',
        badge: 'bg-white/[0.035] text-[#8fa0b5] border-white/[0.07]',
      }
  }
}

export function AuditTrail({ events, loading, error }: Props) {
  if (loading) {
    return (
      <div className="flex h-[330px] items-center justify-center">
        <div className="text-[11px] uppercase tracking-[0.18em] text-[#6f8199]">
          Loading audit records
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4 text-sm text-rose-200">
        Unable to load audit trail.
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="flex h-[330px] items-center justify-center text-center">
        <div>
          <div className="text-sm font-medium text-[#a8b6c8]">
            No audit records yet
          </div>
          <div className="mt-1 text-xs text-[#64758c]">
            Validation and execution events will appear here.
          </div>
        </div>
      </div>
    )
  }

  const visibleEvents = events.slice(0, 16)

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[#091321]/60">
      <div className="grid grid-cols-[92px_120px_1fr] border-b border-white/[0.06] bg-white/[0.018] px-4 py-2.5">
        <div className="text-[9px] uppercase tracking-[0.16em] text-[#5e7189]">
          Timestamp
        </div>
        <div className="text-[9px] uppercase tracking-[0.16em] text-[#5e7189]">
          Event
        </div>
        <div className="text-[9px] uppercase tracking-[0.16em] text-[#5e7189]">
          Decision record
        </div>
      </div>

      <div className="max-h-[460px] overflow-y-auto">
        {visibleEvents.map((event) => {
          const tone = eventTone(event)
          const summary = summarizeDetails(event)

          return (
            <div
              key={event.id}
              className={`grid grid-cols-[92px_120px_1fr] gap-0 border-b border-white/[0.045] px-4 py-3 last:border-b-0 hover:bg-white/[0.018]`}
            >
              <div className="font-mono text-[9px] leading-5 text-[#52657d]">
                {formatTime(event.timestamp)}
              </div>

              <div className="pr-4">
                <span
                  className={`inline-flex rounded-md border px-2 py-1 text-[8px] font-medium uppercase tracking-[0.1em] ${tone.badge}`}
                >
                  {event.event.replace(/_/g, ' ')}
                </span>

                <div className="mt-1.5 text-[9px] text-[#50627a]">
                  {event.actor ?? 'system'}
                </div>
              </div>

              <div className={`border-l pl-4 ${tone.line}`}>
                <div className="text-[11px] font-medium leading-5 text-[#c7d5e5]">
                  {summary.headline}
                </div>

                {summary.meta && (
                  <div className="mt-1 max-w-[1000px] text-[10px] leading-4 text-[#71839a]">
                    {summary.meta}
                  </div>
                )}

                <div className="mt-2 flex flex-wrap gap-2">
                  {event.transactionId && (
                    <span className="rounded border border-white/[0.06] bg-white/[0.018] px-2 py-0.5 font-mono text-[8px] text-[#667990]">
                      {event.transactionId}
                    </span>
                  )}

                  {event.incidentId && (
                    <span className="rounded border border-white/[0.06] bg-white/[0.018] px-2 py-0.5 font-mono text-[8px] text-[#667990]">
                      {event.incidentId}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {events.length > visibleEvents.length && (
        <div className="border-t border-white/[0.05] bg-white/[0.012] px-4 py-2 text-center">
          <span className="text-[9px] uppercase tracking-[0.15em] text-[#566980]">
            Showing latest {visibleEvents.length} of {events.length} records
          </span>
        </div>
      )}
    </div>
  )
}
