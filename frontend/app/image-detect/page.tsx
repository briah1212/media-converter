'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function ImageDetect() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch(`${API_URL}/api/v1/compress/image/detect`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Detection failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

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
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          Image Format Detection
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Detect image format and view detailed metadata
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Upload Image File
            </label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            {file && (
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.875rem',
                color: '#666',
              }}>
                Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !file}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: (loading || !file) ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (loading || !file) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              if (!loading && file) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (!loading && file) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            {loading ? 'Detecting...' : 'Detect Format'}
          </button>
        </form>

        {error && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fee2e2',
            borderRadius: '8px',
            color: '#dc2626',
          }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.5rem',
            backgroundColor: '#f0fdf4',
            borderRadius: '8px',
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              marginBottom: '1rem',
              color: '#16a34a',
            }}>
              Image Metadata
            </h3>
            <div style={{
              display: 'grid',
              gap: '0.75rem',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#333',
              }}>
                <strong>Format:</strong>
                <span>{result.detected_format?.toUpperCase() || 'N/A'}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#333',
              }}>
                <strong>Dimensions:</strong>
                <span>{result.width} × {result.height} px</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#333',
              }}>
                <strong>File Size:</strong>
                <span>{result.size_kb} KB</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#333',
              }}>
                <strong>Color Mode:</strong>
                <span>{result.mode || 'N/A'}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                color: '#333',
              }}>
                <strong>Transparency:</strong>
                <span>{result.has_transparency ? 'Yes' : 'No'}</span>
              </div>
              {result.dpi && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  color: '#333',
                }}>
                  <strong>DPI:</strong>
                  <span>{result.dpi}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
