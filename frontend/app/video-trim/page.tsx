'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function VideoTrim() {
  const [file, setFile] = useState<File | null>(null)
  const [startTime, setStartTime] = useState('00:00:00')
  const [endTime, setEndTime] = useState('00:00:10')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const validateTimeFormat = (time: string): boolean => {
    const timeRegex = /^([0-9]{2}):([0-5][0-9]):([0-5][0-9])$/
    return timeRegex.test(time)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    if (!validateTimeFormat(startTime) || !validateTimeFormat(endTime)) {
      setError('Please use HH:MM:SS format (e.g., 00:01:30)')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('start_time', startTime)
    formData.append('end_time', endTime)

    try {
      const response = await fetch(`${API_URL}/api/v1/video/trim`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Trim failed')
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

  const calculateDuration = () => {
    if (!result || !result.duration) return 'N/A'
    const seconds = Math.floor(result.duration)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
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
          Trim Video
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Cut your video to a specific time range
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
              Start Time (HH:MM:SS)
            </label>
            <input
              type="text"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              placeholder="00:00:00"
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
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
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
              End Time (HH:MM:SS)
            </label>
            <input
              type="text"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              placeholder="00:00:10"
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
              fontSize: '0.75rem',
              color: '#999',
              marginTop: '0.25rem',
            }}>
              Format: HH:MM:SS (e.g., 00:02:00 for 2 minutes)
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
            {loading ? 'Trimming...' : 'Trim Video'}
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
              Trim Complete!
            </h3>
            <div style={{
              marginBottom: '1rem',
              color: '#333',
            }}>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Trimmed Duration:</strong> {calculateDuration()}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>File Size:</strong> {result.file_size ? (result.file_size / 1024 / 1024).toFixed(2) : 'N/A'} MB
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Time Range:</strong> {startTime} to {endTime}
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
              Download Trimmed Video
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
