import type {
  AuditEvent,
  ChartPoint,
  DashboardSnapshot,
  FeedEvent,
  RecoveryRow,
  ReplayPhase,
} from '../types'

export const PHASE_ORDER: ReplayPhase[] = [
  'healthy',
  'detecting',
  'incident',
  'recovering',
  'complete',
]

export const PHASE_DURATION_MS: Record<ReplayPhase, number> = {
  healthy: 1500,
  detecting: 1700,
  incident: 1900,
  recovering: 2600,
  complete: 0,
}

const BASELINE = 96.5
const OBSERVED = 31.25

function buildChart(phase: ReplayPhase): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let minute = 12 * 60; minute <= 16 * 60; minute += 5) {
    const hour = Math.floor(minute / 60)
    const min = minute % 60
    const time = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
    const inIncident = minute >= 13 * 60 + 40 && minute <= 14 * 60 + 25
    let success = BASELINE + Math.sin(minute / 18) * 0.8

    if (phase === 'healthy') {
      success = BASELINE + Math.sin(minute / 18) * 0.6
    } else if (phase === 'detecting' && minute >= 13 * 60 + 35) {
      success = minute < 13 * 60 + 45 ? 78 : 64
    } else if (inIncident) {
      const depth = phase === 'detecting' ? 58 : OBSERVED
      success = depth + Math.sin(minute / 7) * 2.2
      if (phase === 'recovering' && minute >= 14 * 60 + 5) success = 54
      if (phase === 'complete' && minute >= 14 * 60 + 10) success = 91
    } else if (phase === 'complete' && minute > 14 * 60 + 25) {
      success = 94.8 + Math.sin(minute / 20) * 0.5
    }

    points.push({
      time,
      minute,
      success: Number(success.toFixed(2)),
      incident: inIncident && phase !== 'healthy',
    })
  }
  return points
}

const ALL_ROWS: RecoveryRow[] = [
  {
    id: 'TXN_0282',
    amount: 2141,
    failure: 'bank_technical_error',
    action: 'RETRY',
    policy: 'ALLOWED',
    outcome: 'RECOVERED',
    appearFrom: 'recovering',
  },
  {
    id: 'TXN_0283',
    amount: 45064,
    failure: 'bank_technical_error',
    action: 'RETRY',
    policy: 'ALLOWED',
    outcome: 'RECOVERED',
    appearFrom: 'recovering',
  },
  {
    id: 'TXN_0284',
    amount: 5394,
    failure: 'bank_technical_error',
    action: 'RETRY',
    policy: 'ALLOWED',
    outcome: 'RECOVERED',
    appearFrom: 'recovering',
  },
  {
    id: 'TXN_0285',
    amount: 41015,
    failure: 'network_timeout',
    action: 'ESCALATE',
    policy: 'ALLOWED',
    outcome: 'ESCALATED',
    appearFrom: 'recovering',
  },
  {
    id: 'TXN_0286',
    amount: 39250,
    failure: 'bank_technical_error',
    action: 'RETRY',
    policy: 'ALLOWED',
    outcome: 'RECOVERED',
    appearFrom: 'complete',
  },
  {
    id: 'TXN_0291',
    amount: 28068,
    failure: 'bank_technical_error',
    action: 'RETRY',
    policy: 'ALLOWED',
    outcome: 'RECOVERED',
    appearFrom: 'complete',
  },
  {
    id: 'TXN_0296',
    amount: 23273,
    failure: 'issuer_declined',
    action: 'ESCALATE',
    policy: 'ALLOWED',
    outcome: 'ESCALATED',
    appearFrom: 'complete',
  },
  {
    id: 'TXN_0298',
    amount: 37974,
    failure: 'bank_technical_error',
    action: 'RETRY',
    policy: 'ALLOWED',
    outcome: 'RECOVERED',
    appearFrom: 'complete',
  },
]

const ALL_FEED: FeedEvent[] = [
  {
    id: 'f1',
    time: '13:40:02',
    title: 'Incident detected',
    detail: 'ROUTE_B / UPI success dropped below baseline by 65.3 pts.',
    tone: 'risk',
    appearFrom: 'detecting',
  },
  {
    id: 'f2',
    time: '13:40:08',
    title: 'Root cause diagnosed',
    detail: 'Clustered bank_technical_error and network_timeout on ROUTE_B.',
    tone: 'warn',
    appearFrom: 'incident',
  },
  {
    id: 'f3',
    time: '13:42:11',
    title: 'AI proposed RETRY',
    detail: 'TXN_0282 · ₹2,141 · recoverable technical failure.',
    tone: 'neutral',
    appearFrom: 'recovering',
  },
  {
    id: 'f4',
    time: '13:42:12',
    title: 'Policy approved',
    detail: 'Retry within amount bound and retryable failure class.',
    tone: 'ok',
    appearFrom: 'recovering',
  },
  {
    id: 'f5',
    time: '13:42:14',
    title: '₹2,141 recovered',
    detail: 'TXN_0282 captured on retry via ROUTE_C.',
    tone: 'ok',
    appearFrom: 'recovering',
  },
  {
    id: 'f6',
    time: '13:45:06',
    title: 'Transaction escalated',
    detail: 'TXN_0285 · ₹41,015 · high-value network_timeout.',
    tone: 'warn',
    appearFrom: 'recovering',
  },
  {
    id: 'f7',
    time: '13:46:20',
    title: 'Future traffic protected',
    detail: 'Bounded shift ROUTE_B → ROUTE_C for UPI.',
    tone: 'ok',
    appearFrom: 'complete',
  },
]

const ALL_AUDIT: AuditEvent[] = [
  {
    id: 'a1',
    timestamp: '13:40:02.118',
    actor: 'detector',
    event: 'INCIDENT_OPENED',
    details: 'INC-001 · ROUTE_B/UPI · observed success 31.25%',
    appearFrom: 'detecting',
  },
  {
    id: 'a2',
    timestamp: '13:40:08.441',
    actor: 'diagnosis',
    event: 'ROOT_CAUSE',
    details: 'Acquirer technical cluster on ROUTE_B UPI',
    appearFrom: 'incident',
  },
  {
    id: 'a3',
    timestamp: '13:42:11.002',
    actor: 'proposer',
    event: 'ACTION_PROPOSED',
    details: 'RETRY TXN_0282 · ₹2,141',
    appearFrom: 'recovering',
  },
  {
    id: 'a4',
    timestamp: '13:42:12.190',
    actor: 'policy',
    event: 'ALLOWED',
    details: 'Retryable code · amount within bound',
    appearFrom: 'recovering',
  },
  {
    id: 'a5',
    timestamp: '13:42:14.673',
    actor: 'executor',
    event: 'RECOVERED',
    details: 'TXN_0282 settled · ₹2,141',
    appearFrom: 'recovering',
  },
  {
    id: 'a6',
    timestamp: '13:45:06.884',
    actor: 'proposer',
    event: 'ACTION_PROPOSED',
    details: 'ESCALATE TXN_0285 · ₹41,015',
    appearFrom: 'recovering',
  },
  {
    id: 'a7',
    timestamp: '13:45:07.102',
    actor: 'policy',
    event: 'ALLOWED',
    details: 'High-value timeout · ops queue',
    appearFrom: 'recovering',
  },
  {
    id: 'a8',
    timestamp: '13:46:20.330',
    actor: 'executor',
    event: 'ROUTE_SHIFT',
    details: 'UPI ROUTE_B → ROUTE_C · bounded 15m',
    appearFrom: 'complete',
  },
]

function reached(phase: ReplayPhase, appearFrom: ReplayPhase): boolean {
  return PHASE_ORDER.indexOf(phase) >= PHASE_ORDER.indexOf(appearFrom)
}

export function getSnapshot(phase: ReplayPhase): DashboardSnapshot {
  const rows = ALL_ROWS.filter((row) => reached(phase, row.appearFrom))
  const recovered = rows
    .filter((row) => row.outcome === 'RECOVERED')
    .reduce((sum, row) => sum + row.amount, 0)
  const escalated = rows.filter((row) => row.outcome === 'ESCALATED').length

  const byPhase: Record<ReplayPhase, Omit<DashboardSnapshot, 'phase' | 'chart' | 'rows' | 'feed' | 'audit'>> = {
    healthy: {
      statusLabel: 'HEALTHY',
      statusTone: 'ok',
      revenueAtRisk: 0,
      revenueRecovered: 0,
      recoveryRate: 0,
      affectedTransactions: 0,
      escalated: 0,
      baselineSuccess: BASELINE,
      observedSuccess: BASELINE,
      protectActive: false,
    },
    detecting: {
      statusLabel: 'DETECTING',
      statusTone: 'warn',
      revenueAtRisk: 384220,
      revenueRecovered: 0,
      recoveryRate: 0,
      affectedTransactions: 11,
      escalated: 0,
      baselineSuccess: BASELINE,
      observedSuccess: 71.4,
      protectActive: false,
    },
    incident: {
      statusLabel: 'INCIDENT ACTIVE',
      statusTone: 'risk',
      revenueAtRisk: 1221874,
      revenueRecovered: 0,
      recoveryRate: 0,
      affectedTransactions: 48,
      escalated: 0,
      baselineSuccess: BASELINE,
      observedSuccess: OBSERVED,
      protectActive: false,
    },
    recovering: {
      statusLabel: 'RECOVERING',
      statusTone: 'info',
      revenueAtRisk: 1221874,
      revenueRecovered: 52600,
      recoveryRate: 4.3,
      affectedTransactions: 48,
      escalated: 1,
      baselineSuccess: BASELINE,
      observedSuccess: OBSERVED,
      protectActive: true,
    },
    complete: {
      statusLabel: 'INCIDENT ACTIVE',
      statusTone: 'risk',
      revenueAtRisk: 1221874,
      revenueRecovered: 587898,
      recoveryRate: 48.1,
      affectedTransactions: 48,
      escalated: 22,
      baselineSuccess: BASELINE,
      observedSuccess: OBSERVED,
      protectActive: true,
    },
  }

  const base = byPhase[phase]

  return {
    phase,
    ...base,
    revenueRecovered: phase === 'recovering' ? recovered : base.revenueRecovered,
    escalated: phase === 'recovering' ? escalated : base.escalated,
    chart: buildChart(phase),
    rows,
    feed: ALL_FEED.filter((item) => reached(phase, item.appearFrom)),
    audit: ALL_AUDIT.filter((item) => reached(phase, item.appearFrom)),
  }
}
