'use client'

interface TrimStatsProps {
  startLabel: string
  endLabel: string
  clipLabel: string
}

export default function TrimStats({ startLabel, endLabel, clipLabel }: TrimStatsProps) {
  return (
    <div style={{ display: 'flex', gap: 20, marginTop: 16 }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          padding: '12px 16px',
          flex: 1,
        }}
      >
        <div className="label-caps" style={{ fontSize: 11 }}>
          Start
        </div>
        <div className="font-mono" style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>
          {startLabel}
        </div>
      </div>
      <div
        style={{
          background: 'var(--surface)',
          border: '2px solid var(--border)',
          padding: '12px 16px',
          flex: 1,
        }}
      >
        <div className="label-caps" style={{ fontSize: 11 }}>
          End
        </div>
        <div className="font-mono" style={{ fontWeight: 700, fontSize: 18, marginTop: 4 }}>
          {endLabel}
        </div>
      </div>
      <div
        style={{
          background: 'var(--tile)',
          border: '2px solid var(--accent-soft)',
          padding: '12px 16px',
          flex: 1,
        }}
      >
        <div className="label-caps" style={{ fontSize: 11, color: 'var(--accent-dark)' }}>
          Trimmed length
        </div>
        <div
          className="font-mono"
          style={{ fontWeight: 700, fontSize: 18, marginTop: 4, color: 'var(--accent-dark)' }}
        >
          {clipLabel}
        </div>
      </div>
    </div>
  )
}
