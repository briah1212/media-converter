'use client'

import { useState } from 'react'
import Link from 'next/link'

interface EstimateResult {
  estimated_output_size_mb: number
  estimated_compression_ratio: number
  estimated_time_seconds: number
  input_size_mb: number
  input_duration_seconds?: number
}

export default function VideoCompressEstimate() {
  const [file, setFile] = useState<File | null>(null)
  const [preset, setPreset] = useState('medium')
  const [crf, setCrf] = useState(23)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<EstimateResult | null>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const formatFileSize = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds.toFixed(0)} seconds`
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${minutes}m ${secs}s`
    } else {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      return `${hours}h ${minutes}m`
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      const validFormats = ['.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm']
      const fileExt = '.' + selectedFile.name.split('.').pop()?.toLowerCase()
      
      if (!validFormats.includes(fileExt)) {
        setError(`Invalid file format. Accepted formats: ${validFormats.join(', ')}`)
        setFile(null)
        return
      }
      
      setFile(selectedFile)
      setError('')
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select a video file')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('preset', preset)
      formData.append('crf', crf.toString())

      const response = await fetch(`${API_URL}/api/v1/compress/estimate`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Estimation failed')
      }

      const data = await response.json()
      setResult(data)
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setError('')
    setPreset('medium')
    setCrf(23)
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
        alignSelf: 'flex-start',
        maxWidth: '600px',
        width: '100%',
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
          Video Compression Estimator
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Get an estimate of compression size and time without processing
        </p>

        {!result ? (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
              }}>
                Select Video File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".mp4,.avi,.mov,.mkv,.wmv,.flv,.webm"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              />
              {file && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  color: '#333',
                }}>
                  <strong>{file.name}</strong> ({formatFileSize(file.size / (1024 * 1024))})
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
              }}>
                Compression Preset
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
                  cursor: 'pointer',
                }}
              >
                <option value="ultrafast">Ultrafast (Fastest, larger file)</option>
                <option value="fast">Fast</option>
                <option value="medium">Medium (Balanced)</option>
                <option value="slow">Slow (Slower, smaller file)</option>
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
                onChange={(e) => setCrf(Number(e.target.value))}
                style={{
                  width: '100%',
                  cursor: 'pointer',
                }}
              />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#666',
                marginTop: '0.25rem',
              }}>
                <span>18 (Best quality, larger)</span>
                <span>28 (Lower quality, smaller)</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: loading || !file ? '#9ca3af' : '#8b5cf6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => {
                if (!loading && file) e.currentTarget.style.backgroundColor = '#7c3aed'
              }}
              onMouseLeave={(e) => {
                if (!loading && file) e.currentTarget.style.backgroundColor = '#8b5cf6'
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{
                    display: 'inline-block',
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem',
                  }} />
                  Estimating...
                </span>
              ) : 'Get Estimate'}
            </button>
          </form>
        ) : (
          <div>
            {/* Estimate Results */}
            <div style={{
              padding: '1.5rem',
              backgroundColor: '#faf5ff',
              border: '2px solid #8b5cf6',
              borderRadius: '8px',
              marginBottom: '1rem',
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: '#8b5cf6',
              }}>
                Compression Estimate
              </h3>
              
              <div style={{
                display: 'grid',
                gap: '0.75rem',
              }}>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    Input Size
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333' }}>
                    {formatFileSize(result.input_size_mb)}
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    Estimated Output Size
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#8b5cf6' }}>
                    {formatFileSize(result.estimated_output_size_mb)}
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    Estimated Compression Ratio
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333' }}>
                    {(result.estimated_compression_ratio * 100).toFixed(1)}% of original
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.25rem' }}>
                    Saves ~{formatFileSize(result.input_size_mb - result.estimated_output_size_mb)}
                  </div>
                </div>

                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.25rem' }}>
                    Estimated Processing Time
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: '600', color: '#333' }}>
                    {formatTime(result.estimated_time_seconds)}
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{
              padding: '1rem',
              backgroundColor: '#fef3c7',
              borderLeft: '4px solid #f59e0b',
              borderRadius: '6px',
              marginBottom: '1.5rem',
            }}>
              <p style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: '1.5' }}>
                <strong>⚠️ Note:</strong> This is an estimate. Actual results may vary based on video content, 
                complexity, and system performance. Use this to plan before actual compression.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <Link
                href="/video-compress"
                style={{
                  display: 'block',
                  padding: '0.875rem',
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  textAlign: 'center',
                  textDecoration: 'none',
                  transition: 'background-color 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#8b5cf6'}
              >
                Proceed to Actual Compression →
              </Link>

              <button
                onClick={handleReset}
                style={{
                  padding: '0.875rem',
                  backgroundColor: '#f3f4f6',
                  color: '#333',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.3s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
              >
                Estimate Another Video
              </button>
            </div>
          </div>
        )}

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

        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}
