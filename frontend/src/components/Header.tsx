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

const toneGlow: Record<HeaderProps['statusTone'], string> = {
  ok: 'shadow-[0_0_18px_rgba(61,204,154,0.35)]',
  warn: 'shadow-[0_0_18px_rgba(232,165,75,0.3)]',
  risk: 'shadow-[0_0_18px_rgba(240,113,103,0.3)]',
  info: 'shadow-[0_0_18px_rgba(74,168,232,0.3)]',
}

export function Header({ statusLabel, statusTone, phase, playing, onReplay }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#050b14]/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-6 py-5">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-[0.22em] text-[#6f879e] uppercase">
            Razorpay | Payments Ops
          </p>
          <h1 className="bg-gradient-to-r from-white via-[#cfe6ff] to-[#7cc0ff] bg-clip-text text-[26px] leading-none font-semibold tracking-tight text-transparent">
            Recovery Sentinel
          </h1>
          <p className="mt-1.5 text-sm text-[#8fa3b8]">Incident-aware revenue recovery</p>
        </div>

        <ol className="hidden items-center gap-3 lg:flex">
          {STEPS.map((step, index) => {
            const currentIndex = STEPS.indexOf(phase)
            const done = currentIndex > index
            const active = currentIndex === index

            return (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`font-mono text-[13px] font-semibold tracking-[0.16em] uppercase transition-all duration-300 ${active
                    ? 'scale-110 text-[#7cc0ff]'
                    : done
                      ? 'text-[#d5e4f2]'
                      : 'text-[#4d6276]'
                    }`}
                >
                  <span className="relative inline-flex items-center gap-2">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full bg-current ${active ? 'animate-ping-slow' : ''
                        }`}
                    />
                    {step}
                  </span>
                </span>
                {index < STEPS.length - 1 ? (
                  <span
                    className={`h-px w-7 transition-colors duration-300 ${done || active ? 'bg-[#3d9cf0]' : 'bg-[#24384c]'
                      }`}
                  />
                ) : null}
              </li>
            )
          })}
        </ol>

        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.04] px-3.5 py-1.5 font-mono text-xs tracking-[0.16em] backdrop-blur-md ${toneClass[statusTone]} ${toneGlow[statusTone]}`}
          >
            <span className={`pulse-dot inline-block h-2 w-2 rounded-full bg-current`} />
            {statusLabel}
          </div>
          <button
            type="button"
            onClick={onReplay}
            disabled={playing}
            className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#f0b45d] to-[#e8a54b] px-4.5 py-2 text-sm font-semibold tracking-wide text-[#1a1208] transition-all hover:from-[#f7c476] hover:to-[#f0b45d] hover:shadow-[0_0_28px_rgba(232,165,75,0.45)] active:scale-[0.97] disabled:cursor-wait disabled:opacity-70"
          >
            <Play className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" />
            {playing ? 'Replaying...' : 'Replay Incident'}
          </button>
        </div>
      </div>
    </header>
  )
}