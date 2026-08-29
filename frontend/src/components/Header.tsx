import { Play } from 'lucide-react'
import type { ReplayPhase } from '../types'

const STEPS: ReplayPhase[] = ['healthy', 'detecting', 'incident', 'recovering', 'complete']

type HeaderProps = {
  statusLabel: string
  statusTone: 'ok' | 'warn' | 'risk' | 'info'
  phase: ReplayPhase
  playing: boolean
  onReplay: () => void
}

const toneClass: Record<HeaderProps['statusTone'], string> = {
  ok: 'text-[#3dcc9a]',
  warn: 'text-[#e8a54b]',
  risk: 'text-[#f07167]',
  info: 'text-[#4aa8e8]',
}

export function Header({ statusLabel, statusTone, phase, playing, onReplay }: HeaderProps) {
  return (
    <header className="border-b border-[#1d3348] bg-[#07131e]/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-4">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#6f879e] uppercase">
            Razorpay · Payments Ops
          </p>
          <h1 className="text-[26px] leading-none font-semibold tracking-tight text-white">
            Recovery Sentinel
          </h1>
          <p className="mt-1.5 text-sm text-[#8fa3b8]">Incident-aware revenue recovery</p>
        </div>

        <ol className="hidden items-center gap-2 lg:flex">
          {STEPS.map((step, index) => {
            const active = STEPS.indexOf(phase) >= index
            return (
              <li key={step} className="flex items-center gap-2">
                <span
                  className={`font-mono text-[10px] tracking-[0.14em] uppercase ${
                    active ? 'text-[#d5e4f2]' : 'text-[#4d6276]'
                  }`}
                >
                  {step}
                </span>
                {index < STEPS.length - 1 ? (
                  <span className={`h-px w-6 ${active ? 'bg-[#3d9cf0]' : 'bg-[#24384c]'}`} />
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 border border-[#2a4258] bg-black/20 px-3 py-1.5 font-mono text-xs tracking-[0.16em] ${toneClass[statusTone]}`}
          >
            <span className={`pulse-dot inline-block h-2 w-2 rounded-full bg-current`} />
            {statusLabel}
          </div>
          <button
            type="button"
            onClick={onReplay}
            disabled={playing}
            className="inline-flex items-center gap-2 bg-[#e8a54b] px-4 py-2 text-sm font-semibold tracking-wide text-[#1a1208] transition hover:bg-[#f0b45d] disabled:cursor-wait disabled:opacity-70"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Replay Incident
          </button>
        </div>
      </div>
    </header>
  )
}
