import { formatInr, formatInrPrecise } from '../lib/format'
import type { RecoveryOutcome, RecoveryRow } from '../types'

type RecoveryTableProps = {
  rows: RecoveryRow[]
  loading?: boolean
  error?: string | null
}

const outcomeClass: Record<RecoveryOutcome, string> = {
  RECOVERED: 'text-[#5ed0a5]',
  ESCALATED: 'text-[#e8a54b]',
  PENDING: 'text-[#7f93a8]',
  FAILED: 'text-[#f07167]',
  STOPPED: 'text-[#7f93a8]',
}

const outcomeChip: Record<RecoveryOutcome, string> = {
  RECOVERED: 'border-[#5ed0a5]/30 bg-[#5ed0a5]/10',
  ESCALATED: 'border-[#e8a54b]/30 bg-[#e8a54b]/10',
  PENDING: 'border-[#7f93a8]/30 bg-[#7f93a8]/10',
  FAILED: 'border-[#f07167]/30 bg-[#f07167]/10',
  STOPPED: 'border-[#7f93a8]/30 bg-[#7f93a8]/10',
}

export function RecoveryTable({
  rows,
  loading = false,
  error = null,
}: RecoveryTableProps) {
  if (error) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#e8a54b]">
        Unable to load transactions. {error}
      </p>
    )
  }

  if (loading) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#6f879e]">
        Loading recovery activity...
      </p>
    )
  }

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-xs tracking-wide text-[#6f879e]">
        No recovery actions yet
      </p>
    )
  }

  return (
    <div className="glass-card overflow-x-auto">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.06] font-mono text-[10px] tracking-[0.14em] text-[#7f93a8] uppercase">
            <th className="pb-3 pt-1 font-medium">Transaction</th>
            <th className="pb-3 pt-1 font-medium">Amount</th>
            <th className="pb-3 pt-1 font-medium">Failure</th>
            <th className="pb-3 pt-1 font-medium">AI Action</th>
            <th className="pb-3 pt-1 font-medium">Expected Value</th>
            <th className="pb-3 pt-1 font-medium">Policy</th>
            <th className="pb-3 pt-1 font-medium">Outcome</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, index) => (
            <tr
              key={row.id}
              className="reveal-row border-t border-white/[0.05] transition-colors hover:bg-white/[0.03]"
              style={{ animationDelay: `${index * 70}ms` }}
            >
              <td className="py-2.5 font-mono text-[#d5e4f2]">
                {row.id}
              </td>

              <td className="py-2.5 tabular-nums">
                {formatInr(row.amount)}
              </td>

              <td className="py-2.5 text-[#9eb1c4]">
                {row.failure}
              </td>

              <td className="py-2.5">
                <div className="font-mono text-[#4aa8e8]">
                  {row.action}
                </div>

                {row.aiReason && (
                  <div className="mt-1 max-w-[220px] text-[11px] leading-4 text-[#6f879e]">
                    {row.aiReason}
                  </div>
                )}
              </td>

              <td className="py-2.5 font-mono tabular-nums text-[#9eb1c4]">
                {row.expectedValue != null
                  ? formatInrPrecise(row.expectedValue)
                  : '-'}
              </td>

              <td className="py-2.5 font-mono text-[#8fa3b8]">
                {row.policy}
              </td>

              <td className="py-2.5">
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[11px] ${outcomeChip[row.outcome]} ${outcomeClass[row.outcome]}`}
                >
                  {row.outcome}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}