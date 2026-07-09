'use client'

interface FileInfoCardProps {
  emoji: string
  name: string
  meta: string
  onRemove: () => void
}

export default function FileInfoCard({ emoji, name, meta, onRemove }: FileInfoCardProps) {
  return (
    <div
      className="pixel-card notch-6"
      style={{
        marginTop: 24,
        padding: 18,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: 'none',
      }}
    >
      <div style={{ fontSize: 22 }}>{emoji}</div>
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
          {name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{meta}</div>
      </div>
      <button
        onClick={onRemove}
        className="btn-secondary"
        style={{ padding: '7px 12px', fontSize: 12, flexShrink: 0 }}
      >
        Remove
      </button>
    </div>
  )
}
