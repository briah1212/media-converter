'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VideoConvert() {
  const [file, setFile] = useState<File | null>(null)
  const [outputFormat, setOutputFormat] = useState('mp4')
  const [codec, setCodec] = useState('h264')
  const [quality, setQuality] = useState('medium')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const codecOptions: Record<string, string[]> = {
    mp4: ['h264', 'h265'],
    webm: ['vp8', 'vp9'],
    avi: ['h264', 'mpeg4'],
    mov: ['h264', 'h265'],
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('output_format', outputFormat)
    formData.append('codec', codec)
    formData.append('quality', quality)

    try {
      const response = await fetch(`${API_URL}/api/v1/video/convert-format`, {
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

  const handleFormatChange = (format: string) => {
    setOutputFormat(format)
    // Set default codec for the format
    const codecs = codecOptions[format] || ['h264']
    setCodec(codecs[0])
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
          Convert Video Format
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Convert your video to a different format
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
              Output Format
            </label>
            <select
              value={outputFormat}
              onChange={(e) => handleFormatChange(e.target.value)}
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
              <option value="mp4">MP4 (most compatible)</option>
              <option value="webm">WebM (web optimized)</option>
              <option value="avi">AVI (legacy format)</option>
              <option value="mov">MOV (Apple format)</option>
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
              {(codecOptions[outputFormat] || ['h264']).map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
            <p style={{
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
            }}>
              Available codecs depend on the output format
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Quality
            </label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value)}
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
              <option value="low">Low (smaller file)</option>
              <option value="medium">Medium (balanced)</option>
              <option value="high">High (better quality)</option>
              <option value="ultra">Ultra (best quality)</option>
            </select>
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
            {loading ? 'Converting...' : 'Convert Video'}
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
              Conversion Complete!
            </h3>
            <div style={{
              marginBottom: '1rem',
              color: '#333',
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Input Format:</strong> {result.input_format || 'N/A'}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Output Format:</strong> {result.output_format || outputFormat?.toUpperCase() || "N/A"}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Input Size:</strong> {result.input_size ? (result.input_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Output Size:</strong> {result.output_size ? (result.output_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
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
              Download Converted Video
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
