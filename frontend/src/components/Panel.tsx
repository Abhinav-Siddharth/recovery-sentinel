import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, eyebrow, action, children, className = '' }: PanelProps) {
  return (
    <section
      className={`border border-[#1d3348] bg-[#0a1724]/80 ${className}`}
    >
      <header className="flex items-center justify-between gap-4 border-b border-[#1d3348] px-5 py-3">
        <div>
          {eyebrow ? (
            <p className="font-mono text-[10px] tracking-[0.18em] text-[#7f93a8] uppercase">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-sm font-medium tracking-wide text-[#e8eef5]">{title}</h2>
        </div>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
