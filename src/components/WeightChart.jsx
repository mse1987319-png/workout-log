import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLanguage } from '../i18n/useLanguage'
import { useChartColors } from '../lib/chartColors'
import { formatDay, formatKg } from '../lib/format'

function WeightTooltip({ active, payload }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{formatDay(point.date)}</p>
      <p>
        <span className="swatch" style={{ background: payload[0].color }} aria-hidden="true" />
        {t('progress.tooltipHeaviest', { kg: formatKg(point.kg) })}
      </p>
    </div>
  )
}

// One series (the chosen exercise) over time: 2px line, 8px dots with a 2px
// surface ring, the latest value labeled at the end, crosshair tooltip.
export default function WeightChart({ points }) {
  const colors = useChartColors()
  const data = points.map((point) => ({ ...point, label: formatDay(point.date) }))
  const last = data.length - 1

  return (
    <div className="chart">
      <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 640, height: 240 }}>
        <LineChart data={data} margin={{ top: 28, right: 28, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: colors.axis }}
            interval="preserveStartEnd"
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: colors.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={52}
            unit=" kg"
          />
          <Tooltip content={<WeightTooltip />} cursor={{ stroke: colors.axis, strokeWidth: 1 }} />
          <Line
            type="linear"
            dataKey="kg"
            stroke={colors.strength}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            dot={{ r: 4, fill: colors.strength, stroke: colors.surface, strokeWidth: 2 }}
            activeDot={{ r: 6, fill: colors.strength, stroke: colors.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          >
            <LabelList
              dataKey="kg"
              content={({ x, y, value, index }) =>
                index === last ? (
                  <text x={x} y={y - 12} textAnchor="middle" fill={colors.text} fontSize={12} fontWeight={600}>
                    {formatKg(value)} kg
                  </text>
                ) : null
              }
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
