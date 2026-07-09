import Header from './Header'

interface ToolPageProps {
  crumb: string
  emoji: string
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function ToolPage({ crumb, emoji, title, subtitle, children }: ToolPageProps) {
  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <Header crumb={crumb} />
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '48px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
          <div className="icon-tile notch-6" style={{ width: 52, height: 52, fontSize: 26 }}>
            {emoji}
          </div>
          <div>
            <h1 style={{ fontSize: 26, margin: 0, fontWeight: 800 }}>{title}</h1>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '4px 0 0' }}>{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
