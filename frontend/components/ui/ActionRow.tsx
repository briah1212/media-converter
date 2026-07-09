'use client'

interface ActionRowProps {
  primaryLabel: string
  busyLabel?: string
  busy?: boolean
  disabled?: boolean
  onPrimary: () => void
  secondaryLabel: string
  onSecondary: () => void
}

export default function ActionRow({
  primaryLabel,
  busyLabel,
  busy,
  disabled,
  onPrimary,
  secondaryLabel,
  onSecondary,
}: ActionRowProps) {
  return (
    <div style={{ marginTop: 22, display: 'flex', gap: 12, alignItems: 'center' }}>
      <button className="btn-primary" onClick={onPrimary} disabled={busy || disabled}>
        {busy ? busyLabel || primaryLabel : primaryLabel}
      </button>
      <button className="btn-secondary" onClick={onSecondary} disabled={busy}>
        {secondaryLabel}
      </button>
    </div>
  )
}
