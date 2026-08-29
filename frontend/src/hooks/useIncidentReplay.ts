import { useCallback, useRef, useState } from 'react'
import { getSnapshot, PHASE_DURATION_MS } from '../data/mock'
import {
  metricsFromRecover,
  resetIncident,
  runRecovery,
  type IncidentResponse,
  type MetricsResponse,
} from '../lib/api'
import type { DashboardSnapshot, ReplayPhase } from '../types'

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

type ReplayDeps = {
  reload: () => Promise<void>
  applyIncident: (incident: IncidentResponse) => void
  applyMetrics: (metrics: MetricsResponse) => void
}

export function useIncidentReplay({
  reload,
  applyIncident,
  applyMetrics,
}: ReplayDeps) {
  const [phase, setPhase] = useState<ReplayPhase>('complete')
  const [playing, setPlaying] = useState(false)
  const [replayError, setReplayError] = useState<string | null>(null)
  const running = useRef(false)

  const snapshot: DashboardSnapshot = getSnapshot(phase)

  const replay = useCallback(async () => {
    if (running.current) return
    running.current = true
    setPlaying(true)
    setReplayError(null)

    try {
      setPhase('healthy')
      await wait(PHASE_DURATION_MS.healthy)

      setPhase('detecting')
      const reset = await resetIncident()
      if (!reset.incident) {
        throw new Error('Detector did not open a new incident.')
      }
      applyIncident({
        incident: reset.incident,
        affected_transactions: reset.affected_transactions,
        revenue_at_risk: reset.revenue_at_risk,
      })

      setPhase('incident')
      await reload()
      await wait(PHASE_DURATION_MS.incident)

      setPhase('recovering')
      const recovered = await runRecovery()
      const liveMetrics = metricsFromRecover(recovered)
      if (liveMetrics) applyMetrics(liveMetrics)
      if (recovered.incident) {
        applyIncident({
          incident: recovered.incident,
          affected_transactions: liveMetrics?.affected_transactions ?? 0,
          revenue_at_risk: liveMetrics?.revenue_at_risk ?? 0,
        })
      }

      setPhase('complete')

      try {
        await reload()
      } catch (refreshErr: unknown) {
        setReplayError(
          refreshErr instanceof Error
            ? refreshErr.message
            : 'Recovery finished, but refreshing the dashboard failed.',
        )
      }
    } catch (err: unknown) {
      setReplayError(
        err instanceof Error
          ? err.message
          : 'Replay failed. Check that the backend is running.',
      )
    } finally {
      running.current = false
      setPlaying(false)
    }
  }, [applyIncident, applyMetrics, reload])

  return { snapshot, phase, playing, replay, replayError }
}
