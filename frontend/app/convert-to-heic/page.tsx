'use client'

import { useState } from 'react'
import Link from 'next/link'

// TypeScript interface matching backend response structure
interface ConvertToHeicResponse {
  success: boolean
  message: string
  file_id: string
  original_format: string
  output_format: string
  original_size_kb: number   // KB not bytes!
  output_size_kb: number     // KB not bytes!
  compression_ratio: number
  dimensions: string         // "800x600" format
  quality: number
}

export default function ConvertToHEIC() {
  const [file, setFile] = useState<File | null>(null)
  const [quality, setQuality] = useState(90)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConvertToHeicResponse | null>(null)
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
    formData.append('quality', quality.toString())

    try {
      const response = await fetch(`${API_URL}/api/v1/convert/to-heic`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Conversion failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (result && result.file_id) {
      window.open(`${API_URL}/api/v1/download/${result.file_id}`, '_blank')
    }
  }

  // Convert KB to MB
  const kbToMb = (kb: number) => {
    return (kb / 1024).toFixed(2)
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
          Convert to HEIC
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Convert images to high-efficiency HEIC format
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
              accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
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

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Quality: {quality}
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
            }}>
              <span>0</span>
              <span>100</span>
            </div>
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
            {loading ? 'Converting...' : 'Convert to HEIC'}
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
              marginBottom: '0.5rem',
              color: '#16a34a',
            }}>
              Conversion Complete!
            </h3>
            <div style={{
              color: '#333',
              marginBottom: '1rem',
              fontSize: '0.875rem',
            }}>
              <p style={{ marginBottom: '0.25rem' }}>
                <strong>Format:</strong> {result.original_format?.toUpperCase() || 'IMAGE'} → {result.output_format?.toUpperCase() || 'HEIC'}
              </p>
              <p style={{ marginBottom: '0.25rem' }}>
                <strong>Dimensions:</strong> {result.dimensions || 'N/A'}
              </p>
              <p style={{ marginBottom: '0.25rem' }}>
                <strong>Original size:</strong> {kbToMb(result.original_size_kb)} MB ({result.original_size_kb.toFixed(2)} KB)
              </p>
              <p style={{ marginBottom: '0.25rem' }}>
                <strong>Output size:</strong> {kbToMb(result.output_size_kb)} MB ({result.output_size_kb.toFixed(2)} KB)
              </p>
              <p style={{ marginBottom: '0.25rem' }}>
                <strong>Compression ratio:</strong> {result.compression_ratio.toFixed(2)}%
              </p>
              <p style={{ marginBottom: '0.25rem' }}>
                <strong>Quality used:</strong> {result.quality}
              </p>
            </div>
            <button
              onClick={handleDownload}
              style={{
                padding: '0.625rem 1.5rem',
                backgroundColor: '#16a34a',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#15803d'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#16a34a'}
            >
              Download HEIC
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
