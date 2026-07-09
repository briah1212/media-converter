import Link from 'next/link'

export default function Header({ crumb }: { crumb?: string }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 32px',
        background: 'oklch(97% 0.012 245 / 0.92)',
        backdropFilter: 'blur(10px)',
        borderBottom: '2px solid var(--border)',
      }}
    >
      <Link
        href="/"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          textDecoration: 'none',
          flexShrink: 0,
        }}
      >
        <div
          className="notch-5"
          style={{
            width: 28,
            height: 28,
            background: 'var(--accent)',
            border: '2px solid oklch(27% 0.02 250 / 0.7)',
            boxShadow: '2px 2px 0 var(--border)',
            flexShrink: 0,
          }}
        />
        <span
          className="font-pixel"
          style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.3 }}
        >
          BRIAN HSU
          <br />
          <span style={{ fontSize: 9, color: 'var(--muted)' }}>MEDIA SUITE</span>
        </span>
      </Link>
      {crumb && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            color: 'var(--muted)',
            minWidth: 0,
            overflow: 'hidden',
          }}
        >
          <span style={{ opacity: 0.5 }}>/</span>
          <span
            className="font-pixel"
            style={{
              padding: '5px 12px',
              background: 'var(--tile)',
              border: '1.5px solid var(--border)',
              color: 'var(--ink)',
              fontSize: 11,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {crumb}
          </span>
        </div>
      )}
      <Link
        href="/"
        style={{
          flexShrink: 0,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--accent-dark)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
        }}
      >
        <span style={{ fontSize: 15 }}>←</span> All tools
      </Link>
    </header>
  )
}
