import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useLanguage } from '../i18n/useLanguage'
import { useChartColors } from '../lib/chartColors'
import { formatCalendarDay, typeLabel } from '../lib/format'
import { minuteTicks } from '../lib/progress'

const GAP = 2 // surface gap between stacked segments
const RADIUS = 4 // rounded data-end; square at the baseline

// Rounded top corners only.
function roundedTop(x, y, width, height, r) {
  return `M${x},${y + height}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${y + height}Z`
}

// A stacked segment: the top one gets the rounded end; a lower one leaves a
// 2px gap (surface) under the segment above it.
function Segment({ x, y, width, height, fill, isTop }) {
  const gap = isTop ? 0 : GAP
  const h = height - gap
  if (!(h > 0)) return null
  const r = isTop ? Math.min(RADIUS, h, width / 2) : 0
  return <path d={roundedTop(x, y + gap, width, h, r)} fill={fill} />
}

function MinutesTooltip({ active, payload, colors }) {
  const { t } = useLanguage()
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-title">{t('progress.weekOfDate', { date: formatCalendarDay(row.weekStart) })}</p>
      <p>
        <span className="swatch" style={{ background: colors.strength }} aria-hidden="true" />
        {t('progress.tooltipMinutes', { label: typeLabel('strength'), minutes: t('unit.min', { count: row.strength }) })}
      </p>
      <p>
        <span className="swatch" style={{ background: colors.other }} aria-hidden="true" />
        {t('progress.tooltipMinutes', { label: typeLabel('other'), minutes: t('unit.min', { count: row.other }) })}
      </p>
    </div>
  )
}

// Minutes per week, strength and other stacked. Legend above; the current
// week's total on its cap; every value also in the tooltip and the table.
export default function MinutesChart({ weeks }) {
  const colors = useChartColors()
  const { t } = useLanguage()
  const data = weeks.map((week) => ({
    ...week,
    total: week.strength + week.other,
    label: formatCalendarDay(week.weekStart),
  }))
  const last = data.length - 1
  const ticks = minuteTicks(Math.max(0, ...data.map((week) => week.total)))

  return (
    <div className="chart">
      <ul className="legend" aria-label={t('progress.legend')}>
        <li>
          <span className="swatch" style={{ background: colors.strength }} aria-hidden="true" />
          {typeLabel('strength')}
        </li>
        <li>
          <span className="swatch" style={{ background: colors.other }} aria-hidden="true" />
          {typeLabel('other')}
        </li>
      </ul>
      <ResponsiveContainer width="100%" height={240} initialDimension={{ width: 640, height: 240 }}>
        <BarChart data={data} margin={{ top: 24, right: 8, bottom: 4, left: 4 }}>
          <CartesianGrid vertical={false} stroke={colors.grid} />
          <XAxis
            dataKey="label"
            tick={{ fill: colors.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: colors.axis }}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            ticks={ticks}
            domain={[0, ticks.at(-1)]}
            tick={{ fill: colors.muted, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<MinutesTooltip colors={colors} />} cursor={{ fill: colors.grid, opacity: 0.6 }} />
          <Bar
            dataKey="strength"
            stackId="minutes"
            fill={colors.strength}
            barSize={20}
            isAnimationActive={false}
            shape={(props) => <Segment {...props} isTop={props.payload.other === 0} />}
          />
          <Bar
            dataKey="other"
            stackId="minutes"
            fill={colors.other}
            barSize={20}
            isAnimationActive={false}
            shape={(props) => <Segment {...props} isTop />}
          >
            <LabelList
              dataKey="total"
              content={({ x, y, width, value, index }) =>
                index === last && value > 0 ? (
                  <text
                    x={x + width / 2}
                    y={y - 8}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize={12}
                    fontWeight={600}
                  >
                    {t('unit.min', { count: value })}
                  </text>
                ) : null
              }
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
