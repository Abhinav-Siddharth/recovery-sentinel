import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  fetchDashboard,
  type AuditRecord,
  type DashboardPayload,
  type EvaluationResponse,
  type IncidentResponse,
  type MetricsResponse,
  type TransactionRecord,
} from '../lib/api'


type DashboardState = {
  incident: IncidentResponse | null
  metrics: MetricsResponse | null
  evaluation: EvaluationResponse | null
  transactions: TransactionRecord[]
  audit: AuditRecord[]
  loading: boolean
  error: string | null
  reload: () => Promise<void>
  applyIncident: (
    incident: IncidentResponse,
  ) => void
  applyMetrics: (
    metrics: MetricsResponse,
  ) => void
  applyPayload: (
    data: DashboardPayload,
  ) => void
}


const empty = {
  incident: null as IncidentResponse | null,
  metrics: null as MetricsResponse | null,
  evaluation:
    null as EvaluationResponse | null,
  transactions:
    [] as TransactionRecord[],
  audit: [] as AuditRecord[],
}


function messageFrom(err: unknown): string {
  return err instanceof Error
    ? err.message
    : 'Unable to reach the Recovery Sentinel backend'
}


export function useDashboardData(): DashboardState {
  const [incident, setIncident] =
    useState<IncidentResponse | null>(null)

  const [metrics, setMetrics] =
    useState<MetricsResponse | null>(null)

  const [evaluation, setEvaluation] =
    useState<EvaluationResponse | null>(null)

  const [transactions, setTransactions] =
    useState<TransactionRecord[]>([])

  const [audit, setAudit] =
    useState<AuditRecord[]>([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState<string | null>(null)

  const generation = useRef(0)


  const applyPayload = useCallback(
    (data: DashboardPayload) => {
      setIncident(data.incident)
      setMetrics(data.metrics)
      setEvaluation(data.evaluation)
      setTransactions(data.transactions)
      setAudit(data.audit)
      setError(null)
    },
    [],
  )


  const applyIncident = useCallback(
    (next: IncidentResponse) => {
      setIncident(next)
    },
    [],
  )


  const applyMetrics = useCallback(
    (next: MetricsResponse) => {
      setMetrics(next)
    },
    [],
  )


  const reload = useCallback(
    async () => {
      const current =
        ++generation.current

      const data =
        await fetchDashboard()

      if (
        current !== generation.current
      ) {
        return
      }

      applyPayload(data)
    },
    [applyPayload],
  )


  useEffect(() => {
    let cancelled = false

    const current =
      ++generation.current

    fetchDashboard()
      .then((data) => {
        if (
          cancelled ||
          current !== generation.current
        ) {
          return
        }

        applyPayload(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (
          cancelled ||
          current !== generation.current
        ) {
          return
        }

        setIncident(empty.incident)
        setMetrics(empty.metrics)
        setEvaluation(
          empty.evaluation,
        )
        setTransactions(
          empty.transactions,
        )
        setAudit(empty.audit)
        setError(
          messageFrom(err),
        )
        setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [applyPayload])


  return {
    incident,
    metrics,
    evaluation,
    transactions,
    audit,
    loading,
    error,
    reload,
    applyIncident,
    applyMetrics,
    applyPayload,
  }
}
