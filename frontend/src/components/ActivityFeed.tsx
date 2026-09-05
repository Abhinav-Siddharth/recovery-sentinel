type ActivityEvent = {
  id: string | number
  time: string
  title: string
  description?: string
  transactionId?: string | null
  type?: string
}

type Props = {
  events: ActivityEvent[]
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

function cleanDescription(value?: string) {
  if (!value) return ''

  return value
    .replace(/\r?\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getVisual(event: ActivityEvent) {
  const key = `${event.type ?? ''} ${event.title}`.toLowerCase()

  if (
    key.includes('escalat') ||
    key.includes('block') ||
    key.includes('fail')
  ) {
    return {
      dot: 'bg-amber-400',
      ring: 'ring-amber-400/10',
    }
  }

  if (
    key.includes('recover') ||
    key.includes('success') ||
    key.includes('approved')
  ) {
    return {
      dot: 'bg-emerald-400',
      ring: 'ring-emerald-400/10',
    }
  }

  if (
    key.includes('incident') ||
    key.includes('detect') ||
    key.includes('degrad')
  ) {
    return {
      dot: 'bg-rose-400',
      ring: 'ring-rose-400/10',
    }
  }

  return {
    dot: 'bg-sky-400',
    ring: 'ring-sky-400/10',
  }
}

function humanizeTitle(title: string) {
  const normalized = title.replace(/_/g, ' ').trim()

  const titleMap: Record<string, string> = {
    incident_resolved: 'Incident resolved',
    incident_detected: 'Incident detected',
    incident_diagnosed: 'Incident diagnosed',
    action_validated: 'Policy approved',
    revenue_recovered: 'Revenue recovered',
    transaction_escalated: 'Transaction escalated',
    route_shift: 'Route protection applied',
    route_protection: 'Route protection applied',
  }

  return (
    titleMap[title.toLowerCase()] ??
    (normalized.charAt(0).toUpperCase() +
      normalized.slice(1).toLowerCase())
  )
}

function cleanProviderError(description: string) {
  const value = description.toLowerCase()

  if (
    value.includes('resource_exhausted') ||
    value.includes('429') ||
    value.includes('quota') ||
    value.includes('rate limit') ||
    value.includes('rate-limit')
  ) {
    return 'AI unavailable; deterministic fallback applied.'
  }

  return description
}

export function ActivityFeed({
  events,
  loading,
  error,
}: Props) {
  if (loading) {
    return (
      <div className="flex h-[420px] items-center justify-center">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] text-[#71839a]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
          Processing recovery events
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-4">
        <div className="text-xs font-medium text-rose-200">
          Activity unavailable
        </div>
        <div className="mt-1 text-[10px] text-rose-300/60">
          The recovery workflow is still running safely.
        </div>
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="flex h-[420px] items-center justify-center text-center">
        <div>
          <div className="text-sm font-medium text-[#a9b7c9]">
            No activity yet
          </div>

          <div className="mt-1 text-xs text-[#64758d]">
            Recovery events will appear here.
          </div>
        </div>
      </div>
    )
  }

  const visibleEvents = events.slice(0, 12)

  return (
    <div className="relative h-[420px] overflow-hidden">
      {/* Timeline rail */}
      <div className="absolute left-[10px] top-2 bottom-2 w-px bg-white/[0.06]" />

      <div className="space-y-0.5">
        {visibleEvents.map((event, index) => {
          const visual = getVisual(event)

          const rawDescription = cleanDescription(
            event.description,
          )

          const description = cleanProviderError(
            rawDescription,
          )

          const title = humanizeTitle(event.title)

          return (
            <div
              key={event.id}
              className="group relative flex gap-3 rounded-lg px-2 py-2 transition-colors duration-150 hover:bg-white/[0.025]"
            >
              {/* Timeline node */}
              <div className="relative z-10 flex w-5 shrink-0 justify-center pt-[5px]">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${visual.dot} ring-4 ${visual.ring} ring-[#0a1320]`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[12px] font-medium leading-4 text-[#d9e3ef]">
                      {title}
                    </div>

                    <div className="mt-1 flex min-h-[13px] flex-wrap items-center gap-2">
                      {event.transactionId && (
                        <span className="rounded border border-white/[0.06] bg-white/[0.018] px-1.5 py-0.5 font-mono text-[8px] tracking-[0.06em] text-[#6d8098]">
                          {event.transactionId}
                        </span>
                      )}

                      {description && (
                        <span className="text-[10px] leading-4 text-[#71839b]">
                          {description}
                        </span>
                      )}
                    </div>
                  </div>

                  <time className="shrink-0 font-mono text-[9px] tracking-[0.03em] text-[#53667e]">
                    {formatTime(event.time)}
                  </time>
                </div>
              </div>

              {/* Live indicator */}
              {index === 0 && (
                <span className="absolute right-2 top-2 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400/80" />
              )}
            </div>
          )
        })}
      </div>

      {/* Fade for older events */}
      {events.length > visibleEvents.length && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a1320] via-[#0a1320]/95 to-transparent pt-10 text-center">
          <span className="text-[9px] uppercase tracking-[0.16em] text-[#5b6e87]">
            + {events.length - visibleEvents.length} more events
          </span>
        </div>
      )}
    </div>
  )
}