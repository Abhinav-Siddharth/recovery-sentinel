import { formatInr } from '../lib/format'
import type { EvaluationResponse } from '../lib/api'


type BaselineComparisonProps = {
  evaluation: EvaluationResponse | null
  loading?: boolean
}


export function BaselineComparison({
  evaluation,
  loading = false,
}: BaselineComparisonProps) {
  if (loading && !evaluation) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card animate-pulse p-5">
          <div className="h-3 w-32 rounded bg-white/[0.06]" />
          <div className="mt-4 h-7 w-40 rounded bg-white/[0.06]" />
        </div>
        <div className="glass-card animate-pulse p-5">
          <div className="h-3 w-32 rounded bg-white/[0.06]" />
          <div className="mt-4 h-7 w-40 rounded bg-white/[0.06]" />
        </div>
      </div>
    )
  }


  if (!evaluation) {
    return (
      <p className="py-4 text-center font-mono text-xs text-[#6f879e]">
        Baseline comparison unavailable
      </p>
    )
  }


  const sentinel =
    evaluation.sentinel

  const baseline =
    evaluation.blind_retry

  const reduction =
    evaluation.intervention_reduction * 100


  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="glass-card group p-5 transition-all hover:border-[#3d9cf0]/30 hover:bg-[#3d9cf0]/[0.04]">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f93a8]">
              Recovery Sentinel
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-[#5ed0a5] shadow-[0_0_10px_rgba(93,208,165,0.5)]" />
          </div>

          <div className="glow-text mt-2 text-2xl font-semibold tabular-nums text-[#d5e4f2]">
            {formatInr(
              sentinel.revenue_recovered,
            )}
          </div>

          <div className="mt-2 text-xs text-[#8fa3b8]">
            {sentinel.actions_executed} interventions
            {' | '}
            {sentinel.recovery_rate
              .toLocaleString(
                undefined,
                {
                  style: 'percent',
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                },
              )}
            {' recovered'}
          </div>
        </div>


        <div className="glass-card group p-5 transition-all hover:border-[#e8a54b]/30 hover:bg-[#e8a54b]/[0.04]">
          <div className="flex items-center justify-between">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f93a8]">
              Blind Retry Baseline
            </div>
            <span className="h-1.5 w-1.5 rounded-full bg-[#e8a54b] shadow-[0_0_10px_rgba(232,165,75,0.4)]" />
          </div>

          <div className="mt-2 text-2xl font-semibold tabular-nums text-[#d5e4f2]">
            {formatInr(
              baseline.revenue_recovered,
            )}
          </div>

          <div className="mt-2 text-xs text-[#8fa3b8]">
            {baseline.attempts} attempts
            {' | '}
            {baseline.recovery_rate
              .toLocaleString(
                undefined,
                {
                  style: 'percent',
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                },
              )}
            {' recovered'}
          </div>
        </div>
      </div>


      <div className="glass-card px-5 py-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f93a8]">
              Recovery advantage
            </div>

            <div className="mt-1 text-sm text-[#c7d6e4]">
              Higher recovery with fewer interventions.

            </div>
          </div>

          <div className="font-mono text-lg font-semibold tabular-nums text-[#5ed0a5]">
            {reduction.toFixed(1)}% fewer
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] text-[#8fa3b8]">
          <span>
            {evaluation.unnecessary_attempts_avoided}
            {' Blind retries would be mismatched'}
          </span>

          <span>
            {baseline.attempts -
              sentinel.actions_executed}
            {' fewer intervention attempts'}
          </span>
        </div>
      </div>
    </div>
  )
}