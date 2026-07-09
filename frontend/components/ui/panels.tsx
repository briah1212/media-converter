'use client'

interface ProgressPanelProps {
  label: string
  progress: number
}

export function ProgressPanel({ label, progress }: ProgressPanelProps) {
  return (
    <div className="pixel-card" style={{ padding: 20, maxWidth: 420 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 8,
        }}
      >
        <span>{label}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

interface DonePanelProps {
  filename: string
  meta: string
  onDownload?: () => void
  downloadLabel?: string
  onReset: () => void
  resetLabel?: string
}

export function DonePanel({
  filename,
  meta,
  onDownload,
  downloadLabel = '⬇ Download',
  onReset,
  resetLabel = 'Convert another',
}: DonePanelProps) {
  return (
    <div
      style={{
        background: 'var(--tile)',
        border: '2px solid var(--accent-soft)',
        padding: 20,
        maxWidth: 520,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <span style={{ fontSize: 26 }}>✅</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: 14,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {filename}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta}</div>
      </div>
      {onDownload && (
        <button
          onClick={onDownload}
          className="btn-primary"
          style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
        >
          {downloadLabel}
        </button>
      )}
      <button
        onClick={onReset}
        className="btn-secondary"
        style={{ padding: '8px 14px', fontSize: 12, flexShrink: 0 }}
      >
        {resetLabel}
      </button>
    </div>
  )
}

export function ErrorPanel({ message }: { message: string }) {
  return (
    <div
      style={{
        background: 'oklch(97% 0.02 25)',
        border: '2px solid oklch(55% 0.18 25 / 0.5)',
        padding: '14px 18px',
        maxWidth: 520,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginTop: 16,
      }}
    >
      <span style={{ fontSize: 18 }}>⚠️</span>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'oklch(40% 0.15 25)' }}>{message}</div>
    </div>
  )
}
