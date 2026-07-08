'use client'

import { useState } from 'react'
import Link from 'next/link'
import VideoTrimmer from '@/components/VideoTrimmer'

export default function VideoTrim() {
  const [file, setFile] = useState<File | null>(null)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [outputFormat, setOutputFormat] = useState('mp4')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')
  const [videoLoaded, setVideoLoaded] = useState(false)

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start)
    setTrimEnd(end)
  }

  const formatTimeForAPI = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setLoading(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('start_time', formatTimeForAPI(trimStart))
    formData.append('end_time', formatTimeForAPI(trimEnd))
    formData.append('output_format', outputFormat)

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null
    setFile(selectedFile)
    setVideoLoaded(false)
    setResult(null)
    setError('')
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
        maxWidth: '900px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          marginBottom: '0.5rem',
          color: '#333',
        }}>
          Trim Video with Timeline
        </h1>
        <p style={{
          color: '#666',
          marginBottom: '2rem',
        }}>
          Upload a video, use the interactive timeline to select the trim range, and download the result
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
              onChange={handleFileChange}
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

          {/* Video Trimmer Component */}
          {file && (
            <VideoTrimmer
              videoFile={file}
              onTrimChange={handleTrimChange}
              onVideoLoaded={() => setVideoLoaded(true)}
            />
          )}

          {/* Output Format */}
          {file && (
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
                onChange={(e) => setOutputFormat(e.target.value)}
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
                <option value="mov">MOV (Apple format)</option>
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !file || !videoLoaded}
            style={{
              width: '100%',
              padding: '0.875rem',
              backgroundColor: (loading || !file || !videoLoaded) ? '#9ca3af' : '#667eea',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: (loading || !file || !videoLoaded) ? 'not-allowed' : 'pointer',
              transition: 'background-color 0.3s',
            }}
            onMouseEnter={(e) => {
              if (!loading && file && videoLoaded) e.currentTarget.style.backgroundColor = '#5568d3'
            }}
            onMouseLeave={(e) => {
              if (!loading && file && videoLoaded) e.currentTarget.style.backgroundColor = '#667eea'
            }}
          >
            {loading ? 'Trimming Video...' : !file ? 'Select a Video' : !videoLoaded ? 'Loading Video...' : 'Trim Video'}
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
                <strong>Time Range:</strong> {formatTimeForAPI(trimStart)} to {formatTimeForAPI(trimEnd)}
              </p>
              <p style={{ marginBottom: '0.5rem' }}>
                <strong>Output Format:</strong> {outputFormat.toUpperCase()}
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
