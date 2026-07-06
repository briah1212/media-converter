import Link from 'next/link'

export default function Home() {
  const tools = [
    {
      title: 'YouTube to MP4',
      description: 'Download YouTube videos as MP4 files',
      href: '/youtube-to-mp4',
      icon: '🎥',
    },
    {
      title: 'YouTube to MP3',
      description: 'Download YouTube videos as MP3 audio',
      href: '/youtube-to-mp3',
      icon: '🎵',
    },
    {
      title: 'MP4 to MP3',
      description: 'Convert MP4 video files to MP3 audio',
      href: '/mp4-to-mp3',
      icon: '🔄',
    },
  ]

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <h1 style={{
        fontSize: '3rem',
        fontWeight: 'bold',
        color: 'white',
        marginBottom: '1rem',
        textAlign: 'center',
      }}>
        Brian Tools
      </h1>
      <p style={{
        fontSize: '1.25rem',
        color: 'rgba(255, 255, 255, 0.9)',
        marginBottom: '3rem',
        textAlign: 'center',
      }}>
        Media Conversion Tools
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        maxWidth: '1200px',
        width: '100%',
      }}>
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            style={{
              textDecoration: 'none',
            }}
          >
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '2rem',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
              transition: 'transform 0.3s ease, box-shadow 0.3s ease',
              cursor: 'pointer',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
              }}
            >
              <div style={{
                fontSize: '3rem',
                marginBottom: '1rem',
              }}>
                {tool.icon}
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                marginBottom: '0.5rem',
                color: '#333',
              }}>
                {tool.title}
              </h2>
              <p style={{
                color: '#666',
                lineHeight: '1.5',
              }}>
                {tool.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  )
}
