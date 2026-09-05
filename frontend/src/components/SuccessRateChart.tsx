import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ChartPoint } from '../types'

type SuccessRateChartProps = {
  data: ChartPoint[]
  showDegradation: boolean
}

export function SuccessRateChart({ data, showDegradation }: SuccessRateChartProps) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 0 }} key={data[0]?.success}>
          <CartesianGrid stroke="#1d3348" vertical={false} />
          <XAxis
            dataKey="time"
            interval={11}
            tick={{ fill: '#7f93a8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
            axisLine={{ stroke: '#1d3348' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(value: number) => `${value}%`}
            tick={{ fill: '#7f93a8', fontSize: 11, fontFamily: 'IBM Plex Mono' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: 'rgba(12, 27, 43, 0.92)',
              border: '1px solid rgba(148, 185, 222, 0.25)',
              borderRadius: 12,
              fontSize: 12,
              color: '#e8eef5',
              backdropFilter: 'blur(12px)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            }}
            formatter={(value) => [`${Number(value ?? 0).toFixed(1)}%`, 'Success']}
          />
          {showDegradation ? (
            <ReferenceArea
              x1="13:40"
              x2="14:25"
              fill="#e8a54b"
              fillOpacity={0.12}
              label={{
                value: 'DEGRADATION',
                fill: '#e8a54b',
                fontSize: 11,
                fontFamily: 'IBM Plex Mono',
                position: 'insideTop',
              }}
            />
          ) : null}
          <Line
            type="monotone"
            dataKey="success"
            stroke="#3d9cf0"
            strokeWidth={2}
            dot={false}
            isAnimationActive
            animationDuration={700}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
