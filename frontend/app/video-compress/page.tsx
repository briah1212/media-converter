'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VideoCompress() {
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState('medium')
  const [codec, setCodec] = useState('h264')
  const [crf, setCrf] = useState(23)
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
    formData.append('preset', preset)
    formData.append('codec', codec)
    formData.append('crf', crf.toString())

    try {
      const response = await fetch(`${API_URL}/api/v1/compress/video`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Compression failed')
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

  const calculateCompressionRatio = () => {
    if (result && result.input_size && result.output_size) {
      const ratio = ((1 - result.output_size / result.input_size) * 100).toFixed(1)
      return ratio
    }
    return '0'
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
          Video Compression
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Compress your video files to reduce size while maintaining quality
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Upload Video File
            </label>
            <input
              type="file"
              accept="video/*"
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
              Preset
            </label>
            <select
              value={preset}
              onChange={(e) => setPreset(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                backgroundColor: 'white',
              }}
            >
              <option value="ultrafast">Ultrafast (fastest, larger file)</option>
              <option value="fast">Fast</option>
              <option value="medium">Medium (balanced)</option>
              <option value="slow">Slow (best compression)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Codec
            </label>
            <select
              value={codec}
              onChange={(e) => setCodec(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
                backgroundColor: 'white',
              }}
            >
              <option value="h264">H.264 (widely compatible)</option>
              <option value="h265">H.265/HEVC (better compression)</option>
              <option value="vp9">VP9 (open source)</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              CRF (Quality): {crf}
            </label>
            <input
              type="range"
              min="18"
              max="28"
              value={crf}
              onChange={(e) => setCrf(parseInt(e.target.value))}
              style={{
                width: '100%',
              }}
            />
            <p style={{
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
            }}>
              Lower = better quality, larger file | Higher = lower quality, smaller file
            </p>
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
            {loading ? 'Compressing...' : 'Compress Video'}
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
              Compression Complete!
            </h3>
            <div style={{
              marginBottom: '1rem',
              color: '#333',
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Input Size:</strong> {result.input_size != null && !isNaN(result.input_size) ? (result.input_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Output Size:</strong> {result.output_size != null && !isNaN(result.output_size) ? (result.output_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Compression Ratio:</strong> {calculateCompressionRatio()}% reduction
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Codec Used:</strong> {result.codec || codec}
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
              Download Compressed Video
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
