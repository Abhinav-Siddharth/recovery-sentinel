import { getSnapshot } from '../data/mock'
import type {
  AiAction,
  AuditEvent,
  FeedEvent,
  PolicyDecision,
  RecoveryOutcome,
  RecoveryRow,
} from '../types'
import type {
  AuditRecord,
  IncidentRecord,
  TransactionRecord,
} from './api'

const mockComplete = getSnapshot('complete')

const mockRowsById = new Map(
  mockComplete.rows.map((row) => [row.id, row]),
)

const AI_ACTIONS: readonly AiAction[] = [
  'RETRY',
  'PAYMENT_LINK',
  'ESCALATE',
  'STOP',
  'ROUTE_SHIFT',
]


export function asPercent(value: number): number {
  return value <= 1 ? value * 100 : value
}


export function formatAuditTimestamp(
  timestamp: string,
): string {
  const match = timestamp.match(
    /T(\d{2}:\d{2}:\d{2}(?:\.\d+)?)/
  )

  if (match) {
    const time = match[1]
    const [hms, fraction] = time.split('.')

    if (!fraction) {
      return hms
    }

    return `${hms}.${fraction
      .slice(0, 3)
      .padEnd(3, '0')}`
  }

  return timestamp
}


function isAiAction(
  value: string | null | undefined,
): value is AiAction {
  return (
    value != null &&
    (AI_ACTIONS as readonly string[]).includes(value)
  )
}


function mapBackendAction(
  tx: TransactionRecord,
): AiAction | null {
  const backendAction = (
    tx as TransactionRecord & {
      ai_action?: string | null
    }
  ).ai_action

  if (isAiAction(backendAction)) {
    return backendAction
  }

  return null
}


export function mapPolicy(
  tx: TransactionRecord,
  mockRow?: RecoveryRow,
): PolicyDecision {
  const backend = tx as TransactionRecord & {
    action_validated?: number | null
    outcome_label?: string | null
    recoverable?: number
    action_outcome?: string | null
  }

  // Non-recoverable/stopped transactions were blocked
  // by the deterministic policy layer.
  if (
    backend.recoverable === 0 ||
    backend.outcome_label === 'STOPPED'
  ) {
    return 'DENIED'
  }

  // Any executed action that reached the executor
  // passed policy validation.
  if (backend.action_validated === 1) {
    return 'ALLOWED'
  }

  // An escalated transaction is itself an allowed
  // policy decision. It simply doesn't execute autonomously.
  if (backend.outcome_label === 'ESCALATED') {
    return 'ALLOWED'
  }

  // Failed execution also means policy had already
  // approved the action.
  if (
    backend.action_outcome === 'FAILURE' &&
    backend.action_validated === 1
  ) {
    return 'ALLOWED'
  }

  return mockRow?.policy ?? 'PENDING'
}


export function mapAction(
  tx: TransactionRecord,
  mockRow?: RecoveryRow,
): AiAction {
  const backendAction = mapBackendAction(tx)

  if (backendAction) {
    return backendAction
  }

  if (mockRow) {
    return mockRow.action
  }

  if (isAiAction(tx.ground_truth_action)) {
    return tx.ground_truth_action
  }

  return 'RETRY'
}


export function mapOutcome(
  tx: TransactionRecord,
  escalatedIds: Set<string>,
  mockRow?: RecoveryRow,
): RecoveryOutcome {
  const backend = tx as TransactionRecord & {
    outcome_label?: string | null
  }

  if (backend.outcome_label === 'RECOVERED') {
    return 'RECOVERED'
  }

  if (backend.outcome_label === 'STOPPED') {
    return 'STOPPED'
  }

  if (backend.outcome_label === 'ESCALATED') {
    return 'ESCALATED'
  }

  if (backend.outcome_label === 'FAILED') {
    return 'FAILED'
  }

  if (tx.status === 'recovered') {
    return 'RECOVERED'
  }

  if (tx.status === 'stopped') {
    return 'STOPPED'
  }

  if (escalatedIds.has(tx.id)) {
    return 'ESCALATED'
  }

  if (mockRow?.outcome === 'ESCALATED') {
    return 'ESCALATED'
  }

  if (tx.status === 'failed') {
    return 'FAILED'
  }

  return 'PENDING'
}


export function mapTransactions(
  transactions: TransactionRecord[],
  audit: AuditRecord[],
): RecoveryRow[] {
  const escalatedIds = new Set(
    audit
      .filter(
        (log) =>
          log.event === 'ESCALATED' &&
          log.transaction_id,
      )
      .map(
        (log) =>
          log.transaction_id as string,
      ),
  )

  return transactions.map((tx) => {
    const mockRow = mockRowsById.get(tx.id)

    const backend = tx as TransactionRecord & {
      ai_action?: string | null
      ai_reason?: string | null
      recovery_probability?: number | null
      expected_value?: number | null
      executed_action?: string | null
      action_validated?: number | null
      action_outcome?: string | null
      action_executed_at?: string | null
    }

    return {
      id: tx.id,
      amount: tx.amount,
      failure: tx.decline_reason ?? '—',

      action: mapAction(
        tx,
        mockRow,
      ),

      policy: mapPolicy(
        tx,
        mockRow,
      ),

      outcome: mapOutcome(
        tx,
        escalatedIds,
        mockRow,
      ),

      appearFrom: 'complete',

      aiReason:
        backend.ai_reason ??
        undefined,

      recoveryProbability:
        backend.recovery_probability ??
        undefined,

      expectedValue:
        backend.expected_value ??
        undefined,

      executedAction:
        backend.executed_action ??
        null,

      actionValidated:
        backend.action_validated ??
        null,

      actionOutcome:
        backend.action_outcome ??
        null,

      actionExecutedAt:
        backend.action_executed_at ??
        null,
    }
  })
}


export function withExpectedValue(
  rows: RecoveryRow[],
  transactions: TransactionRecord[],
): RecoveryRow[] {
  const byId = new Map(
    transactions.map((tx) => [tx.id, tx]),
  )

  return rows.map((row) => {
    const tx = byId.get(row.id)

    if (!tx) {
      return row
    }

    const expectedValue = (
      tx as TransactionRecord & {
        expected_value?: number | null
      }
    ).expected_value

    // The backend computes expected value per transaction. Use it as the
    // source of truth; only fill the column and leave the replay row set
    // and every other decision column untouched.
    if (expectedValue == null) {
      return row
    }

    return {
      ...row,
      expectedValue,
    }
  })
}


export function mapAudit(
  audit: AuditRecord[],
): AuditEvent[] {
  return [...audit]
    .sort((a, b) => a.id - b.id)
    .map((log) => ({
      id: String(log.id),
      timestamp: formatAuditTimestamp(
        log.timestamp,
      ),
      actor: log.actor,
      event: log.event,
      details: log.details ?? '',
      appearFrom: 'complete',
    }))
}


function feedTone(
  event: string,
): FeedEvent['tone'] {
  if (
    event === 'INCIDENT_DIAGNOSED' ||
    event.includes('INCIDENT')
  ) {
    return 'risk'
  }

  if (
    event === 'ESCALATED' ||
    event === 'ROUTE_PROTECTION_ESCALATED'
  ) {
    return 'warn'
  }

  if (
    event === 'REVENUE_RECOVERED' ||
    event === 'RECOVERED'
  ) {
    return 'ok'
  }

  if (
    event === 'ACTION_VALIDATED' ||
    event === 'ROUTE_SHIFT'
  ) {
    return 'ok'
  }

  if (event === 'STOPPED') {
    return 'warn'
  }

  return 'neutral'
}


function feedTitle(
  event: string,
): string {
  switch (event) {
    case 'INCIDENT_DIAGNOSED':
      return 'Incident diagnosed'

    case 'ACTION_VALIDATED':
      return 'Policy approved'

    case 'REVENUE_RECOVERED':
      return 'Revenue recovered'

    case 'ESCALATED':
      return 'Transaction escalated'

    case 'STOPPED':
      return 'Transaction stopped'

    case 'ROUTE_SHIFT':
      return 'Future traffic protected'

    case 'ROUTE_PROTECTION_ESCALATED':
      return 'Route protection escalated'

    default:
      return event
        .replaceAll('_', ' ')
        .toLowerCase()
  }
}


export function mapActivityFeed(
  audit: AuditRecord[],
): FeedEvent[] {
  return [...audit]
    .sort((a, b) => b.id - a.id)
    .slice(0, 12)
    .map((log) => ({
      id: `feed-${log.id}`,
      time: formatAuditTimestamp(
        log.timestamp,
      ),
      title: feedTitle(log.event),
      detail: [
        log.transaction_id,
        log.details,
      ]
        .filter(Boolean)
        .join(' · '),
      tone: feedTone(log.event),
      appearFrom: 'complete',
    }))
}


export function incidentStatusLabel(
  incident: IncidentRecord | null,
): {
  statusLabel: string
  statusTone:
    | 'ok'
    | 'warn'
    | 'risk'
    | 'info'
} {
  if (!incident) {
    return {
      statusLabel: 'HEALTHY',
      statusTone: 'ok',
    }
  }

  if (incident.status === 'resolved') {
    return {
      statusLabel: 'INCIDENT RESOLVED',
      statusTone: 'ok',
    }
  }

  if (incident.status === 'open') {
    return {
      statusLabel: 'INCIDENT ACTIVE',
      statusTone: 'risk',
    }
  }

  return {
    statusLabel: incident.status
      .replaceAll('_', ' ')
      .toUpperCase(),
    statusTone: 'info',
  }
}
