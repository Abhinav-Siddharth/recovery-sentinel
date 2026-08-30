import { ActivityFeed } from './components/ActivityFeed'
import { AuditTrail } from './components/AuditTrail'
import { BaselineComparison } from './components/BaselineComparison'
import { Header } from './components/Header'
import { IncidentCard } from './components/IncidentCard'
import { KpiStrip } from './components/KpiStrip'
import { Panel } from './components/Panel'
import { RecoveryTable } from './components/RecoveryTable'
import { SuccessRateChart } from './components/SuccessRateChart'

import { useDashboardData } from './hooks/useDashboardData'
import { useIncidentReplay } from './hooks/useIncidentReplay'

import {
  asPercent,
  incidentStatusLabel,
  mapActivityFeed,
  mapAudit,
  mapTransactions,
} from './lib/mappers'


export default function App() {
  const {
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
  } = useDashboardData()


  const {
    snapshot,
    phase,
    playing,
    replay,
    replayError,
  } =
    useIncidentReplay({
      reload,
      applyIncident,
      applyMetrics,
    })


  const useLive =
    phase === 'incident' ||
    phase === 'recovering' ||
    phase === 'complete'


  const liveIncident =
    incident?.incident ?? null


  const headerStatus =
    playing && phase !== 'complete'
      ? {
          statusLabel:
            snapshot.statusLabel,
          statusTone:
            snapshot.statusTone,
        }
      : liveIncident
        ? incidentStatusLabel(
            liveIncident,
          )
        : {
            statusLabel:
              snapshot.statusLabel,
            statusTone:
              snapshot.statusTone,
          }


  const revenueAtRisk =
    useLive
      ? (
          metrics?.revenue_at_risk ??
          snapshot.revenueAtRisk
        )
      : snapshot.revenueAtRisk


  const revenueRecovered =
    useLive
      ? (
          metrics?.revenue_recovered ??
          snapshot.revenueRecovered
        )
      : snapshot.revenueRecovered


  const recoveryRate =
    useLive
      ? metrics
        ? asPercent(
            metrics.recovery_rate,
          )
        : snapshot.recoveryRate
      : snapshot.recoveryRate


  const affectedTransactions =
    useLive
      ? (
          metrics?.affected_transactions ??
          snapshot.affectedTransactions
        )
      : snapshot.affectedTransactions


  const escalated =
    useLive
      ? (
          metrics?.escalated ??
          snapshot.escalated
        )
      : snapshot.escalated


  const recoveryRows =
    useLive
      ? mapTransactions(
          transactions,
          audit,
        )
      : snapshot.rows


  const auditEvents =
    useLive
      ? mapAudit(audit)
      : snapshot.audit


  const feedEvents =
    useLive
      ? mapActivityFeed(audit)
      : snapshot.feed


  const displayError =
    replayError ?? error


  return (
    <div className="app-shell min-h-svh text-[#d5e0ee]">
      <Header
        statusLabel={
          headerStatus.statusLabel
        }
        statusTone={
          headerStatus.statusTone
        }
        phase={phase}
        playing={playing}
        onReplay={() => {
          void replay()
        }}
      />


      <main className="relative mx-auto max-w-[1440px] space-y-5 px-6 py-6">

        <KpiStrip
          revenueAtRisk={
            revenueAtRisk
          }
          revenueRecovered={
            revenueRecovered
          }
          recoveryRate={
            recoveryRate
          }
          affectedTransactions={
            affectedTransactions
          }
          escalated={escalated}
          loading={loading}
          error={displayError}
        />


        <Panel
          eyebrow="Counterfactual"
          title="Recovery vs blind retry"
        >
          <BaselineComparison
            evaluation={evaluation}
            loading={loading}
          />
        </Panel>


        <IncidentCard
          incidentId={
            liveIncident?.id ??
            'INC-001'
          }
          route={
            liveIncident?.route ??
            'ROUTE_B'
          }
          status={
            useLive
              ? (
                  liveIncident?.status ??
                  ''
                )
              : snapshot.statusLabel
          }
          baselineSuccess={
            useLive && liveIncident
              ? asPercent(
                  liveIncident.baseline_success_rate,
                )
              : snapshot.baselineSuccess
          }
          observedSuccess={
            useLive && liveIncident
              ? asPercent(
                  liveIncident.observed_success_rate,
                )
              : snapshot.observedSuccess
          }
          affectedTransactions={
            useLive
              ? (
                  incident?.affected_transactions ??
                  snapshot.affectedTransactions
                )
              : snapshot.affectedTransactions
          }
          revenueAtRisk={
            useLive
              ? (
                  incident?.revenue_at_risk ??
                  snapshot.revenueAtRisk
                )
              : snapshot.revenueAtRisk
          }
          protectActive={
            snapshot.protectActive
          }
          loading={loading}
          error={error}
        />


        <Panel
          eyebrow="Success path"
          title="Payment success rate over time"
        >
          <SuccessRateChart
            data={snapshot.chart}
            showDegradation={
              phase !== 'healthy'
            }
          />
        </Panel>


        <div className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
          <Panel
            eyebrow="Recovery"
            title="Recovery activity"
          >
            <RecoveryTable
              rows={recoveryRows}
              loading={loading}
              error={error}
            />
          </Panel>


          <Panel
            eyebrow="Agent"
            title="Activity feed"
          >
            <ActivityFeed
              events={feedEvents}
              loading={loading}
              error={error}
            />
          </Panel>
        </div>


        <Panel
          eyebrow="Safety"
          title="Audit trail"
        >
          <AuditTrail
            events={auditEvents}
            loading={loading}
            error={error}
          />
        </Panel>

      </main>
    </div>
  )
}
