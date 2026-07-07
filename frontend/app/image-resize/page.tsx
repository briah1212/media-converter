'use client'

import Link from 'next/link'

export default function ImageResize() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '2rem',
    }}>
      <Link href="/" style={{
        color: 'white',
        textDecoration: 'none',
        marginBottom: '2rem',
        fontSize: '1rem',
      }}>
        ← Back to Home
      </Link>

      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '2.5rem',
        boxShadow: '0 15px 40px rgba(0, 0, 0, 0.2)',
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          fontSize: '4rem',
          marginBottom: '1.5rem',
        }}>
          🚧
        </div>
        
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          Image Resize
        </h1>
        
        <div style={{
          display: 'inline-block',
          padding: '0.5rem 1rem',
          backgroundColor: '#667eea',
          color: 'white',
          borderRadius: '20px',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '1.5rem',
        }}>
          Coming Soon
        </div>
        
        <p style={{
          color: '#666',
          fontSize: '1.125rem',
          lineHeight: '1.6',
          marginBottom: '1rem',
        }}>
          Image resizing functionality is currently under development.
        </p>
        
        <p style={{
          color: '#999',
          fontSize: '0.875rem',
          lineHeight: '1.5',
        }}>
          This feature will allow you to resize images by width, height, or scale percentage. Check back soon!
        </p>

        <div style={{
          marginTop: '2rem',
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          textAlign: 'left',
        }}>
          <h3 style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#333',
            marginBottom: '0.75rem',
          }}>
            Planned Features:
          </h3>
          <ul style={{
            margin: 0,
            paddingLeft: '1.5rem',
            color: '#666',
            lineHeight: '1.8',
          }}>
            <li>Resize by width and height</li>
            <li>Resize by percentage scale</li>
            <li>Maintain aspect ratio option</li>
            <li>Multiple image format support</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
