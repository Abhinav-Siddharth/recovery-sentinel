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
        <div className="animate-pulse rounded-lg border border-[#1d3348] bg-[#0d1a28] p-5">
          <div className="h-3 w-32 rounded bg-[#1d3348]" />
          <div className="mt-4 h-7 w-40 rounded bg-[#1d3348]" />
        </div>

        <div className="animate-pulse rounded-lg border border-[#1d3348] bg-[#0d1a28] p-5">
          <div className="h-3 w-32 rounded bg-[#1d3348]" />
          <div className="mt-4 h-7 w-40 rounded bg-[#1d3348]" />
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
        <div className="rounded-lg border border-[#24445d] bg-[#0d1a28] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f93a8]">
            Recovery Sentinel
          </div>

          <div className="mt-2 text-2xl font-semibold tabular-nums text-[#d5e4f2]">
            {formatInr(
              sentinel.revenue_recovered,
            )}
          </div>

          <div className="mt-2 text-xs text-[#8fa3b8]">
            {sentinel.actions_executed} interventions
            {' · '}
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


        <div className="rounded-lg border border-[#24445d] bg-[#0d1a28] p-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7f93a8]">
            Blind Retry Baseline
          </div>

          <div className="mt-2 text-2xl font-semibold tabular-nums text-[#d5e4f2]">
            {formatInr(
              baseline.revenue_recovered,
            )}
          </div>

          <div className="mt-2 text-xs text-[#8fa3b8]">
            {baseline.attempts} attempts
            {' · '}
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


      <div className="rounded-lg border border-[#23445b] bg-[#0b1723] px-5 py-4">
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
