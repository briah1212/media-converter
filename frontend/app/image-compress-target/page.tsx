'use client'

import { useState } from 'react'
import Link from 'next/link'

interface CompressTargetResult {
  file_id: string
  status: string
  original_size_kb: number   // KB not bytes
  target_size_kb: number     // KB not bytes
  actual_size_kb: number     // KB not bytes
  quality_used: number
  iterations: number
  compression_ratio: number
  dimensions: string         // "800x600" format
  format: string
}

export default function ImageCompressTarget() {
  const [file, setFile] = useState<File | null>(null)
  const [targetSizeKb, setTargetSizeKb] = useState<number>(100)
  const [maxQuality, setMaxQuality] = useState<number>(95)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CompressTargetResult | null>(null)
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
    formData.append('target_size_kb', targetSizeKb.toString())
    formData.append('max_quality', maxQuality.toString())

    try {
      const response = await fetch(`${API_URL}/api/v1/compress/image/target-size`, {
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
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
          Target Size Compression
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Compress your image to a specific target file size
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Upload Image
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
                Selected: {file.name} ({formatFileSize(file.size)})
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
              Target Size (KB)
            </label>
            <input
              type="number"
              value={targetSizeKb}
              onChange={(e) => setTargetSizeKb(Number(e.target.value))}
              min="1"
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
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#666',
            }}>
              Desired file size in kilobytes
            </p>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: '500',
              color: '#333',
            }}>
              Max Quality (1-100)
            </label>
            <input
              type="number"
              value={maxQuality}
              onChange={(e) => setMaxQuality(Number(e.target.value))}
              min="1"
              max="100"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                fontSize: '1rem',
                outline: 'none',
              }}
            />
            <p style={{
              marginTop: '0.5rem',
              fontSize: '0.875rem',
              color: '#666',
            }}>
              Maximum quality to start with (default: 95)
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
            {loading ? 'Compressing...' : 'Compress to Target Size'}
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
            
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Input Size:</strong> {(result.original_size_kb / 1024).toFixed(2)} MB
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Output Size:</strong> {(result.actual_size_kb / 1024).toFixed(2)} MB
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Target Size:</strong> {(result.target_size_kb / 1024).toFixed(2)} MB
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Achievement:</strong> {result.actual_size_kb <= result.target_size_kb ? '✓ Target met!' : '✗ Could not reach target'}
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Dimensions:</strong> {result.dimensions}
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Format:</strong> {result.format?.toUpperCase() || 'N/A'}
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Iterations:</strong> {result.iterations}
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Final Quality:</strong> {result.quality_used}%
              </div>
              <div style={{ marginBottom: '0.5rem', color: '#333' }}>
                <strong>Compression Ratio:</strong> {(result.compression_ratio * 100).toFixed(1)}%
              </div>
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
              Download Compressed Image
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
