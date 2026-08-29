const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000'

type RequestOptions = {
  signal?: AbortSignal
}

async function requestJson<T>(
  path: string,
  method: 'GET' | 'POST',
  options: RequestOptions = {},
): Promise<T> {
  const url =
    method === 'GET'
      ? `${API_BASE}${path}${path.includes('?') ? '&' : '?'}_=${Date.now()}`
      : `${API_BASE}${path}`

  const response = await fetch(url, {
    method,
    cache: 'no-store',
    signal: options.signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    let message = `${path} failed (${response.status})`
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'detail' in body) {
        const detail = (body as { detail: unknown }).detail
        if (typeof detail === 'string') message = detail
      }
    } catch {
      // Keep the status message if the body is not JSON.
    }
    throw new Error(message)
  }

  return (await response.json()) as T
}

export type MetricsResponse = {
  revenue_at_risk: number
  revenue_recovered: number
  recovery_rate: number
  affected_transactions: number
  successful_recoveries: number
  stopped: number
  escalated: number
  actions_executed: number
}

export type IncidentRecord = {
  id: string
  route: string
  detected_at: string
  baseline_success_rate: number
  observed_success_rate: number
  diagnosis: string | null
  status: string
}

export type IncidentResponse = {
  incident: IncidentRecord | null
  affected_transactions: number
  revenue_at_risk: number
}

export type ResetResponse = IncidentResponse & {
  incident_id: string | null
  detected: boolean
}

export type RecoverResponse = {
  ok?: boolean
  incident_id?: string
  incident_status?: string
  incident?: IncidentRecord | null
  processed?: number
  actions_executed?: number
  successful_recoveries?: number
  stopped?: number
  escalated?: number
  revenue_recovered?: number
  metrics?: MetricsResponse
}

export type TransactionRecord = {
  id: string
  amount: number
  method: string
  route: string
  created_at: string
  status: string
  decline_reason: string | null
  incident_id: string | null
  retry_count: number
  recoverable: number
  ground_truth_action: string | null
}

export type TransactionsResponse = {
  transactions: TransactionRecord[]
}

export type AuditRecord = {
  id: number
  timestamp: string
  transaction_id: string | null
  incident_id: string | null
  event: string
  actor: string
  details: string | null
}

export type AuditResponse = {
  audit: AuditRecord[]
}

export type DashboardPayload = {
  incident: IncidentResponse
  metrics: MetricsResponse
  transactions: TransactionRecord[]
  audit: AuditRecord[]
}

export function metricsFromRecover(result: RecoverResponse): MetricsResponse | null {
  if (result.metrics) return result.metrics
  if (
    result.revenue_recovered == null &&
    result.escalated == null &&
    result.successful_recoveries == null
  ) {
    return null
  }
  return {
    revenue_at_risk: 0,
    revenue_recovered: result.revenue_recovered ?? 0,
    recovery_rate: 0,
    affected_transactions: result.processed ?? 0,
    successful_recoveries: result.successful_recoveries ?? 0,
    stopped: result.stopped ?? 0,
    escalated: result.escalated ?? 0,
    actions_executed: result.actions_executed ?? 0,
  }
}

export async function fetchMetrics(
  options?: RequestOptions,
): Promise<MetricsResponse> {
  return requestJson<MetricsResponse>('/api/metrics', 'GET', options)
}

export async function fetchIncident(
  options?: RequestOptions,
): Promise<IncidentResponse> {
  return requestJson<IncidentResponse>('/api/incident', 'GET', options)
}

export async function fetchTransactions(
  options?: RequestOptions,
): Promise<TransactionRecord[]> {
  const data = await requestJson<TransactionsResponse>(
    '/api/transactions',
    'GET',
    options,
  )
  return data.transactions
}

export async function fetchAudit(
  options?: RequestOptions,
): Promise<AuditRecord[]> {
  const data = await requestJson<AuditResponse>('/api/audit', 'GET', options)
  return data.audit
}

export async function fetchDashboard(
  options?: RequestOptions,
): Promise<DashboardPayload> {
  const incident = await fetchIncident(options)
  const metrics = await fetchMetrics(options)
  const transactions = await fetchTransactions(options)
  const audit = await fetchAudit(options)
  return { incident, metrics, transactions, audit }
}

export async function resetIncident(
  options?: RequestOptions,
): Promise<ResetResponse> {
  return requestJson<ResetResponse>('/api/reset', 'POST', options)
}

export async function runRecovery(
  options?: RequestOptions,
): Promise<RecoverResponse> {
  return requestJson<RecoverResponse>('/api/recover', 'POST', options)
}
