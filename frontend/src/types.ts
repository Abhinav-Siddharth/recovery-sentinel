export type ReplayPhase =
  | 'healthy'
  | 'detecting'
  | 'incident'
  | 'recovering'
  | 'complete'

export type PolicyDecision =
  | 'ALLOWED'
  | 'DENIED'
  | 'PENDING'

export type RecoveryOutcome =
  | 'RECOVERED'
  | 'ESCALATED'
  | 'PENDING'
  | 'FAILED'
  | 'STOPPED'

export type AiAction =
  | 'RETRY'
  | 'PAYMENT_LINK'
  | 'ESCALATE'
  | 'STOP'
  | 'ROUTE_SHIFT'

export type RecoveryRow = {
  id: string
  amount: number
  failure: string

  // Existing display fields
  action: AiAction
  policy: PolicyDecision
  outcome: RecoveryOutcome
  appearFrom: ReplayPhase

  // Backend explainability fields
  aiReason?: string
  recoveryProbability?: number
  expectedValue?: number

  executedAction?: string | null
  actionValidated?: number | null
  actionOutcome?: string | null
  actionExecutedAt?: string | null
}

export type FeedEvent = {
  id: string
  time: string
  title: string
  detail: string
  tone: 'neutral' | 'risk' | 'ok' | 'warn'
  appearFrom: ReplayPhase
}

export type AuditEvent = {
  id: string
  timestamp: string
  actor: string
  event: string
  details: string
  appearFrom: ReplayPhase
}

export type ChartPoint = {
  time: string
  minute: number
  success: number
  incident: boolean
}

export type DashboardSnapshot = {
  phase: ReplayPhase
  statusLabel: string
  statusTone: 'ok' | 'warn' | 'risk' | 'info'

  revenueAtRisk: number
  revenueRecovered: number
  recoveryRate: number
  affectedTransactions: number
  escalated: number

  baselineSuccess: number
  observedSuccess: number

  protectActive: boolean

  chart: ChartPoint[]
  rows: RecoveryRow[]
  feed: FeedEvent[]
  audit: AuditEvent[]
}
