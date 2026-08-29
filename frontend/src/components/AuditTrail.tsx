import type { AuditEvent } from '../types'

type AuditTrailProps = {
  events: AuditEvent[]
  loading?: boolean
  error?: string | null
}

export function AuditTrail({
  events,
  loading = false,
  error = null,
}: AuditTrailProps) {
  if (error) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#e8a54b]">
        Unable to load audit logs. {error}
      </p>
    )
  }

  if (loading) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#6f879e]">
        Loading audit trail…
      </p>
    )
  }

  if (events.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#6f879e]">
        No audit events in this window
      </p>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="font-mono text-[10px] tracking-[0.14em] text-[#7f93a8] uppercase">
            <th className="pb-3 font-medium">Timestamp</th>
            <th className="pb-3 font-medium">Actor</th>
            <th className="pb-3 font-medium">Event</th>
            <th className="pb-3 font-medium">Details</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event, index) => (
            <tr
              key={event.id}
              className="reveal-row border-t border-[#1d3348]"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <td className="py-2.5 font-mono text-xs text-[#9eb1c4]">{event.timestamp}</td>
              <td className="py-2.5 font-mono text-[#4aa8e8]">{event.actor}</td>
              <td className="py-2.5 font-mono text-[#e8eef5]">{event.event}</td>
              <td className="py-2.5 text-[#8fa3b8]">{event.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
