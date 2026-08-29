import type { FeedEvent } from '../types'

type ActivityFeedProps = {
  events: FeedEvent[]
  loading?: boolean
  error?: string | null
}

const toneDot: Record<FeedEvent['tone'], string> = {
  risk: 'bg-[#f07167]',
  warn: 'bg-[#e8a54b]',
  ok: 'bg-[#5ed0a5]',
  neutral: 'bg-[#4aa8e8]',
}

export function ActivityFeed({
  events,
  loading = false,
  error = null,
}: ActivityFeedProps) {
  if (error) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#e8a54b]">
        Unable to load activity. {error}
      </p>
    )
  }

  if (loading) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#6f879e]">
        Loading activity feed…
      </p>
    )
  }

  if (events.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#6f879e]">
        Awaiting detector signal
      </p>
    )
  }

  return (
    <ol className="space-y-0">
      {events.map((event, index) => (
        <li
          key={event.id}
          className="reveal-row flex gap-3 border-b border-[#1d3348] py-3 last:border-0"
          style={{ animationDelay: `${index * 80}ms` }}
        >
          <span className={`mt-1.5 h-2 w-2 shrink-0 ${toneDot[event.tone]}`} />
          <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-[#e8eef5]">{event.title}</p>
              <time className="font-mono text-[10px] text-[#6f879e]">{event.time}</time>
            </div>
            <p className="mt-0.5 text-xs text-[#8fa3b8]">{event.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
