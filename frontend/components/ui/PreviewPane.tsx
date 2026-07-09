'use client'

interface PreviewPaneProps {
  label: string
  accent?: boolean
  imageUrl?: string | null
  caption?: string
  meta?: React.ReactNode
  aspectRatio?: string
}

export default function PreviewPane({
  label,
  accent,
  imageUrl,
  caption,
  meta,
  aspectRatio = '4/3',
}: PreviewPaneProps) {
  return (
    <div>
      <div
        className="label-caps"
        style={{ marginBottom: 8, color: accent ? 'var(--accent-dark)' : undefined }}
      >
        {label}
      </div>
      <div
        className="stripes"
        style={{
          aspectRatio,
          border: accent ? '2px solid oklch(58% 0.135 250 / 0.5)' : '2px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={label}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          caption && (
            <span
              className="font-mono"
              style={{
                fontSize: 11,
                color: 'var(--muted)',
                background: 'white',
                padding: '4px 8px',
                border: '1px solid var(--border)',
                maxWidth: '85%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {caption}
            </span>
          )
        )}
      </div>
      {meta && <div style={{ fontSize: 13, marginTop: 8 }}>{meta}</div>}
    </div>
  )
}
