import type { ReactNode } from 'react'

type PanelProps = {
  title: string
  eyebrow?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, eyebrow, icon, action, children, className = '' }: PanelProps) {
  return (
    <section className={`glass ${className}`}>
      <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex h-6 w-6 items-center justify-center rounded-lg border border-[#3d9cf0]/20 bg-[#3d9cf0]/10 text-[#6cc1ff]">
              {icon}
            </span>
          ) : null}
          <div>
            {eyebrow ? (
              <p className="font-mono text-[10px] tracking-[0.18em] text-[#7f93a8] uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h2 className="text-sm font-medium tracking-wide text-[#e8eef5]">{title}</h2>
          </div>
        </div>
        {action}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}