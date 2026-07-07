'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AudioTrim() {
  const [file, setFile] = useState<File | null>(null)
  const [startTime, setStartTime] = useState('00:00:00')
  const [endTime, setEndTime] = useState('00:00:00')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/
    return timeRegex.test(time)
  }

  const timeToSeconds = (time: string): number => {
    const [hours, minutes, seconds] = time.split(':').map(Number)
    return hours * 3600 + minutes * 60 + seconds
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError('')
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('Please select an audio file')
      return
    }

    if (!validateTimeFormat(startTime)) {
      setError('Invalid start time format. Use HH:MM:SS (e.g., 00:01:30)')
      return
    }

    if (!validateTimeFormat(endTime)) {
      setError('Invalid end time format. Use HH:MM:SS (e.g., 00:03:45)')
      return
    }

    const startSeconds = timeToSeconds(startTime)
    const endSeconds = timeToSeconds(endTime)

    if (endSeconds <= startSeconds) {
      setError('End time must be greater than start time')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('start_time', startTime)
      formData.append('end_time', endTime)

      const response = await fetch(`${API_URL}/api/v1/audio/trim`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Trimming failed')
      }

      const data = await response.json()
      setResult(data)
      setFile(null)
      setStartTime('00:00:00')
      setEndTime('00:00:00')
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
    setStartTime('00:00:00')
    setEndTime('00:00:00')
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
          Trim Audio File
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Cut your audio file by specifying start and end times
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
                Select Audio File
              </label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".mp3,.aac,.m4a,.wav,.ogg,.flac"
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
                  <strong>{file.name}</strong> ({formatFileSize(file.size)})
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
                Start Time
              </label>
              <input
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="00:00:00"
                pattern="[0-9]{2}:[0-5][0-9]:[0-5][0-9]"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  fontFamily: 'monospace',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#666',
              }}>
                Format: HH:MM:SS (e.g., 00:01:30 for 1 minute 30 seconds)
              </p>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                color: '#333',
              }}>
                End Time
              </label>
              <input
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                placeholder="00:00:00"
                pattern="[0-9]{2}:[0-5][0-9]:[0-5][0-9]"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'border-color 0.3s',
                  fontFamily: 'monospace',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
              />
              <p style={{
                marginTop: '0.5rem',
                fontSize: '0.75rem',
                color: '#666',
              }}>
                Format: HH:MM:SS (e.g., 00:03:45 for 3 minutes 45 seconds)
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || !file}
              style={{
                width: '100%',
                padding: '0.875rem',
                backgroundColor: loading || !file ? '#9ca3af' : '#667eea',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading || !file ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.3s',
              }}
              onMouseEnter={(e) => {
                if (!loading && file) e.currentTarget.style.backgroundColor = '#5568d3'
              }}
              onMouseLeave={(e) => {
                if (!loading && file) e.currentTarget.style.backgroundColor = '#667eea'
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
                  Trimming...
                </span>
              ) : 'Trim Audio'}
            </button>
          </form>
        ) : (
          <div style={{
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
              Success!
            </h3>
            <p style={{ color: '#333', marginBottom: '1rem' }}>
              {result.message || 'Audio trimmed successfully!'}
            </p>
            {result.metadata && Object.keys(result.metadata).length > 0 && (
              <div style={{
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: 'white',
                borderRadius: '6px',
                fontSize: '0.875rem',
              }}>
                {Object.entries(result.metadata).map(([key, value]) => (
                  <div key={key} style={{ marginBottom: '0.25rem' }}>
                    <strong>{key}:</strong> {String(value)}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => {
                  if (result.file_id) {
                    window.open(`${API_URL}/api/v1/download/${result.file_id}`, '_blank')
                  }
                }}
                style={{
                  flex: 1,
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
                Download File
              </button>
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  padding: '0.625rem 1.5rem',
                  backgroundColor: '#667eea',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#5568d3'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#667eea'}
              >
                Trim Another
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
